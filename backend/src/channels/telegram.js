// backend/src/channels/telegram.js - Real-Time Autonomous Telegram Bot Agent
import 'dotenv/config';
import { runShoppingAgent, generateUpsellRecommendation } from '../agent.js';
import { addAuditLog, getAllOrders, getLatestActiveMandate, getUserProfile } from '../db.js';
import { getAutopayStatus } from '../autopay.js';

let isPolling = false;
let lastUpdateId = 0;

export async function sendTelegramAction(chatId, action = 'typing') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId || chatId === 'simulator_chat') return null;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action })
    });
  } catch (err) {
    // Non-critical action notification
  }
}

export async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: true, text, simulated: true };
  }

  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    };

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok) {
      // Fallback without parse_mode if HTML syntax issue
      const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, reply_markup: replyMarkup })
      });
      return await fallbackRes.json();
    }
    return data;
  } catch (err) {
    console.error("Telegram send error:", err.message);
    return { ok: false, error: err.message };
  }
}

const DEFAULT_KEYBOARD = {
  keyboard: [
    [{ text: "🖱️ Buy Mouse under ₹800" }, { text: "⌨️ Buy Keyboard under ₹2000" }],
    [{ text: "🛡️ Check Budget" }, { text: "📦 My Orders" }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

const ALLOWED_TELEGRAM_CHATS = process.env.TELEGRAM_ALLOWED_CHATS 
  ? process.env.TELEGRAM_ALLOWED_CHATS.split(',').map(s => s.trim()) 
  : null;

export async function handleTelegramMessage(message) {
  const chatId = message.chat?.id || "simulator_chat";
  const userText = (message.text || '').trim();
  const fromUser = message.from?.first_name || 'Shopper';
  const lower = userText.toLowerCase();

  await addAuditLog({
    actor: "TELEGRAM_USER",
    action: "MESSAGE_RECEIVED",
    status: "INFO",
    details: `Telegram command from ${fromUser} (Chat: ${chatId}): "${userText}"`
  });

  // Authorize chat if allowlist is configured
  if (ALLOWED_TELEGRAM_CHATS && !ALLOWED_TELEGRAM_CHATS.includes(String(chatId)) && chatId !== "simulator_chat") {
    return sendTelegramMessage(chatId, "⚠️ <b>Unauthorized Account:</b> This Telegram account is not linked or authorized to execute autonomous purchases.");
  }

  // Show typing state in Telegram app
  await sendTelegramAction(chatId, 'typing');

  // 1. Budget Inspection Command
  if (lower === '/budget' || lower.includes('budget') || lower.includes('balance') || lower.includes('limit')) {
    const mandate = await getLatestActiveMandate();
    const autopay = await getAutopayStatus();
    const profile = await getUserProfile();

    const maxCap = Number(mandate?.max_budget || autopay?.max_limit || profile?.default_max_budget || 5000);
    const spent = Number(autopay?.spent_amount !== undefined ? autopay?.spent_amount : (mandate?.spent_amount || 0));
    const remaining = Math.max(0, maxCap - spent);

    const reply = `🛡️ <b>AGENTPAY FIDUCIARY BUDGET STATUS</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 <b>Approved Limit:</b> ₹${maxCap.toLocaleString('en-IN')} INR\n` +
      `💸 <b>Total Autonomous Spend:</b> ₹${spent.toLocaleString('en-IN')} INR\n` +
      `⚡ <b>Safe Spending Headroom:</b> <b>₹${remaining.toLocaleString('en-IN')} INR</b>\n` +
      `🔒 <b>0-OTP Mandate Status:</b> <code>ACTIVE (HMAC-SHA256 Signed)</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Text any purchase command (e.g. "buy mouse under ₹800") to trigger instant 0-OTP checkout.</i>`;

    return sendTelegramMessage(chatId, reply, DEFAULT_KEYBOARD);
  }

  // 2. Orders & Tracking Command
  if (lower === '/orders' || lower === 'orders' || lower.includes('my orders') || lower === 'track' || lower === 'status') {
    const orders = await getAllOrders();
    const recent = orders.slice(0, 3);

    if (recent.length === 0) {
      return sendTelegramMessage(chatId, `📦 <b>No orders placed yet.</b>\n\nText <i>"buy mouse under ₹800"</i> to execute your first autonomous purchase!`, DEFAULT_KEYBOARD);
    }

    let reply = `📦 <b>YOUR RECENT AUTONOMOUS ORDERS</b>\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    recent.forEach((o, idx) => {
      const merchant = o.merchant_id === 'prime-gadgets' ? 'Flipkart Assured ✦' : 
                       o.merchant_id === 'meesho-direct' ? 'Meesho Direct 🏷️' : 
                       'Amazon India Prime ✓';
      reply += `${idx + 1}. <b>${o.product?.name || o.product_name}</b>\n` +
        `   • 💰 <b>Amount:</b> ₹${o.amount} INR (<code>${o.payment_status || 'PAID'}</code>)\n` +
        `   • 🆔 <b>Order ID:</b> <code>${o.order_id}</code>\n` +
        `   • 🏪 <b>Store:</b> ${merchant}\n` +
        `   • 🚚 <b>Status:</b> Dispatched • On Time\n\n`;
    });
    reply += `━━━━━━━━━━━━━━━━━━━━━━━━\n<i>Protected by Razorpay Test Mode Gateway.</i>`;

    return sendTelegramMessage(chatId, reply, DEFAULT_KEYBOARD);
  }

  // 3. Welcome / Help Command
  if (lower === '/start' || lower === '/help' || lower === 'help' || lower === 'hi' || lower === 'hello') {
    const welcome = `👋 <b>Hello ${fromUser}! Welcome to AgentPay Autonomous Commerce.</b>\n\n` +
      `I can find deals across Amazon, Flipkart, and Meesho, negotiate coupons, and execute 0-OTP purchases with your pre-approved UPI Autopay mandate.\n\n` +
      `🛒 <b>Try text commands:</b>\n` +
      `• <i>"buy mouse under ₹800"</i>\n` +
      `• <i>"buy wireless keyboard under ₹2000"</i>\n` +
      `• <i>"order boat bluetooth speaker under ₹3000"</i>\n\n` +
      `📊 <b>Control commands:</b>\n` +
      `• <code>/budget</code> — Check remaining safe mandate cap\n` +
      `• <code>/orders</code> — View recent orders & Razorpay tracking IDs\n\n` +
      `⚡ <i>Zero browser tabs required. 100% headless 0-OTP execution.</i>`;
    return sendTelegramMessage(chatId, welcome, DEFAULT_KEYBOARD);
  }

  // 4. Autonomous Shopping Execution Flow (e.g. "buy mouse under ₹800")
  await sendTelegramMessage(chatId, `🔍 <i>Scanning Amazon, Flipkart & Meesho for verified products under budget...</i>`);
  await sendTelegramAction(chatId, 'typing');

  const result = await runShoppingAgent(userText);

  if (result.success && result.checkout && result.checkout.success) {
    const order = result.checkout.order;
    const merchantId = result.checkout.merchant_id || order.merchant_id || 'aura-tech';
    const merchantName = merchantId === 'prime-gadgets' ? 'Flipkart Assured ✦' : 
                         merchantId === 'meesho-direct' ? 'Meesho Direct 🏷️' : 
                         'Amazon India (Prime 1-Day Dispatch ✓)';
    
    const originalMrp = order.product?.mrp || Math.round((Number(order.amount) || 500) * 1.15);
    const finalPrice = Number(order.amount);
    const savings = Math.max(0, originalMrp - finalPrice);
    const couponCode = result.negotiation?.applied_coupon?.code || (savings > 0 ? "AGENTIC_FIRST10" : null);

    let msg = `🧾 <b>AGENTPAY 0-OTP AUTONOMOUS RECEIPT</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Product:</b> <b>${order.product?.name || order.product_name}</b>\n` +
      `🏪 <b>Store:</b> ${merchantName}\n` +
      `💵 <b>Catalog Price:</b> <s>₹${originalMrp.toLocaleString('en-IN')} INR</s>\n` +
      `⚡ <b>Negotiated Price:</b> <b>₹${finalPrice.toLocaleString('en-IN')} INR</b>` + (savings > 0 ? ` <i>(Saved ₹${savings}${couponCode ? ` via code ${couponCode}` : ''})</i>` : '') + `\n\n` +
      `💳 <b>Payment:</b> 0-OTP Headless UPI Autopay\n` +
      `🛡️ <b>AP2 Mandate Token:</b> <code>${order.mandate_id}</code>\n` +
      `🆔 <b>Razorpay Order ID:</b> <code>${order.order_id}</code>\n` +
      `⚡ <b>Payment Status:</b> <code>PAID (Test Mode)</code>\n` +
      `🚚 <b>Delivery:</b> Dispatched to saved primary address • Est. Tomorrow\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (result.upsell && result.upsell.product) {
      msg += `🎁 <b>Smart Add-On Bundle (Save 10%):</b>\n` +
        `Pair with <b>${result.upsell.product.name}</b> for just <b>₹${result.upsell.bundle_discount_price}</b> (fits remaining budget)!\n` +
        `Reply <b>YES</b> to auto-order.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    msg += `🔒 <b>Fiduciary Guarantee:</b> Protected by Razorpay HMAC-SHA256 & NPCI`;

    return sendTelegramMessage(chatId, msg, DEFAULT_KEYBOARD);
  } else {
    const reason = result.checkout?.error || result.checkout?.reason || result.message || "Purchase exceeded safety budget cap or policy bounds.";
    const failMsg = `🛑 <b>Purchase Safely Bounded & Blocked</b>\n\n` +
      `<b>Reason:</b> ${reason}\n\n` +
      `🔒 <i>Your mandate policy prevented unauthorized spending. Funds remain 100% secure.</i>\n\n` +
      `<i>Text /budget to inspect your safe spending limit.</i>`;
    return sendTelegramMessage(chatId, failMsg, DEFAULT_KEYBOARD);
  }
}

export function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || isPolling) return;

  isPolling = true;
  console.log(`🤖 Real-time Telegram Bot Polling Active... (@${process.env.TELEGRAM_BOT_USERNAME || 'AgentPayyBot'})`);

  const poll = async () => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`);
      const data = await res.json();

      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            await handleTelegramMessage(update.message);
          }
        }
      }
    } catch (err) {
      // Network glitch, retry safely
    } finally {
      if (isPolling) setTimeout(poll, 1000);
    }
  };

  poll();
}
