// backend/src/routes/checkout.js - ACP Checkout Gatekeeper & Razorpay Test Checkout
import express from 'express';
import { getProductById, saveOrder, updateMandate, addAuditLog } from '../db.js';
import { validateMandateForPurchase } from '../mandates.js';
import { createRazorpayOrder } from '../razorpay.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { item_id, mandate_id, quantity = 1 } = req.body;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: 'item_id'"
      });
    }

    if (!mandate_id) {
      return res.status(401).json({
        success: false,
        error_code: "MANDATE_REQUIRED",
        error: "Direct checkout rejected: AI Agent must provide an active AP2 mandate token.",
        message: "ACP Gatekeeper requires AP2 authorization mandate token."
      });
    }

    // 1. Fetch Product
    const product = await getProductById(item_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error_code: "PRODUCT_NOT_FOUND",
        error: `Product '${item_id}' not found.`
      });
    }

    const totalAmount = product.price * Number(quantity);

    // 2. Validate AP2 Mandate constraints (ACP Policy Gatekeeper)
    const validation = await validateMandateForPurchase({
      mandate_id,
      item_price: totalAmount,
      item_category: product.category,
      item_name: product.name
    });

    if (!validation.isValid) {
      // Intentional Graceful Rejection (No Crash)
      await addAuditLog({
        actor: "CHECKOUT_GATEKEEPER",
        action: "CHECKOUT_REJECTED",
        status: "POLICY_VIOLATION",
        mandate_id,
        details: `Checkout blocked by policy gate: ${validation.reason}`,
        payload: {
          error_code: validation.errorCode,
          reason: validation.reason,
          product: { id: product.id, name: product.name, price: product.price, category: product.category },
          mandate_id
        }
      });

      return res.status(validation.status || 403).json({
        success: false,
        protocol: "ACP/1.0",
        error_code: validation.errorCode,
        reason: validation.reason,
        message: `ACP Checkout Blocked: ${validation.reason}`,
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category
        },
        mandate_id,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Mandate is Valid -> Create Razorpay Test Order
    const rzpOrder = await createRazorpayOrder({
      amount: totalAmount,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        mandate_id,
        item_id: product.id,
        item_name: product.name,
        quantity
      }
    });

    // 4. Update Mandate Balance
    const mandate = validation.mandate;
    const spent_amount = (mandate.spent_amount || 0) + totalAmount;
    const remaining_budget = mandate.max_budget - spent_amount;

    await updateMandate(mandate_id, {
      spent_amount,
      remaining_budget,
      status: remaining_budget > 0 ? "ACTIVE" : "CONSUMED"
    });

    // 5. Store Completed Order
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
      details: `Authorized ₹${totalAmount} order for '${product.name}' with Razorpay Order ID ${rzpOrder.order_id}`,
      payload: orderData
    });

    res.status(200).json({
      success: true,
      protocol: "ACP/1.0",
      message: "Order placed successfully in Razorpay Test Mode.",
      order: orderData,
      remaining_budget,
      mandate_id
    });

  } catch (error) {
    console.error("Checkout Endpoint Exception:", error);
    res.status(500).json({
      success: false,
      error_code: "INTERNAL_SERVER_ERROR",
      error: error.message
    });
  }
});

export default router;
