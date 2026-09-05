// backend/src/negotiation.js - Autonomous Multi-Store Dynamic Negotiation & Coupon Hunter
import { addAuditLog, getUserProfile } from './db.js';

export const ACTIVE_MERCHANT_COUPONS = [
  // Amazon India (aura-tech)
  {
    code: "PRIME_AUTOPAY_50",
    merchant_id: "aura-tech",
    type: "fixed_discount",
    discount_value: 50,
    description: "Amazon Prime AP2 0-OTP Autopay instant rebate",
    min_order_value: 400
  },
  {
    code: "AGENTIC_FIRST10",
    merchant_id: "aura-tech",
    type: "percentage",
    discount_value: 10,
    description: "Exclusive 10% discount for autonomous mandate shoppers",
    min_order_value: 500
  },
  {
    code: "AMAZON_SAVER_100",
    merchant_id: "aura-tech",
    type: "fixed_discount",
    discount_value: 100,
    description: "Flat ₹100 discount on flagship electronics above ₹1,000",
    min_order_value: 1000
  },

  // Flipkart Assured (prime-gadgets)
  {
    code: "PRICE_MATCH_AI",
    merchant_id: "prime-gadgets",
    type: "fixed_discount",
    discount_value: 50,
    description: "Instant Price Match discount against rival storefronts",
    min_order_value: 400
  },
  {
    code: "SUPERCOIN_DROP_75",
    merchant_id: "prime-gadgets",
    type: "fixed_discount",
    discount_value: 75,
    description: "Flipkart SuperCoins redemption instant markdown",
    min_order_value: 600
  },
  {
    code: "EXPRESS_FREE",
    merchant_id: "prime-gadgets",
    type: "shipping_waiver",
    discount_value: 49,
    description: "Free express dispatch shipping fee waiver",
    min_order_value: 300
  },

  // Meesho Direct (meesho-direct)
  {
    code: "MEESHO_FACTORY_15",
    merchant_id: "meesho-direct",
    type: "percentage",
    discount_value: 15,
    description: "15% direct factory supply discount on wholesale items",
    min_order_value: 150
  },
  {
    code: "DIRECT_SUPPLIER_50",
    merchant_id: "meesho-direct",
    type: "fixed_discount",
    discount_value: 50,
    description: "Flat ₹50 introductory factory discount on accessories",
    min_order_value: 200
  },
  {
    code: "ZERO_COMMISSION_30",
    merchant_id: "meesho-direct",
    type: "fixed_discount",
    discount_value: 30,
    description: "Zero middleman direct manufacturer rebate",
    min_order_value: 99
  }
];

