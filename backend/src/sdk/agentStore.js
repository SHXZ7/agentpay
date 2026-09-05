// backend/src/sdk/agentStore.js - Official @razorpay/agent-store Drop-in Middleware SDK
import crypto from 'crypto';
import { getProducts, getProductById, saveMandate, getMandate, updateMandate, saveOrder, addAuditLog, getAuditLogs, resetDatabase } from '../db.js';
import { createMandate, validateMandateForPurchase, verifyMandateSignature } from '../mandates.js';
import { createRazorpayOrder, isRealRazorpayConfigured } from '../razorpay.js';
import { runShoppingAgent, generateUpsellRecommendation } from '../agent.js';

/**
 * Drop-in Middleware for any Express/Node Merchant Application
 * 
 * Usage in merchant app:
 * ```javascript
 * import express from 'express';
 * import { agentStore } from './sdk/agentStore.js';
 * 
 * const app = express();
 * app.use(agentStore({
 *   merchantId: 'merchant_acp_demo',
 *   razorpayKeyId: process.env.RAZORPAY_KEY_ID,
 *   razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
 *   enableUpsell: true
 * }));
 * ```
 */
export function agentStore(config = {}) {
  const {
    merchantId = 'rzp_merchant_acp_demo',
    prefix = '',
    enableUpsell = true,
    customCatalog = null
  } = config;

  return async function agentStoreMiddleware(req, res, next) {
    const url = req.path || req.url;

    // 1. GET /products - Machine-readable ACP catalog
    if (req.method === 'GET' && url === `${prefix}/products`) {
      const { category, max_price } = req.query;
      let products = customCatalog ? await customCatalog(category, max_price) : await getProducts(category, max_price);
      
      await addAuditLog({
        actor: "AI_AGENT",
        action: "CATALOG_QUERIED",
        status: "SUCCESS",
        details: `Merchant ${merchantId} catalog queried for category '${category || 'all'}'`,
        payload: { count: products.length }
      });

      return res.json({
        success: true,
        protocol: "ACP/1.0",
        merchant_id: merchantId,
        count: products.length,
        products
      });
    }

    // 2. POST /mandates - AP2 Mandate Token Issuance
    if (req.method === 'POST' && url === `${prefix}/mandates`) {
      const { max_budget, allowed_categories, validity_minutes, user_intent, merchant_id } = req.body;
      if (!max_budget) {
        return res.status(400).json({ success: false, error: "Field 'max_budget' is required." });
      }

      const mandate = await createMandate({
        max_budget: Number(max_budget),
        allowed_categories: allowed_categories || ["electronics", "accessories"],
        validity_minutes: validity_minutes || 15,
        user_intent: user_intent || "Autonomous agent purchase",
        merchant_id: merchant_id || merchantId || "rzp_merchant_acp_demo"
      });

      return res.status(201).json({ success: true, protocol: "AP2/1.0", mandate });
    }

    // 3. POST /checkout - ACP Policy Gatekeeper + Razorpay Settlement
    if (req.method === 'POST' && url === `${prefix}/checkout`) {
      const { item_id, mandate_id, quantity = 1, merchant_id } = req.body;

      if (!item_id) return res.status(400).json({ success: false, error: "Missing 'item_id'" });
      if (!mandate_id) return res.status(401).json({ success: false, error: "Missing AP2 mandate token" });

      const product = await getProductById(item_id);
      if (!product) return res.status(404).json({ success: false, error: "Product not found" });

      const totalAmount = product.price * Number(quantity);
      const targetMerchantId = merchant_id || merchantId || "rzp_merchant_acp_demo";

      // Validate AP2 constraints
      const validation = await validateMandateForPurchase({
        mandate_id,
        item_price: totalAmount,
        item_category: product.category,
        item_name: product.name
      });

      if (!validation.isValid) {
        await addAuditLog({
          actor: "CHECKOUT_GATEKEEPER",
          action: "CHECKOUT_DENIED",
          status: "POLICY_VIOLATION",
          mandate_id,
          details: `Policy gate blocked checkout: ${validation.reason}`
        });

        return res.status(validation.status || 403).json({
          success: false,
          protocol: "ACP/1.0",
          error_code: validation.errorCode,
          reason: validation.reason,
          message: `ACP Checkout Blocked: ${validation.reason}`
        });
      }

      // Create Razorpay Order
      const rzpOrder = await createRazorpayOrder({
        amount: totalAmount,
        receipt: `rcpt_${Date.now()}`,
        notes: { mandate_id, item_id: product.id, merchant_id: targetMerchantId }
      });

      const mandate = validation.mandate;
      const spent_amount = (mandate.spent_amount || 0) + totalAmount;
      const remaining_budget = mandate.max_budget - spent_amount;

      await updateMandate(mandate_id, {
        spent_amount,
        remaining_budget,
        status: remaining_budget > 0 ? "ACTIVE" : "CONSUMED"
      });

      const orderData = {
        order_id: rzpOrder.order_id,
        product,
        quantity,
        mandate_id,
        amount: totalAmount,
        currency: "INR",
        receipt: rzpOrder.receipt,
        payment_status: "SUCCESS_TEST_MODE",
        is_live_test_api: rzpOrder.is_live_test_api,
        created_at: new Date().toISOString()
      };

      await saveOrder(orderData);

      await addAuditLog({
        actor: "CHECKOUT_GATEKEEPER",
        action: "CHECKOUT_AUTHORIZED",
        status: "SUCCESS",
        mandate_id,
        details: `Authorized order ${rzpOrder.order_id} for ₹${totalAmount}`
      });

      return res.status(200).json({
        success: true,
        protocol: "ACP/1.0",
        order: orderData,
        remaining_budget,
        mandate_id
      });
    }

    // 4. POST /agent/shop - Full autonomous shopping loop
    if (req.method === 'POST' && url === `${prefix}/agent/shop`) {
      const { prompt, explicit_budget, force_category } = req.body;
      const result = await runShoppingAgent(prompt, explicit_budget, force_category);
      return res.json({ success: result.success, ...result });
    }

    // 5. POST /agent/upsell - Revenue booster engine
    if (req.method === 'POST' && url === `${prefix}/agent/upsell`) {
      const { product_id, remaining_budget = 0 } = req.body;
      let product = null;
      if (product_id) product = await getProductById(product_id);
      const upsell = await generateUpsellRecommendation(product, Number(remaining_budget));
      return res.json({ success: true, upsell });
    }

    // 6. GET /audit - Forensic ledger
    if (req.method === 'GET' && url === `${prefix}/audit`) {
      const logs = await getAuditLogs(req.query.limit || 100);
      return res.json({ success: true, logs });
    }

    // Pass through if not an agent route
    if (next) return next();
  };
}

export default agentStore;
