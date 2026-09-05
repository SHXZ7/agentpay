// backend/src/mandates.js - AP2 Mandate Engine
import 'dotenv/config';
import crypto from 'crypto';
import { saveMandate, getMandate, updateMandate, addAuditLog } from './db.js';

const getSecret = () => {
  return process.env.MANDATE_SIGNING_SECRET || 'rzp_ap2_mandate_signing_secret_key_2025';
};

export function signMandatePayload(payload) {
  const merchant = payload.merchant_id || "";
  const categories = Array.isArray(payload.allowed_categories) 
    ? payload.allowed_categories.slice().sort().join(',') 
    : "";
  const data = `${payload.mandate_id}|${payload.max_budget}|${categories}|${payload.valid_until}|${merchant}`;
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

export function verifyMandateSignature(mandate) {
  if (!mandate || !mandate.signature) return false;
  try {
    const expected = signMandatePayload(mandate);
    const bufA = Buffer.from(mandate.signature);
    const bufB = Buffer.from(expected);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const DEFAULT_ALLOWED_CATEGORIES = [
  "electronics", "computers", "accessories", "mobiles", "cables", 
  "wearables", "storage", "gaming", "smarthome"
];

export async function createMandate({
  max_budget,
  allowed_categories = DEFAULT_ALLOWED_CATEGORIES,
  validity_minutes = 15,
  user_intent = "Autonomous agent shopping",
  agent_id = "agent_groq_shopping_v1",
  merchant_id = "rzp_merchant_acp_demo"
}) {
  const mandate_id = `ap2_mandate_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const valid_until = new Date(Date.now() + validity_minutes * 60 * 1000).toISOString();
  
  const payload = {
    mandate_id,
    version: "AP2/1.0",
    max_budget: Number(max_budget),
    spent_amount: 0,
    remaining_budget: Number(max_budget),
    allowed_categories: Array.isArray(allowed_categories) && allowed_categories.length > 0 ? allowed_categories : DEFAULT_ALLOWED_CATEGORIES,
    valid_from: new Date().toISOString(),
    valid_until,
    user_intent,
    agent_id,
    merchant_id,
    currency: "INR",
    status: "ACTIVE"
  };

  payload.signature = signMandatePayload(payload);
  await saveMandate(payload);

  await addAuditLog({
    actor: "MANDATE_ENGINE",
    action: "MANDATE_ISSUED",
    status: "SUCCESS",
    mandate_id: payload.mandate_id,
    details: `Issued AP2 mandate with budget ₹${payload.max_budget} for categories [${payload.allowed_categories.join(', ')}]`,
    payload: {
      mandate_id: payload.mandate_id,
      max_budget: payload.max_budget,
      allowed_categories: payload.allowed_categories,
      valid_until: payload.valid_until,
      merchant_id: payload.merchant_id,
      signature_preview: `${payload.signature.substring(0, 16)}...`
    }
  });

  return payload;
}

export async function validateMandateForPurchase({ mandate_id, item_price, item_category, item_name }) {
  const mandate = await getMandate(mandate_id);
  
  if (!mandate) {
    return {
      isValid: false,
      errorCode: "MANDATE_NOT_FOUND",
      reason: `Mandate ID '${mandate_id}' was not found in active registry.`,
      status: 404
    };
  }

  // 1. Verify Cryptographic Signature immediately
  if (!verifyMandateSignature(mandate)) {
    return {
      isValid: false,
      errorCode: "INVALID_SIGNATURE",
      reason: `Mandate cryptographic HMAC-SHA256 signature verification failed for '${mandate_id}'.`,
      status: 403,
      mandate
    };
  }

  // 2. Check Status
  if (mandate.status !== "ACTIVE") {
    return {
      isValid: false,
      errorCode: "MANDATE_INACTIVE",
      reason: `Mandate is already marked as ${mandate.status}.`,
      status: 403,
      mandate
    };
  }

  // 3. Check Expiry
  const now = new Date();
  const expiresAt = new Date(mandate.valid_until);
  if (now > expiresAt) {
    await updateMandate(mandate_id, { status: "EXPIRED" });
    return {
      isValid: false,
      errorCode: "MANDATE_EXPIRED",
      reason: `Mandate expired at ${mandate.valid_until} (Current time: ${now.toISOString()}).`,
      status: 403,
      mandate
    };
  }

  // 4. Check Category Authorization (Exact case-insensitive match only)
  const isCategoryAllowed = Array.isArray(mandate.allowed_categories) && mandate.allowed_categories.some(cat => {
    return typeof cat === 'string' && cat.trim().toLowerCase() === (item_category || '').trim().toLowerCase();
  });

  if (!isCategoryAllowed) {
    return {
      isValid: false,
      errorCode: "CATEGORY_DISALLOWED",
      reason: `Category '${item_category}' for '${item_name}' is not in approved mandate categories [${mandate.allowed_categories.join(', ')}].`,
      status: 403,
      mandate,
      violatingCategory: item_category
    };
  }

  // 5. Check Monthly Vault Cumulative Utilization Constraint
  try {
    const { getAutopayStatus } = await import('./autopay.js');
    const autopay = await getAutopayStatus();
    if (autopay && autopay.is_active) {
      if (item_price > autopay.remaining_limit) {
        return {
          isValid: false,
          errorCode: "VAULT_LIMIT_EXCEEDED",
          reason: `Monthly Vault spending limit exhausted. You have ₹${autopay.remaining_limit.toLocaleString()} available out of your ₹${autopay.max_limit.toLocaleString()} monthly authorization cap (Cumulative spend: ₹${autopay.spent_amount.toLocaleString()}). Please increase your Monthly Mandate Limit in the Personalization tab.`,
          status: 422,
          mandate,
          diff: item_price - autopay.remaining_limit
        };
      }
    }
  } catch (err) {
    console.warn("Autopay check notice in mandate validator:", err.message);
  }

  // 6. Check Single-Item and Remaining Cumulative Mandate Budget Limits
  const maxBudget = Number(mandate.max_budget) || 0;
  const remainingBudget = mandate.remaining_budget !== undefined ? Number(mandate.remaining_budget) : maxBudget;

  if (item_price > maxBudget) {
    return {
      isValid: false,
      errorCode: "BUDGET_EXCEEDED",
      reason: `Item price ₹${item_price.toLocaleString()} exceeds authorized single-item Budget Limit of ₹${maxBudget.toLocaleString()} (Exceeds by ₹${(item_price - maxBudget).toLocaleString()}).`,
      status: 422,
      mandate,
      diff: item_price - maxBudget
    };
  }

  if (item_price > remainingBudget) {
    return {
      isValid: false,
      errorCode: "REMAINING_BUDGET_EXCEEDED",
      reason: `Item price ₹${item_price.toLocaleString()} exceeds remaining mandate budget of ₹${remainingBudget.toLocaleString()} (Exceeds by ₹${(item_price - remainingBudget).toLocaleString()}).`,
      status: 422,
      mandate,
      diff: item_price - remainingBudget
    };
  }

  return {
    isValid: true,
    mandate
  };
}
