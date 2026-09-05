// backend/src/server.js - Ultra-Resilient Multi-Merchant Agent Server with Cryptographic Webhooks
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import http from 'http';
import url from 'url';
import { getProducts, getProductById, getAuditLogs, resetDatabase, addAuditLog, SEED_PRODUCTS, getAllOrders, saveOrder, getLatestActiveMandate, getUserProfile, saveUserProfile, updateMandate, getChatSessions, saveChatSession, deleteChatSession, getWatchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem, getCampaigns, addCampaign, toggleCampaign, recordCampaignConversion, findUserById, findUserByIdentifier, createUser, updateUser } from './db.js';
import { signJwt, verifyJwt, authenticateRequest, generateOtp, verifyOtp } from './auth.js';
import { createMandate, validateMandateForPurchase, verifyMandateSignature, signMandatePayload, DEFAULT_ALLOWED_CATEGORIES } from './mandates.js';
import { createRazorpayOrder, isRealRazorpayConfigured } from './razorpay.js';
import { runShoppingAgent, generateUpsellRecommendation } from './agent.js';
import { getAllMerchants, getMerchantById, searchAcrossAllMerchants } from './merchants.js';
import { filterAndPaginateCatalog } from './catalogGenerator.js';
import { getAutopayStatus, authorizeUPIAutopay, revokeUPIAutopay } from './autopay.js';
import { processWhatsAppMessage } from './channels/whatsapp.js';
import { handleTelegramMessage, startTelegramPolling } from './channels/telegram.js';
import { processRazorpayWebhook, simulateRazorpayWebhook } from './webhooks.js';
import { negotiateBestPrice, validateCoupon, ACTIVE_MERCHANT_COUPONS } from './negotiation.js';
import { startWatchlistPoller, checkWatchlistEntry } from './watchlist.js';

const PORT = process.env.PORT || 5000;

function parseBodyWithRaw(req) {
  return new Promise((resolve) => {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk.toString(); });
    req.on('end', () => {
      let parsed = {};
      try {
        parsed = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        parsed = {};
      }
      resolve({ rawBody, parsed });
    });
  });
}

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
];

function getCorsHeaders(req) {
  const origin = req?.headers?.origin;
  const isAllowed = origin && (ALLOWED_ORIGINS.includes(origin) || process.env.CORS_ALLOW_ALL_ORIGINS === 'true');
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Razorpay-Signature',
    'Access-Control-Allow-Credentials': 'true'
  };
}