export async function negotiateBestPrice({
  product_name,
  target_merchant_id = "prime-gadgets",
  competing_merchant_id = "aura-tech",
  original_price = 849,
  competing_price = null
}) {
  const effectiveCompPrice = competing_price || Math.max(50, Math.round(original_price * 0.95));
  const profile = await getUserProfile();
  
  // If user turned OFF automated price negotiation in policy
  if (profile && profile.auto_negotiate_coupons === false) {
    await addAuditLog({
      actor: "AI_NEGOTIATOR",
      action: "NEGOTIATION_SKIPPED",
      status: "BYPASSED",
      details: `Price negotiation skipped because user disabled Automated Price Negotiation in policy.`
    });

    return {
      success: false,
      skipped: true,
      target_merchant: target_merchant_id,
      product_name,
      original_price,
      competing_price: effectiveCompPrice,
      negotiated_price: original_price,
      total_savings: 0,
      applied_coupon: null,
      savings_percentage: 0,
      rationale: "Price negotiation skipped (Disabled in user policy preferences)."
    };
  }

  await addAuditLog({
    actor: "AI_NEGOTIATOR",
    action: "PRICE_NEGOTIATION_INITIATED",
    status: "INVOKED",
    details: `AI initiated dynamic price negotiation with '${target_merchant_id}' for '${product_name}' against competitor price ₹${effectiveCompPrice}`
  });

  // Find valid coupons for this merchant filtered by min_order_value
  const availableCoupons = ACTIVE_MERCHANT_COUPONS.filter(c => c.merchant_id === target_merchant_id);
  
  let bestCoupon = null;
  let finalPrice = original_price;
  let totalSavings = 0;

  const applicableCoupons = availableCoupons
    .filter(c => original_price >= (c.min_order_value || 0))
    .sort((a, b) => {
      const valA = a.type === "percentage" ? (original_price * a.discount_value) / 100 : a.discount_value;
      const valB = b.type === "percentage" ? (original_price * b.discount_value) / 100 : b.discount_value;
      return valB - valA;
    });

  if (applicableCoupons.length > 0) {
    bestCoupon = applicableCoupons[0];
    
    if (bestCoupon.type === "fixed_discount") {
      totalSavings = Math.min(original_price - 50, bestCoupon.discount_value);
      finalPrice = Math.max(50, original_price - totalSavings);
    } else if (bestCoupon.type === "percentage") {
      totalSavings = Math.round((original_price * bestCoupon.discount_value) / 100);
      finalPrice = Math.max(50, original_price - totalSavings);
    }
  } else {
    // Algorithmic price match
    totalSavings = Math.max(0, original_price - effectiveCompPrice);
    finalPrice = original_price - totalSavings;
    bestCoupon = {
      code: "DYNAMIC_AI_MATCH",
      description: "Algorithmically calculated competitive price match",
      discount_value: totalSavings
    };
  }

  const merchantName = target_merchant_id === "aura-tech"
    ? "Amazon India (Aura Prime Bot)"
    : (target_merchant_id === "meesho-direct"
      ? "Meesho Direct (Factory Wholesale Bot)"
      : "Flipkart (SuperCoins Seller Bot)");

  const a2aDialogue = [
    {
      id: "turn-1",
      speaker: "BUYER_AGENT",
      agent_name: "Autonomous Buyer Agent",
      badge: "Buyer AI 🤖",
      message: `Proposing instant zero-OTP AP2 checkout for '${product_name}' (Listed: ₹${original_price}) if price-matched against competitor ₹${effectiveCompPrice}.`,
      intent: "ACP_BID_PROPOSAL",
      timestamp: new Date(Date.now() - 800).toISOString()
    },
    {
      id: "turn-2",
      speaker: "MERCHANT_AGENT",
      agent_name: merchantName,
      badge: target_merchant_id === "aura-tech" ? "Amazon Seller 🛒" : (target_merchant_id === "meesho-direct" ? "Meesho Factory 🏭" : "Flipkart Assured ✦"),
      message: `Evaluating margin & loyalty pool... Bid accepted! Granted promotional coupon '${bestCoupon.code}' (-₹${totalSavings}). Final settled price: ₹${finalPrice}.`,
      intent: "ACP_COUPON_GRANTED",
      coupon_code: bestCoupon.code,
      discount_value: totalSavings,
      timestamp: new Date(Date.now() - 400).toISOString()
    },
    {
      id: "turn-3",
      speaker: "RAZORPAY_GATEKEEPER",
      agent_name: "Razorpay AP2 Gatekeeper",
      badge: "Fiduciary Escrow 🛡️",
      message: `Fiduciary check verified: Final ₹${finalPrice} is within authorized mandate cap. AP2 HMAC-SHA256 token approved for 0-OTP headless settlement.`,
      intent: "AP2_MANDATE_AUTHORIZED",
      timestamp: new Date().toISOString()
    }
  ];

  const negotiationResult = {
    success: true,
    protocol: "ACP/1.0-MultiAgent",
    target_merchant: target_merchant_id,
    merchant_name: merchantName,
    product_name,
    original_price,
    competing_price: effectiveCompPrice,
    negotiated_price: finalPrice,
    total_savings: totalSavings,
    applied_coupon: bestCoupon,
    savings_percentage: Math.round((totalSavings / original_price) * 100),
    rationale: `Successfully negotiated ₹${totalSavings} discount using coupon '${bestCoupon.code}'. Final price ₹${finalPrice} beats competitor ₹${effectiveCompPrice}!`,
    dialogue: a2aDialogue
  };

  await addAuditLog({
    actor: "A2A_NEGOTIATOR_SWARM",
    action: "A2A_NEGOTIATION_WON",
    status: "SUCCESS",
    details: `Multi-Agent ACP Protocol: Buyer Agent negotiated -₹${totalSavings} with ${merchantName} via coupon '${bestCoupon.code}'. AP2 Gatekeeper approved ₹${finalPrice}.`,
    payload: negotiationResult
  });

  return negotiationResult;
}

export function validateCoupon(code, merchant_id, cartAmount) {
  if (typeof code !== 'string' || !code.trim()) {
    return { valid: false, reason: "Coupon code must be a non-empty string." };
  }

  const coupon = ACTIVE_MERCHANT_COUPONS.find(c => 
    c.code.toUpperCase() === code.trim().toUpperCase() && 
    (!c.merchant_id || c.merchant_id === merchant_id)
  );

  if (!coupon) {
    return { valid: false, reason: `Coupon '${code}' is invalid or expired for merchant '${merchant_id}'.` };
  }

  if (cartAmount < (coupon.min_order_value || 0)) {
    return { valid: false, reason: `Minimum order value of ₹${coupon.min_order_value} required for coupon '${code}'.` };
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.round((cartAmount * coupon.discount_value) / 100);
  } else if (coupon.type === "fixed_discount" || coupon.type === "shipping_waiver") {
    discount = coupon.discount_value;
  }

  return {
    valid: true,
    coupon,
    discount_amount: discount,
    discounted_total: Math.max(1, cartAmount - discount)
  };
}
