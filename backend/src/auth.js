// backend/src/auth.js - Cryptographic JWT & Secure Auth Engine
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { findUserById, findUserByIdentifier, createUser, updateUser, getUserProfile, saveUserProfile } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and unset.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Base64Url Encoding Helpers
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Sign a standard cryptographic JWT with HMAC-SHA256
 */
export function signJwt(payload, expiresIn = TOKEN_EXPIRY_SECONDS) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
    iss: 'AgentPay-Auth-Authority'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or invalid' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed JWT structure' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const bufA = Buffer.from(signature);
  const bufB = Buffer.from(expectedSignature);

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return { valid: false, error: 'Invalid token cryptographic signature' };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'JWT token has expired' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Failed to decode JWT payload' };
  }
}

/**
 * Extract bearer token from HTTP request headers
 */
export function extractBearerToken(req) {
  if (!req || !req.headers) return null;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

/**
 * Middleware helper: Authenticates request and loads the full logged-in user profile
 */
export async function authenticateRequest(req) {
  const token = extractBearerToken(req);
  if (!token) {
    return { authenticated: false, user: null, error: 'No Authorization token provided' };
  }

  const verification = verifyJwt(token);
  if (!verification.valid) {
    return { authenticated: false, user: null, error: verification.error };
  }

  const userId = verification.payload.sub || verification.payload.id || verification.payload.email;
  let user = await findUserById(userId);

  if (!user && verification.payload.email) {
    user = await findUserByIdentifier(verification.payload.email);
  }

  if (!user) {
    // If not found in DB but valid JWT, construct user from JWT payload
    user = {
      id: userId,
      name: verification.payload.name || 'Autonomous Shopper',
      email: verification.payload.email || '',
      phone: verification.payload.phone || '',
      upi_vpa: verification.payload.upi_vpa || 'shopper@oksbi',
      default_max_budget: verification.payload.default_max_budget || 1500,
      auto_negotiate_coupons: verification.payload.auto_negotiate_coupons !== false,
      allowed_categories: verification.payload.allowed_categories || [
        "electronics", "computers", "accessories", "mobiles", "cables", "wearables", "storage", "gaming", "smarthome"
      ]
    };
  }

  return { authenticated: true, user, payload: verification.payload };
}

// In-Memory OTP Store
const activeOtps = new Map();

export function generateOtp(identifier) {
  const cleanId = (identifier || '').trim().toLowerCase();
  const isSandbox = process.env.ENABLE_OTP_SANDBOX === 'true' || process.env.NODE_ENV === 'test';
  // Generate 4-digit code ('1234' in sandbox/test mode, cryptographically secure random otherwise)
  const code = isSandbox ? '1234' : crypto.randomInt(1000, 10000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  activeOtps.set(cleanId, { code, expiresAt });
  return code;
}

export function verifyOtp(identifier, code) {
  if (!code || typeof code !== 'string') return false;
  const cleanId = (identifier || '').trim().toLowerCase();
  const stored = activeOtps.get(cleanId);
  const isSandbox = process.env.ENABLE_OTP_SANDBOX === 'true' || process.env.NODE_ENV === 'test';

  // Accept fixed code '1234' ONLY when an explicit sandbox/test environment flag is enabled
  if (isSandbox && code.trim() === '1234') {
    return true;
  }

  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    activeOtps.delete(cleanId);
    return false;
  }

  if (stored.code === code.trim()) {
    activeOtps.delete(cleanId);
    return true;
  }

  return false;
}