function sendJson(res, statusCode, data, req = null) {
  const corsHeaders = getCorsHeaders(req);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...corsHeaders
  });
  res.end(JSON.stringify(data));
}

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';
  const query = parsedUrl.query;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    return res.end();
  }

  try {
    // 1. Health & Discovery
    if (method === 'GET' && (pathname === '/health' || pathname === '')) {
      const autopay = await getAutopayStatus();
      return sendJson(res, 200, {
        status: "HEALTHY",
        service: "Agent-Ready Multi-Merchant Backend with Cryptographic Webhooks",
        protocol: "NPCI-UAP/1.0, AP2/1.0, ACP/1.0 & x402",
        auth_mode: "JWT_HMAC_SHA256",
        active_merchants: getAllMerchants().length,
        autopay_active: autopay.is_active,
        telegram_active: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        razorpay_mode: isRealRazorpayConfigured() ? "LIVE_TEST_API" : "TEST_SIMULATOR_READY",
        groq_configured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')),
        discovery_manifest: "/.well-known/agent-commerce.json",
        uap_catalog: "/api/catalog/uap",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }, req);
    }

    // ─── AUTHENTICATION ENDPOINTS (JWT & OTP) ───────────────────────────────────

    // 0a. Auth: POST /api/auth/send-otp
    if (method === 'POST' && pathname === '/api/auth/send-otp') {
      const { parsed } = await parseBodyWithRaw(req);
      const { identifier } = parsed;
      if (!identifier) return sendJson(res, 400, { success: false, error: 'Identifier is required.' }, req);
      const code = generateOtp(identifier);
      return sendJson(res, 200, { success: true, message: `OTP sent to ${identifier}`, sandbox_otp: code }, req);
    }

    // 0b. Auth: POST /api/auth/login or /api/auth/verify-otp
    if (method === 'POST' && (pathname === '/api/auth/login' || pathname === '/api/auth/verify-otp')) {
      const { parsed } = await parseBodyWithRaw(req);
      const { identifier, otp, name, upi_vpa, mode = 'login' } = parsed;

      if (!identifier) {
        return sendJson(res, 400, { success: false, error: 'Email or phone number is required.' }, req);
      }

      if (!otp || !otp.trim() || !verifyOtp(identifier, otp)) {
        return sendJson(res, 401, { success: false, error: 'Invalid or expired OTP code. (Use 1234 for sandbox verification)' }, req);
      }

      let user = await findUserByIdentifier(identifier);

      if (!user) {
        const cleanEmail = identifier.includes('@') ? identifier.trim().toLowerCase() : `${identifier.replace(/\D/g, '')}@agentic.commerce`;
        const cleanPhone = !identifier.includes('@') ? identifier.trim() : '';
        const derivedName = name?.trim() || (cleanEmail ? cleanEmail.split('@')[0].replace(/[._]/g, ' ') : 'Shopper');
        
        user = await createUser({
          name: derivedName,
          email: cleanEmail,
          phone: cleanPhone,
          upi_vpa: upi_vpa || `${cleanEmail.split('@')[0]}@oksbi`,
          default_max_budget: 2000
        });
      } else if (name || upi_vpa) {
        const updates = {};
        if (name && name.trim()) updates.name = name.trim();
        if (upi_vpa && upi_vpa.trim()) updates.upi_vpa = upi_vpa.trim();
        if (Object.keys(updates).length > 0) {
          user = await updateUser(user.id, updates);
        }
      }

      const token = signJwt({
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        upi_vpa: user.upi_vpa,
        default_max_budget: user.default_max_budget,
        allowed_categories: user.allowed_categories
      });

      await addAuditLog({
        actor: "AUTH_GATEWAY",
        action: "USER_AUTHENTICATED_JWT",
        status: "SUCCESS",
        details: `User '${user.name}' (${user.email || user.phone}) authenticated via cryptographic JWT session.`,
        payload: { user_id: user.id, email: user.email, upi_vpa: user.upi_vpa }
      });

      return sendJson(res, 200, {
        success: true,
        token,
        user,
        message: `Welcome, ${user.name}!`
      }, req);
    }

    // 0c. Auth: POST /api/auth/register
    if (method === 'POST' && pathname === '/api/auth/register') {
      const { parsed } = await parseBodyWithRaw(req);
      const { name, email, phone, upi_vpa, default_max_budget } = parsed;
      const identifier = email || phone;
      if (!identifier) return sendJson(res, 400, { success: false, error: 'Email or phone is required.' }, req);

      const existing = await findUserByIdentifier(identifier);
      if (existing) {
        return sendJson(res, 409, { success: false, error: 'Account already exists. Please log in.' }, req);
      }

      const user = await createUser({
        name: name || 'Autonomous Shopper',
        email: email?.trim().toLowerCase() || '',
        phone: phone || '',
        upi_vpa: upi_vpa || 'shopper@oksbi',
        default_max_budget: Number(default_max_budget) || 2000
      });

      const token = signJwt({
        sub: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        upi_vpa: user.upi_vpa
      });

      return sendJson(res, 201, { success: true, token, user, message: 'Account registered successfully.' }, req);
    }

    // 0d. Auth: GET /api/auth/me (Current Authenticated User Profile)
    if (method === 'GET' && pathname === '/api/auth/me') {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        const fallback = await getUserProfile();
        return sendJson(res, 200, { success: true, authenticated: false, user: fallback }, req);
      }
      return sendJson(res, 200, { success: true, authenticated: true, user: auth.user }, req);
    }

    // 0e. Auth: POST /api/auth/logout
    if (method === 'POST' && pathname === '/api/auth/logout') {
      return sendJson(res, 200, { success: true, message: 'Logged out successfully' }, req);
    }

    // 1b. Discovery Protocol Manifests (NPCI UAP / AP2 / ACP / x402)
    if (method === 'GET' && (pathname === '/.well-known/agent-commerce.json' || pathname === '/.well-known/acp.json')) {
      const merchants = getAllMerchants();
      const campaigns = await getCampaigns();
      const autopay = await getAutopayStatus();
      
      return sendJson(res, 200, {
        schema_version: "2025.1-ACP/AP2",
        standard: "NPCI UAP & Agent Commerce Protocol (ACP)",
        spec_url: "https://npci.org.in/what-we-do/upi/autopay",
        service_title: "Autonomous Agent Storefront Network",
        protocols_supported: ["UAP/1.0", "AP2/1.0", "ACP/1.0", "x402/HTTP"],
        gateway: {
          provider: "Razorpay (Test Mode)",
          mode: isRealRazorpayConfigured() ? "LIVE_TEST_ACCOUNT" : "SIMULATED_TEST_MODE",
          fiduciary_escrow: "HMAC-SHA256 Cryptographic Bounded Mandates",
          headless_autopay_enabled: autopay.is_active
        },
        endpoints: {
          discovery: "/.well-known/agent-commerce.json",
          catalog_uap: "/api/catalog/uap",
          negotiate_acp: "/network/negotiate",
          checkout_x402: "/acp/v1/checkout",
          standard_checkout: "/checkout",
          agent_orchestrator: "/agent/shop",
          webhooks: "/webhooks/razorpay",
          campaigns: "/merchant/campaigns"
        },
        merchants: merchants.map(m => ({
          id: m.id,
          name: m.name,
          platform: m.badge || "E-Commerce",
          storefront_url: `/merchants/${m.id}`,
          rating: m.rating,
          total_products: m.total_inventory || 1050,
          supported_mcc: ["5732", "5045", "5311"]
        })),
        active_campaigns_count: campaigns.filter(c => c.is_active).length,
        timestamp: new Date().toISOString()
      }, req);
    }

    // 1c. UAP JSON-LD Schema.org Catalog
    if (method === 'GET' && pathname === '/api/catalog/uap') {
      const merchants = getAllMerchants();
      const limit = query.limit ? Number(query.limit) : 40;
      const allProducts = [];
      
      for (const m of merchants) {
        const merchant = getMerchantById(m.id);
        const paginated = filterAndPaginateCatalog(merchant.products, { query: query.search || query.query || '', category: query.category || '', limit: Math.floor(limit / merchants.length) });
        allProducts.push(...paginated.products.map(p => ({
          "@context": "https://schema.org",
          "@type": "Product",
          "identifier": p.id,
          "name": p.name,
          "description": p.description,
          "image": p.image,
          "category": p.category,
          "brand": { "@type": "Brand", "name": p.specs?.brand || m.name },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": p.rating,
            "reviewCount": p.reviews_count || 120
          },
          "offers": {
            "@type": "Offer",
            "price": p.price,
            "priceCurrency": "INR",
            "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": m.name, "identifier": m.id },
            "eligiblePaymentMethod": "UPI_AUTOPAY_AP2",
            "action": {
              "@type": "BuyAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `http://localhost:${PORT}/acp/v1/checkout`,
                "httpMethod": "POST",
                "encodingType": "application/json"
              }
            }
          }
        })));
      }

      return sendJson(res, 200, {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "NPCI UAP Multi-Merchant Agent Catalog",
        "numberOfItems": allProducts.length,
        "itemListElement": allProducts
      }, req);
    }

    // 1d. Machine-to-Machine x402 Payment Handshake (POST /acp/v1/checkout)
    if (method === 'POST' && pathname === '/acp/v1/checkout') {
      const { rawBody, parsed } = await parseBodyWithRaw(req);
      const authHeader = req.headers['authorization'] || '';
      const { product_id, product_name, merchant_id = 'aura-tech', quantity = 1, amount, mandate_id: bodyMandateId, signature: bodySig } = parsed;

      // Extract mandate signature from header or body
      let mandate_id = bodyMandateId;
      let signature = bodySig;
      if (authHeader.startsWith('AP2-Token ')) {
        const parts = authHeader.replace('AP2-Token ', '').split(':');
        mandate_id = parts[0];
        signature = parts[1];
      }

      // Step 1: If no signature or mandate presented -> Return HTTP 402 Payment Required with x402 Challenge
      if (!mandate_id || !signature) {
        const targetProduct = product_id ? await getProductById(product_id) : (product_name ? (await getProducts()).find(p => p.name.toLowerCase().includes(product_name.toLowerCase())) : null);
        const requiredAmount = amount || (targetProduct ? targetProduct.price : 799);
        const challengeNonce = `x402_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const corsHeaders = getCorsHeaders(req);
        res.writeHead(402, {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `AP2-Token realm="Razorpay-Agent-Commerce-Gateway", challenge="${challengeNonce}"`,
          'X-Payment-Protocol': 'AP2/1.0, UAP/1.0, x402',
          'X-Payment-Required-Amount': `${requiredAmount}`,
          'X-Payment-Currency': 'INR',
          ...corsHeaders
        });

        await addAuditLog({
          actor: "X402_GATEWAY",
          action: "HTTP_402_CHALLENGE_ISSUED",
          status: "CHALLENGE_ISSUED",
          details: `Issued HTTP 402 Payment Required for ₹${requiredAmount} on merchant '${merchant_id}'. Awaiting signed AP2 token challenge response.`,
          payload: { challengeNonce, requiredAmount, product_id, merchant_id }
        });

        return res.end(JSON.stringify({
          error: "PAYMENT_REQUIRED",
          status: 402,
          protocol: "x402 / AP2",
          message: "Payment Required: Cryptographic AP2 Mandate Token or valid Authorization signature required to execute 0-OTP settlement.",
          challenge: {
            nonce: challengeNonce,
            required_amount: requiredAmount,
            currency: "INR",
            merchant_id,
            target_product: targetProduct?.name || "Product",
            supported_methods: ["UPI_AUTOPAY_MANDATE", "RAZORPAY_TEST_ORDER"],
            instructions: "Attach 'Authorization: AP2-Token <mandate_id>:<signature>' or include mandate_id and signature in JSON payload."
          }
        }));
      }

      // Step 2: Validate AP2 token and mandate
      const targetProduct = product_id ? await getProductById(product_id) : null;
      const checkoutPrice = amount || (targetProduct ? targetProduct.price * quantity : 799);
      const category = targetProduct?.category || "electronics";

      const validation = await validateMandateForPurchase({
        mandate_id,
        item_price: checkoutPrice,
        item_category: category,
        item_name: targetProduct?.name || product_name || "Item"
      });

      if (!validation.isValid) {
        return sendJson(res, validation.status || 403, {
          success: false,
          error: validation.errorCode || "MANDATE_REJECTED",
          reason: validation.reason,
          mandate_id
        }, req);
      }

      // Step 3: Create Razorpay Test Order and execute 0-OTP headless settlement
      const rzpOrder = await createRazorpayOrder({
        amount: checkoutPrice,
        receipt: `rcpt_x402_${Date.now()}`
      });

      const orderData = {
        order_id: rzpOrder.order_id,
        product: targetProduct || { id: product_id || 'prod_custom', name: product_name || 'Autonomous Item', price: checkoutPrice },
        quantity,
        merchant_id,
        mandate_id,
        amount: checkoutPrice,
        currency: "INR",
        receipt: rzpOrder.receipt,
        payment_protocol: "x402 / AP2-UAP",
        payment_status: "SUCCESS_TEST_MODE",
        settlement_status: "OFFICIALLY_SETTLED",
        is_live_test_api: rzpOrder.is_live_test_api,
        created_at: new Date().toISOString()
      };

      await saveOrder(orderData);

      await addAuditLog({
        actor: "X402_GATEWAY",
        action: "X402_SETTLEMENT_RESOLVED",
        status: "SUCCESS",
        mandate_id,
        details: `Resolved x402 challenge with AP2 token '${mandate_id}'. Charged ₹${checkoutPrice} via Razorpay Order ${rzpOrder.order_id}`,
        payload: orderData
      });

      return sendJson(res, 200, {
        success: true,
        protocol: "x402 / AP2 / UAP",
        status: "OFFICIALLY_SETTLED",
        message: "Payment successfully settled via AP2 headless mandate on Razorpay test mode.",
        order: orderData,
        challenge_resolved: true
      }, req);
    }

    // 2. Real Razorpay Webhook Endpoint: POST /webhooks/razorpay
    if (method === 'POST' && pathname === '/webhooks/razorpay') {
      const { rawBody, parsed } = await parseBodyWithRaw(req);
      const signature = req.headers['x-razorpay-signature'];
      const result = await processRazorpayWebhook(rawBody, signature, parsed);
      return sendJson(res, result.status || 200, result);
    }

    // 3. Webhook Simulator Endpoint: POST /webhooks/razorpay/simulate
    if (method === 'POST' && pathname === '/webhooks/razorpay/simulate') {
      const { parsed } = await parseBodyWithRaw(req);
      const result = await simulateRazorpayWebhook({
        order_id: parsed.order_id,
        event_type: parsed.event_type || "payment.captured"
      });
      return sendJson(res, 200, result);
    }

    // 4. WhatsApp Chat / Webhook: POST /api/whatsapp/chat, /channels/whatsapp/chat, /channels/whatsapp/webhook
    if (method === 'POST' && (pathname === '/api/whatsapp/chat' || pathname === '/channels/whatsapp/chat' || pathname === '/channels/whatsapp/webhook')) {
      const { parsed } = await parseBodyWithRaw(req);
      const text = parsed.text || parsed.Body || parsed.message || "";
      const from = parsed.from || parsed.From || "+919876543210";
      const result = await processWhatsAppMessage({
        from,
        text,
        user_name: parsed.user_name || parsed.ProfileName || "Shopper"
      });
      return sendJson(res, 200, { success: true, ...result }, req);
    }

    // 5. Telegram Webhook / Chat: POST /webhooks/telegram, /channels/telegram/chat, /api/telegram/chat
    if (method === 'POST' && (pathname === '/webhooks/telegram' || pathname === '/channels/telegram/chat' || pathname === '/api/telegram/chat')) {
      const { parsed } = await parseBodyWithRaw(req);
      if (parsed.message) {
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
        const receivedSecret = req.headers['x-telegram-bot-api-secret-token'];
        if (expectedSecret && receivedSecret !== expectedSecret) {
          return sendJson(res, 401, { ok: false, error: 'Invalid or missing Telegram secret token' }, req);
        }
        await handleTelegramMessage(parsed.message);
        return sendJson(res, 200, { ok: true }, req);
      }
      if (parsed.text) {
        const auth = await authenticateRequest(req);
        if (!auth.authenticated) {
          return sendJson(res, 401, { success: false, error: 'Authentication required for simulator' }, req);
        }
        if (!parsed.chat_id) {
          return sendJson(res, 400, { success: false, error: 'chat_id is required' }, req);
        }
        const fakeMsg = {
          chat: { id: parsed.chat_id },
          text: parsed.text,
          from: { first_name: parsed.user_name || auth.user?.name || "Shopper" }
        };
        const resObj = await handleTelegramMessage(fakeMsg);
        return sendJson(res, 200, { success: true, result: resObj }, req);
      }
      return sendJson(res, 200, { ok: true }, req);
    }

    // 5b. Multi-Channel Status: GET /channels/status
    if (method === 'GET' && pathname === '/channels/status') {
      return sendJson(res, 200, {
        success: true,
        channels: {
          whatsapp: {
            enabled: true,
            number: "+91 98765 43210",
            status: "ONLINE",
            features: ["0-OTP Purchase", "Budget Balance", "Order Tracking", "ACP Negotiation"]
          },
          telegram: {
            enabled: true,
            bot_handle: "@AgentPayyBot",
            status: process.env.TELEGRAM_BOT_TOKEN ? "LIVE_CONNECTED" : "ONLINE_SIMULATOR",
            features: ["0-OTP Purchase", "HTML Digital Receipt", "Budget Inspection"]
          }
        }
      }, req);
    }

    // 6. UPI Autopay Status: GET /autopay/status
    if (method === 'GET' && pathname === '/autopay/status') {
      const autopay = await getAutopayStatus();
      return sendJson(res, 200, { success: true, autopay });
    }

    // 7. Authorize UPI Autopay: POST /autopay/authorize
    if (method === 'POST' && pathname === '/autopay/authorize') {
      const { parsed } = await parseBodyWithRaw(req);
      const autopay = await authorizeUPIAutopay(parsed);
      return sendJson(res, 200, { success: true, autopay });
    }

    // 8. Revoke UPI Autopay: POST /autopay/revoke
    if (method === 'POST' && pathname === '/autopay/revoke') {
      const result = await revokeUPIAutopay();
      return sendJson(res, 200, result);
    }

    // 8. Dynamic Price Negotiation: POST /network/negotiate
    if (method === 'POST' && pathname === '/network/negotiate') {
      const { parsed } = await parseBodyWithRaw(req);
      const result = await negotiateBestPrice(parsed);
      return sendJson(res, 200, result);
    }

    // 9. Active Coupons: GET /coupons
    if (method === 'GET' && pathname === '/coupons') {
      return sendJson(res, 200, { success: true, coupons: ACTIVE_MERCHANT_COUPONS });
    }

    // 10. Validate Coupon: POST /coupons/validate
    if (method === 'POST' && pathname === '/coupons/validate') {
      const { parsed } = await parseBodyWithRaw(req);
      const result = validateCoupon(parsed.code, parsed.merchant_id, parsed.amount);
      return sendJson(res, 200, result);
    }

    // 11. Multi-Merchant Network Search: GET /network/search?query=...
    if (method === 'GET' && pathname === '/network/search') {
      const { query: searchQ } = query;
      const results = searchAcrossAllMerchants(searchQ);
      return sendJson(res, 200, {
        success: true,
        protocol: "ACP/1.0",
        scanned_merchants_count: getAllMerchants().length,
        offers_count: results.length,
        offers: results
      });
    }

    // 10. List All Merchants: GET /merchants
    if (method === 'GET' && pathname === '/merchants') {
      return sendJson(res, 200, { success: true, merchants: getAllMerchants() });
    }

    // 13. Specific Merchant Catalog with Pagination: GET /merchants/:id/products
    if (method === 'GET' && pathname.startsWith('/merchants/') && pathname.endsWith('/products')) {
      const parts = pathname.split('/');
      const merchantId = parts[2];
      const merchant = getMerchantById(merchantId);

      const { category, query: searchQ, page = 1, limit = 24, sort = 'popular', min_price, max_price } = query;
      const paginatedResult = filterAndPaginateCatalog(merchant.products, {
        category,
        query: searchQ,
        page: Number(page),
        limit: Number(limit),
        sort,
        minPrice: min_price ? Number(min_price) : 0,
        maxPrice: max_price ? Number(max_price) : 100000
      });

      return sendJson(res, 200, {
        success: true,
        protocol: "ACP/1.0",
        merchant_id: merchant.id,
        merchant_name: merchant.name,
        store_type: merchant.store_type,
        ...paginatedResult
      });
    }

    // 12. Merchant Orders: GET /orders
    if (method === 'GET' && (pathname.includes('/orders') || pathname === '/orders')) {
      const allOrders = await getAllOrders();
      return sendJson(res, 200, { success: true, count: allOrders.length, orders: allOrders });
    }

    // 13. Product Catalog: GET /products
    if (method === 'GET' && pathname === '/products') {
      const { category, max_price } = query;
      const products = await getProducts(category, max_price);
      return sendJson(res, 200, { success: true, protocol: "ACP/1.0", count: products.length, products });
    }

    // 13b. User Policy & Category Profile: GET /profile & POST /profile
    if (method === 'GET' && pathname === '/profile') {
      const auth = await authenticateRequest(req);
      const profile = await getUserProfile(auth.user?.id);
      return sendJson(res, 200, { success: true, profile, authenticated: auth.authenticated }, req);
    }

    if ((method === 'POST' || method === 'PUT') && pathname === '/profile') {
      const { parsed } = await parseBodyWithRaw(req);
      const auth = await authenticateRequest(req);
      const updated = await saveUserProfile(parsed, auth.user?.id);

      let updatedMandate = null;
      if (!auth.user?.id || auth.user.id === 'usr_alex_01') {
        if (updated.default_max_budget) {
          const activeMandate = await getLatestActiveMandate();
          if (activeMandate && activeMandate.status === 'ACTIVE') {
            activeMandate.max_budget = Number(updated.default_max_budget);
            activeMandate.remaining_budget = Math.max(0, activeMandate.max_budget - (Number(activeMandate.spent_amount) || 0));
            if (parsed.allowed_categories && Array.isArray(parsed.allowed_categories) && parsed.allowed_categories.length > 0) {
              activeMandate.allowed_categories = parsed.allowed_categories;
            }
            activeMandate.signature = signMandatePayload(activeMandate);
            updatedMandate = await updateMandate(activeMandate.mandate_id, activeMandate);
          } else {
            updatedMandate = await createMandate({
              max_budget: Number(updated.default_max_budget),
              allowed_categories: (parsed.allowed_categories && parsed.allowed_categories.length > 0) ? parsed.allowed_categories : DEFAULT_ALLOWED_CATEGORIES
            });
          }
        }
      }

      await addAuditLog({
        actor: "USER_POLICY_ENGINE",
        action: "POLICY_PREFERENCES_UPDATED",
        status: "SUCCESS",
        details: `User '${updated.name || 'Shopper'}' updated authorized purchase categories (${updated.allowed_categories?.length || 0} active) and shopping policy limit to ₹${updated.default_max_budget}`,
        payload: { profile: updated, mandate: updatedMandate }
      });
      return sendJson(res, 200, { success: true, profile: updated, mandate: updatedMandate }, req);
    }

    // 13d. Real-Time AI Advisor Intelligence: GET /advisor
    if (method === 'GET' && pathname === '/advisor') {
      const orders = await getAllOrders();
      const profile = await getUserProfile();
      const mandate = await getLatestActiveMandate();

      const totalSpent = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const amazonOrders = orders.filter(o => o.merchant_id === 'aura-tech' || !o.merchant_id);
      const flipkartOrders = orders.filter(o => o.merchant_id === 'prime-gadgets');
      const meeshoOrders = orders.filter(o => o.merchant_id === 'meesho-direct');

      const maxLimit = Number(mandate?.max_budget || profile?.default_max_budget || 2000);
      const remaining = Math.max(0, maxLimit - totalSpent);
      const utilization = Math.min(100, Math.round((totalSpent / maxLimit) * 100));

      const totalSavings = orders.reduce((sum, o) => {
        const mrp = o.product?.mrp || Math.round((o.amount || 500) * 1.25);
        return sum + Math.max(0, mrp - (o.amount || 0));
      }, 0);

      const advice = {
        store_arbitrage: {
          title: "Store Sourcing Arbitrage",
          highlight: meeshoOrders.length > 0 ? "Meesho Savings Active" : "Opportunity: Meesho Direct",
          badge: meeshoOrders.length > 0 ? `Saved ₹${meeshoOrders.length * 150}` : "Save ~35%",
          description: meeshoOrders.length > 0
            ? `You have placed ${meeshoOrders.length} order(s) on Meesho Direct with factory pricing, saving ~₹${meeshoOrders.length * 150} vs retail MRP.`
            : `You have placed ${amazonOrders.length + flipkartOrders.length} order(s) on standard storefronts. Sourcing everyday accessories & cables on Meesho Direct will save ₹150–₹350 per item.`,
          recommended_store: meeshoOrders.length === 0 ? "Meesho Direct" : "Amazon India (Prime Tech)"
        },
        coupon_yield: {
          title: "Coupon Optimization",
          highlight: `${orders.length} Orders Processed`,
          badge: profile.auto_negotiate_coupons !== false ? "Auto-Hunter ON" : "Negotiation Disabled",
          total_saved_inr: totalSavings,
          description: profile.auto_negotiate_coupons !== false
            ? `AI Dynamic Hunter has saved you ₹${totalSavings} INR across orders. Auto-applied PRIME_AUTOPAY_50, SUPERCOIN_DROP_75, and MEESHO_FACTORY_15.`
            : `Automated coupon negotiation is currently turned OFF. Enable it in Personalization to unlock 10–15% instant discounts on checkout.`,
          top_coupon: meeshoOrders.length > 0 ? "MEESHO_FACTORY_15" : "PRIME_AUTOPAY_50"
        },
        budget_velocity: {
          title: "Fiduciary Budget Health",
          utilization_pct: utilization,
          status: utilization > 85 ? "Near Limit" : (utilization > 50 ? "Moderate" : "Safe"),
          remaining_inr: remaining,
          cap_inr: maxLimit,
          description: `₹${remaining} INR safe headroom remaining from ₹${maxLimit} mandate cap. 100% zero rogue risk.`
        }
      };

      return sendJson(res, 200, { success: true, advice });
    }

    // 13c. Chat Sessions Persistence: GET, POST, DELETE /api/agent/sessions & /agent/sessions
    if (method === 'GET' && (pathname === '/api/agent/sessions' || pathname === '/agent/sessions')) {
      const sessions = await getChatSessions();
      return sendJson(res, 200, { success: true, sessions });
    }

    if (method === 'POST' && (pathname === '/api/agent/sessions' || pathname === '/agent/sessions')) {
      const { parsed } = await parseBodyWithRaw(req);
      const saved = await saveChatSession(parsed);
      return sendJson(res, 200, { success: true, session: saved });
    }

    if (method === 'DELETE' && (pathname.startsWith('/api/agent/sessions/') || pathname.startsWith('/agent/sessions/'))) {
      const parts = pathname.split('/');
      const sessionId = parts[parts.length - 1];
      await deleteChatSession(sessionId);
      return sendJson(res, 200, { success: true, deleted_id: sessionId });
    }

    // 14. AP2 Mandates: POST /mandates and GET /mandates/active
    if (method === 'GET' && pathname === '/mandates/active') {
      const active = await getLatestActiveMandate();
      return sendJson(res, 200, { success: true, mandate: active });
    }

    if (method === 'POST' && pathname === '/mandates') {
      const { parsed } = await parseBodyWithRaw(req);
      const profile = await getUserProfile();
      const { max_budget, allowed_categories, validity_minutes, user_intent, agent_id, merchant_id } = parsed;
      if (!max_budget || isNaN(Number(max_budget))) {
        return sendJson(res, 400, { success: false, error: "Field 'max_budget' (number) is required." });
      }
      const mandate = await createMandate({
        max_budget: Number(max_budget),
        allowed_categories: allowed_categories && allowed_categories.length > 0 ? allowed_categories : (profile.allowed_categories || DEFAULT_ALLOWED_CATEGORIES),
        validity_minutes: validity_minutes ? Number(validity_minutes) : 15,
        user_intent: user_intent || "Agent programmatic shopping",
        agent_id: agent_id || "groq_shopping_agent",
        merchant_id: merchant_id || "rzp_merchant_acp_demo"
      });
      return sendJson(res, 201, { success: true, protocol: "AP2/1.0", mandate });
    }

    // 15. ACP Checkout Gatekeeper: POST /checkout
    if (method === 'POST' && pathname === '/checkout') {
      const { parsed } = await parseBodyWithRaw(req);
      const { item_id, mandate_id, quantity = 1, merchant_id } = parsed;

      if (!item_id) return sendJson(res, 400, { success: false, error: "Missing 'item_id'" });
      if (!mandate_id) return sendJson(res, 401, { success: false, error: "Missing AP2 mandate token" });

      let product = await getProductById(item_id);
      if (!product) {
        const allOffers = searchAcrossAllMerchants();
        const foundOffer = allOffers.find(o => o.product.id === item_id);
        if (foundOffer) product = foundOffer.product;
      }

      if (!product) return sendJson(res, 404, { success: false, error: `Product '${item_id}' not found.` });

      const totalAmount = product.price * Number(quantity);

      const validation = await validateMandateForPurchase({
        mandate_id,
        item_price: totalAmount,
        item_category: product.category,
        item_name: product.name
      });

      if (!validation.isValid) {
        await addAuditLog({
          actor: "CHECKOUT_GATEKEEPER",
          action: "CHECKOUT_REJECTED",
          status: "POLICY_VIOLATION",
          mandate_id,
          details: `Checkout blocked: ${validation.reason}`
        });

        return sendJson(res, validation.status || 403, {
          success: false,
          protocol: "ACP/1.0",
          error_code: validation.errorCode,
          reason: validation.reason,
          message: `ACP Checkout Blocked: ${validation.reason}`
        });
      }

      const targetMerchantId = merchant_id || validation.mandate.merchant_id || "aura-tech";

      const rzpOrder = await createRazorpayOrder({
        amount: totalAmount,
        receipt: `rcpt_${Date.now()}`,
        notes: { mandate_id, item_id: product.id, merchant_id: targetMerchantId }
      });

      const mandate = validation.mandate;
      const spent_amount = (mandate.spent_amount || 0) + totalAmount;
      const remaining_budget = mandate.max_budget - spent_amount;

      const orderData = {
        order_id: rzpOrder.order_id,
        product,
        quantity,
        merchant_id: targetMerchantId,
        mandate_id,
        amount: totalAmount,
        currency: "INR",
        receipt: rzpOrder.receipt,
        payment_status: "SUCCESS_TEST_MODE",
        settlement_status: "AWAITING_WEBHOOK_SETTLEMENT",
        is_live_test_api: rzpOrder.is_live_test_api,
        created_at: new Date().toISOString()
      };

      await saveOrder(orderData);

      await addAuditLog({
        actor: "CHECKOUT_GATEKEEPER",
        action: "CHECKOUT_AUTHORIZED",
        status: "SUCCESS",
        mandate_id,
        details: `Authorized ₹${totalAmount} order on '${targetMerchantId}' for '${product.name}' with Razorpay ID ${rzpOrder.order_id}`,
        payload: orderData
      });

      return sendJson(res, 200, {
        success: true,
        protocol: "ACP/1.0",
        message: `Order placed successfully on ${targetMerchantId} in Razorpay Test Mode.`,
        order: orderData,
        remaining_budget,
        mandate_id
      });
    }

    // 16. AI Agent Shop: POST /agent/shop
    if (method === 'POST' && pathname === '/agent/shop') {
      const { parsed } = await parseBodyWithRaw(req);
      const { prompt, explicit_budget, force_category, history, selected_model, agent_mode } = parsed;
      const result = await runShoppingAgent(prompt, explicit_budget, force_category, history, selected_model, agent_mode);
      return sendJson(res, 200, { success: result.success, ...result });
    }

    // 17. Upsell Engine: POST /agent/upsell
    if (method === 'POST' && pathname === '/agent/upsell') {
      const { parsed } = await parseBodyWithRaw(req);
      const { product_id, remaining_budget = 0 } = parsed;
      let product = null;
      if (product_id) product = await getProductById(product_id);
      const upsell = await generateUpsellRecommendation(product, Number(remaining_budget));
      return sendJson(res, 200, { success: true, upsell });
    }

    // 18. Audit Ledger: GET /audit
    if (method === 'GET' && pathname === '/audit') {
      const logs = await getAuditLogs(query.limit ? Number(query.limit) : 100);
      return sendJson(res, 200, { success: true, count: logs.length, logs });
    }

    // 19. Reset Database: POST /audit/reset
    if (method === 'POST' && pathname === '/audit/reset') {
      await resetDatabase();
      return sendJson(res, 200, { success: true, message: "Reset successfully." });
    }

    // 20. Watchlist: GET /watchlist
    if (method === 'GET' && pathname === '/watchlist') {
      const auth = await authenticateRequest(req);
      const list = await getWatchlist();
      const filtered = auth.authenticated && auth.user?.id
        ? list.filter(w => !w.user_id || w.user_id === auth.user.id)
        : list;
      return sendJson(res, 200, { success: true, count: filtered.length, watchlist: filtered }, req);
    }

    // 21. Watchlist: POST /watchlist (add new entry)
    if (method === 'POST' && pathname === '/watchlist') {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const { parsed } = await parseBodyWithRaw(req);
      const { product_id, product_name, product_image, merchant_id, current_price, target_price, mode, recurrence, fire_at, poll_interval_min, auto_buy, notes } = parsed;
      if (!product_name) {
        return sendJson(res, 400, { success: false, error: 'product_name is required.' }, req);
      }
      if (mode !== 'scheduled' && !target_price) {
        return sendJson(res, 400, { success: false, error: 'target_price is required for price drop tracking.' });
      }
      const item = {
        id: `watch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        user_id: auth.user.id,
        product_id: product_id || null,
        product_name,
        product_image: product_image || '🛒',
        merchant_id: merchant_id || 'aura-tech',
        current_price: Number(current_price) || null,
        target_price: target_price ? Number(target_price) : (Number(current_price) || 0),
        mode: mode || 'price_drop',
        recurrence: recurrence || 'one_time', // 'one_time' | 'monthly_recurring'
        fire_at: fire_at || null,
        poll_interval_min: Number(poll_interval_min) || 30,
        is_active: true,
        auto_buy: auto_buy !== false,
        created_at: new Date().toISOString(),
        last_checked: null,
        last_checked_price: null,
        triggered_at: null,
        last_ordered_at: null,
        status: 'watching',
        order_id: null,
        notes: notes || ''
      };
      const saved = await addWatchlistItem(item);
      await addAuditLog({ actor: auth.user.name || 'USER', action: 'WATCHLIST_ADDED', status: 'SUCCESS', details: `Added "${product_name}" to watchlist (${mode === 'scheduled' ? `Scheduled ${recurrence === 'monthly_recurring' ? 'Monthly' : 'One-time'}` : `Target Rs.${target_price}`})`, payload: saved });
      return sendJson(res, 201, { success: true, item: saved }, req);
    }

    // 22. Watchlist: POST /watchlist/:id/check (manual trigger — must come before PATCH/DELETE)
    if (method === 'POST' && /^\/watchlist\/[^/]+\/check$/.test(pathname)) {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const wid = pathname.replace('/watchlist/', '').replace('/check', '');
      const list = await getWatchlist();
      const item = list.find(w => w.id === wid && (!w.user_id || w.user_id === auth.user.id));
      if (!item) return sendJson(res, 404, { success: false, error: 'Watchlist item not found.' }, req);
      const forced = { ...item, last_checked: null };
      const result = await checkWatchlistEntry(forced);
      return sendJson(res, 200, { success: true, item: result }, req);
    }

    // 23. Watchlist: PATCH/PUT /watchlist/:id
    if ((method === 'PATCH' || method === 'PUT') && /^\/watchlist\/[^/]+$/.test(pathname)) {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const wid = pathname.replace('/watchlist/', '');
      const list = await getWatchlist();
      const existing = list.find(w => w.id === wid && (!w.user_id || w.user_id === auth.user.id));
      if (!existing) return sendJson(res, 404, { success: false, error: 'Watchlist item not found.' }, req);
      const { parsed } = await parseBodyWithRaw(req);
      const updated = await updateWatchlistItem(wid, parsed);
      if (!updated) return sendJson(res, 404, { success: false, error: 'Watchlist item not found.' }, req);
      return sendJson(res, 200, { success: true, item: updated }, req);
    }

    // 24. Watchlist: DELETE /watchlist/:id
    if (method === 'DELETE' && /^\/watchlist\/[^/]+$/.test(pathname)) {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const wid = pathname.replace('/watchlist/', '');
      const list = await getWatchlist();
      const existing = list.find(w => w.id === wid && (!w.user_id || w.user_id === auth.user.id));
      if (!existing) return sendJson(res, 404, { success: false, error: 'Watchlist item not found.' }, req);
      await deleteWatchlistItem(wid);
      return sendJson(res, 200, { success: true, message: 'Removed from watchlist.' }, req);
    }

    // 25. Merchant Growth Campaigns: GET /merchant/campaigns
    if (method === 'GET' && pathname === '/merchant/campaigns') {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const list = await getCampaigns();
      return sendJson(res, 200, { success: true, count: list.length, campaigns: list }, req);
    }

    // 26. Merchant Growth Campaigns: POST /merchant/campaigns
    if (method === 'POST' && pathname === '/merchant/campaigns') {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const { parsed } = await parseBodyWithRaw(req);
      const saved = await addCampaign(parsed);
      await addAuditLog({
        actor: auth.user.name || "MERCHANT_ADMIN",
        action: "CAMPAIGN_LAUNCHED",
        status: "SUCCESS",
        details: `Launched AI growth campaign: "${saved.name}" (${saved.discount_value}% / ₹${saved.discount_value}) on ${saved.merchant_name}`,
        payload: saved
      });
      return sendJson(res, 201, { success: true, campaign: saved }, req);
    }

    // 27. Merchant Growth Campaigns: PATCH /merchant/campaigns/:id/toggle
    if (method === 'PATCH' && /^\/merchant\/campaigns\/[^/]+\/toggle$/.test(pathname)) {
      const auth = await authenticateRequest(req);
      if (!auth.authenticated) {
        return sendJson(res, 401, { success: false, error: 'Authentication required.' }, req);
      }
      const cid = pathname.replace('/merchant/campaigns/', '').replace('/toggle', '');
      const updated = await toggleCampaign(cid);
      if (!updated) return sendJson(res, 404, { success: false, error: 'Campaign not found.' }, req);
      await addAuditLog({
        actor: auth.user.name || "MERCHANT_ADMIN",
        action: updated.is_active ? "CAMPAIGN_ACTIVATED" : "CAMPAIGN_PAUSED",
        status: "SUCCESS",
        details: `${updated.is_active ? 'Activated' : 'Paused'} AI growth campaign "${updated.name}"`,
        payload: updated
      });
      return sendJson(res, 200, { success: true, campaign: updated }, req);
    }

    return sendJson(res, 404, { success: false, error: "Not Found" });

  } catch (error) {
    console.error("Server Error:", error);
    return sendJson(res, 500, { success: false, error: error.message });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, async () => {
  console.log(`🚀 Multi-Merchant Server running on http://localhost:${PORT}`);
  console.log(`⚡ Cryptographic Webhook Handler mounted on /webhooks/razorpay`);
  startTelegramPolling();
  startWatchlistPoller();
});
