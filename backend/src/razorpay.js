// backend/src/razorpay.js - Razorpay Integration
import { addAuditLog } from './db.js';

export function isRealRazorpayConfigured() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    key_id && 
    key_secret && 
    !key_id.includes('placeholder') && 
    !key_secret.includes('placeholder') &&
    key_id.startsWith('rzp_test_')
  );
}

let cachedRazorpay = null;

export async function getRazorpayInstance() {
  if (cachedRazorpay) return cachedRazorpay;
  if (isRealRazorpayConfigured()) {
    try {
      const { default: Razorpay } = await import('razorpay');
      cachedRazorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      return cachedRazorpay;
    } catch (err) {
      console.warn("Failed to initialize Razorpay SDK instance, falling back to simulator:", err.message);
    }
  }
  return null;
}

export async function createRazorpayOrder({ amount, receipt, notes = {} }) {
  const amountInPaise = Math.round(amount * 100);
  const rzp = await getRazorpayInstance();

  if (rzp) {
    try {
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt,
        notes: {
          ...notes,
          protocol: "ACP_AP2_AGENTIC",
          environment: "test_mode"
        }
      });

      await addAuditLog({
        actor: "RAZORPAY_API",
        action: "ORDER_CREATED",
        status: "SUCCESS",
        details: `Created real Razorpay test order ${order.id} for ₹${amount}`,
        payload: {
          order_id: order.id,
          amount_inr: amount,
          amount_paise: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
          is_simulator: false
        }
      });

      return {
        success: true,
        order_id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at,
        is_live_test_api: true
      };
    } catch (error) {
      console.error("Razorpay API Call Error:", error.message);
      if (process.env.PAYMENTS_SIMULATE !== 'true' && isRealRazorpayConfigured()) {
        await addAuditLog({
          actor: "RAZORPAY_API",
          action: "ORDER_CREATION_FAILED",
          status: "ERROR",
          details: `Razorpay API order creation failed: ${error.message}`,
          payload: { error: error.message }
        });
        throw error;
      }
      await addAuditLog({
        actor: "RAZORPAY_API",
        action: "ORDER_FALLBACK_SIMULATOR",
        status: "WARNING",
        details: `Razorpay API key error (${error.message}). Falling back to reliable Test Simulator.`,
        payload: { error: error.message }
      });
    }
  }

  // Realistic Razorpay Test Simulator
  const simulatedOrderId = `order_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  
  await addAuditLog({
    actor: "RAZORPAY_TEST_SIMULATOR",
    action: "ORDER_CREATED",
    status: "SUCCESS",
    details: `Simulated Razorpay test order ${simulatedOrderId} for ₹${amount}`,
    payload: {
      order_id: simulatedOrderId,
      amount_inr: amount,
      amount_paise: amountInPaise,
      currency: "INR",
      receipt,
      status: "created",
      is_simulator: true
    }
  });

  return {
    success: true,
    order_id: simulatedOrderId,
    amount: amount,
    currency: "INR",
    receipt,
    status: "created",
    created_at: Math.floor(Date.now() / 1000),
    is_live_test_api: false
  };
}

export function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { verified: false, error: "Missing required payment signature verification parameters." };
  }
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return { verified: false, error: "RAZORPAY_KEY_SECRET is not configured." };
  }
  try {
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expected));
    if (!isValid) {
      return { verified: false, error: "Razorpay payment signature mismatch." };
    }
    return { verified: true, razorpay_order_id, razorpay_payment_id };
  } catch (err) {
    return { verified: false, error: err.message };
  }
}
