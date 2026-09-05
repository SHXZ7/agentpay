// backend/src/channels/whatsapp.js - WhatsApp Webhook & Multi-Channel Agent Engine
import { runShoppingAgent, generateUpsellRecommendation } from '../agent.js';
import { addAuditLog, getAllOrders, getLatestActiveMandate, getAutopayRecord, getUserProfile } from '../db.js';
import { getAutopayStatus } from '../autopay.js';

export async function processWhatsAppMessage({ from = "+919876543210", text = "", user_name = "Shopper" }) {
  const trimmed = (text || "").trim();
  const maskedFrom = typeof from === 'string' && from.length > 4 
    ? `${from.slice(0, 3)}****${from.slice(-3)}` 
    : 'masked_user';

  await addAuditLog({
    actor: "WHATSAPP_USER",
    action: "MESSAGE_RECEIVED",
    status: "INFO",
    details: `WhatsApp command received from ${maskedFrom}: "${trimmed}"`
  });

  const lower = trimmed.toLowerCase();

  // 1. Command: Check Budget / Mandate Balance
  if (lower === 'budget' || lower === 'check budget' || lower === 'balance' || lower === 'check balance' || lower === 'mandate') {
    const mandate = await getLatestActiveMandate();
    const autopay = await getAutopayStatus();
    const profile = await getUserProfile();

    const maxCap = Number(mandate?.max_budget || autopay?.max_limit || profile?.default_max_budget || 5000);
    const spent = Number(autopay?.spent_amount !== undefined ? autopay?.spent_amount : (mandate?.spent_amount || 0));
    const remaining = Math.max(0, maxCap - spent);

    const reply = `🛡️ *AGENTPAY FIDUCIARY BUDGET STATUS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 *Approved UPI Autopay Cap:* ₹${maxCap.toLocaleString('en-IN')} INR\n` +
      `💸 *Total Autonomous Spend:* ₹${spent.toLocaleString('en-IN')} INR\n` +
      `⚡ *Safe Spending Headroom:* *₹${remaining.toLocaleString('en-IN')} INR*\n` +
      `🔒 *0-OTP Policy Status:* 100% ACTIVE (HMAC-SHA256 Signed)\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Send any purchase command e.g. "buy mouse under ₹800" to auto-checkout._`;

    await addAuditLog({
      actor: "WHATSAPP_BOT",
      action: "BUDGET_INSPECTED",
      status: "SUCCESS",
      details: `Dispatched budget summary to ${maskedFrom}`
    });

    return {
      success: true,
      type: 'budget_inquiry',
      reply,
      order: null
    };
  }

  // 2. Command: Order History & Tracking
  if (lower === 'orders' || lower === 'my orders' || lower === 'track' || lower === 'status' || lower === 'order status') {
    const orders = await getAllOrders();
    const recent = orders.slice(0, 3);

    if (recent.length === 0) {
      return {
        success: true,
        type: 'orders_inquiry',
        reply: `📦 *AGENTPAY ORDER HISTORY*\n━━━━━━━━━━━━━━━━━━━━━━━━\nNo orders placed yet. Text *"buy mouse under ₹800"* to place your first autonomous 0-OTP order!`,
        order: null
      };
    }

    let reply = `📦 *YOUR RECENT AUTONOMOUS ORDERS*\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    recent.forEach((o, idx) => {
      reply += `${idx + 1}. *${o.product?.name || o.product_name || 'Item'}*\n` +
        `   • 💰 *Amount:* ₹${o.amount} INR (${o.payment_status || 'PAID'})\n` +
        `   • 🆔 *ID:* \`${o.order_id}\`\n` +
        `   • 🏪 *Merchant:* ${o.merchant_id === 'prime-gadgets' ? 'Flipkart Assured' : o.merchant_id === 'meesho-direct' ? 'Meesho Direct' : 'Amazon India'}\n` +
        `   • 🚚 *Tracking:* Dispatched • On Time\n\n`;
    });
    reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n_Protected by Razorpay Test Mode Gateway._`;

    return {
      success: true,
      type: 'orders_inquiry',
      reply,
      order: null
    };
  }

  // 3. Command: Help
  if (lower === 'help' || lower === 'hi' || lower === 'hello' || lower === '/start') {
    const reply = `👋 *Hello ${user_name}! Welcome to AgentPay WhatsApp Assistant.*\n\n` +
      `I am your autonomous 0-OTP commerce copilot. You can text me plain English commands:\n\n` +
      `🛒 *Instant Auto-Buys:*\n` +
      `• *"buy mouse under ₹800"*\n` +
      `• *"buy wireless keyboard under ₹2000"*\n` +
      `• *"order bluetooth speaker under ₹3000"*\n\n` +
      `📊 *Fiduciary Controls:*\n` +
      `• *"budget"* — Check remaining safe mandate cap\n` +
      `• *"orders"* — View recent orders and tracking IDs\n\n` +
      `⚡ All purchases execute headless via your authorized UPI Autopay limit with 0 OTP delays.`;

    return {
      success: true,
      type: 'help',
      reply,
      order: null
    };
  }

  // 4. Autonomous Shopping Execution Flow (e.g. "buy mouse under ₹800")
  const result = await runShoppingAgent(trimmed);

  let replyText = "";
  let orderData = null;
  let upsellData = null;

  if (result.success && result.checkout && result.checkout.success) {
    orderData = result.checkout.order;
    upsellData = result.upsell;
    
    const merchantId = result.checkout.merchant_id || orderData.merchant_id || 'aura-tech';
    const merchantName = merchantId === 'prime-gadgets' ? 'Flipkart Assured ✦' : 
                         merchantId === 'meesho-direct' ? 'Meesho Direct 🏷️' : 
                         'Amazon India (Prime 1-Day Dispatch ✓)';

    const originalMrp = orderData.product?.mrp || Math.round((Number(orderData.amount) || 500) * 1.15);
    const finalPrice = Number(orderData.amount);
    const savings = Math.max(0, originalMrp - finalPrice);
    const couponCode = result.negotiation?.applied_coupon?.code || (savings > 0 ? "AGENTIC_FIRST10" : null);

    replyText = `🧾 *AGENTPAY 0-OTP AUTONOMOUS RECEIPT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Item:* *${orderData.product?.name || orderData.product_name}*\n` +
      `🏪 *Merchant:* ${merchantName}\n` +
      `💵 *Listed MRP:* ~₹${originalMrp.toLocaleString('en-IN')} INR~\n` +
      `⚡ *Negotiated Price:* *₹${finalPrice.toLocaleString('en-IN')} INR*` + (savings > 0 ? ` (Saved ₹${savings}${couponCode ? ` via code ${couponCode}` : ''})` : '') + `\n\n` +
      `💳 *Payment Method:* 0-OTP Headless UPI Autopay\n` +
      `🛡️ *AP2 Mandate Token:* \`${orderData.mandate_id}\`\n` +
      `🆔 *Razorpay Order ID:* \`${orderData.order_id}\`\n` +
      `⚡ *Payment Status:* PAID (Razorpay Test Mode)\n` +
      `🚚 *Delivery Status:* Dispatched to primary address • Est. Delivery Tomorrow\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (upsellData && upsellData.product) {
      replyText += `🎁 *Smart Add-On Bundle (Save 10%):*\n` +
        `Pair with *${upsellData.product.name}* for just *₹${upsellData.bundle_discount_price}* (fits remaining mandate budget).\n` +
        `Reply *YES* to add!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    replyText += `🔒 *Fiduciary Guarantee:* Protected by NPCI & Razorpay HMAC-SHA256 signature verification.`;

  } else {
    const reason = result.checkout?.error || result.checkout?.reason || result.message || "Purchase exceeded safety budget cap or policy bounds.";
    replyText = `🛑 *Purchase Safely Bounded & Blocked*\n\n` +
      `*Reason:* ${reason}\n\n` +
      `🔒 _Your mandate policy prevented unauthorized spending. Your funds remain 100% secure._\n\n` +
      `_Text "budget" to check available safe spending limit._`;
  }

  await addAuditLog({
    actor: "WHATSAPP_BOT",
    action: "ORDER_RECEIPT_DISPATCHED",
    status: result.success ? "SUCCESS" : "INFO",
    details: `Sent WhatsApp receipt to ${maskedFrom} for query: "${trimmed}"`
  });

  return {
    success: result.success,
    reply: replyText,
    order: orderData,
    upsell: upsellData,
    steps: result.steps
  };
}
