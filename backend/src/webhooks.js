// backend/src/webhooks.js - Razorpay Cryptographic Webhook Engine
import crypto from 'crypto';
import { addAuditLog, getAllOrders, saveOrder } from './db.js';

const getWebhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

/**
 * Cryptographically verifies Razorpay X-Razorpay-Signature header
 */
export function verifyRazorpayWebhookSignature(rawBody, signature) {
  const secret = getWebhookSecret();
  if (!signature || !secret) return false;

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Processes incoming Razorpay Webhook Event
 */
export async function processRazorpayWebhook(rawBody, signature, parsedEvent) {
  const isSignatureValid = verifyRazorpayWebhookSignature(rawBody, signature);

  if (!isSignatureValid) {
    await addAuditLog({
      actor: "RAZORPAY_WEBHOOK_RECEIVER",
      action: "WEBHOOK_SIGNATURE_FAILED",
      status: "REJECTED",
      details: "Invalid or forged X-Razorpay-Signature rejected."
    });

    return {
      success: false,
      status: 400,
      error: "INVALID_SIGNATURE",
      reason: "Cryptographic X-Razorpay-Signature HMAC verification failed."
    };
  }

  const eventType = parsedEvent.event || "payment.captured";
  const entity = parsedEvent.payload?.payment?.entity || parsedEvent.payload?.order?.entity || {};
  const orderId = entity.order_id || parsedEvent.order_id;
  const paymentId = entity.id || `pay_${Date.now()}`;

  if (!orderId) {
    return {
      success: false,
      status: 400,
      error: "MISSING_ORDER_ID",
      reason: "Webhook event contains no resolvable order_id."
    };
  }

  // Find and update the exact order in memory / MongoDB
  const allOrders = await getAllOrders();
  const matchedOrder = allOrders.find(o => o.order_id === orderId);

  if (!matchedOrder) {
    return {
      success: false,
      status: 404,
      error: "ORDER_NOT_FOUND",
      reason: `No matching order found for order ID '${orderId}'.`
    };
  }

  matchedOrder.settlement_status = "OFFICIALLY_SETTLED";
  matchedOrder.payment_id = paymentId;
  matchedOrder.settled_at = new Date().toISOString();
  matchedOrder.hmac_verified = true;
  matchedOrder.webhook_event = eventType;
  await saveOrder(matchedOrder);

  await addAuditLog({
    actor: "RAZORPAY_WEBHOOK_RECEIVER",
    action: `WEBHOOK_${eventType.toUpperCase().replace('.', '_')}`,
    status: "SETTLED",
    details: `Cryptographically verified webhook for ${orderId} (Payment: ${paymentId}) -> Status: OFFICIALLY_SETTLED`,
    payload: {
      event: eventType,
      order_id: orderId,
      payment_id: paymentId,
      hmac_verified: true,
      amount: entity.amount ? entity.amount / 100 : matchedOrder.amount
    }
  });

  return {
    success: true,
    status: 200,
    message: `Webhook event '${eventType}' processed successfully. Order marked as OFFICIALLY_SETTLED.`,
    order: matchedOrder
  };
}

/**
 * Local Simulator to test Cryptographic Webhook Settlement from Merchant Portal
 */
export async function simulateRazorpayWebhook({ order_id, event_type = "payment.captured" }) {
  const secret = getWebhookSecret();
  const payload = {
    entity: "event",
    account_id: "acc_merchant_acp_2026",
    event: event_type,
    contains: ["payment", "order"],
    payload: {
      payment: {
        entity: {
          id: `pay_${Date.now()}`,
          order_id: order_id,
          amount: 79900,
          currency: "INR",
          status: "captured",
          method: "upi",
          bank: "State Bank of India"
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  return await processRazorpayWebhook(rawBody, signature, payload);
}
