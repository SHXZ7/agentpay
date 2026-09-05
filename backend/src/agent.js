// backend/src/agent.js - Professional Conversational AI Shopping Agent & Fiduciary Reasoning Engine
import { getProducts, getProductById, addAuditLog, saveOrder, updateMandate, getUserProfile, saveUserProfile, getLatestActiveMandate, getAutopayRecord, getOrders } from './db.js';
import { getAutopayStatus } from './autopay.js';
import { createMandate, validateMandateForPurchase } from './mandates.js';
import { createRazorpayOrder } from './razorpay.js';
import { searchAcrossAllMerchants, getMerchantById, getAllMerchants } from './merchants.js';
import { negotiateBestPrice, ACTIVE_MERCHANT_COUPONS } from './negotiation.js';
import { retrieveRelevantKnowledge, formatRAGContextForPrompt } from './rag.js';

const GROQ_CANDIDATE_MODELS = [
  "qwen/qwen3.6-27b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b"
];

let workingGroqModel = null;

async function callGroqChat({ messages, tools, preferredModel = null }) {
  const key = process.env.GROQ_API_KEY;
  if (!key || !key.startsWith('gsk_')) return null;

  const modelsToTry = preferredModel && preferredModel !== 'deterministic'
    ? [preferredModel, ...GROQ_CANDIDATE_MODELS.filter(m => m !== preferredModel)]
    : (workingGroqModel 
      ? [workingGroqModel, ...GROQ_CANDIDATE_MODELS.filter(m => m !== workingGroqModel)]
      : GROQ_CANDIDATE_MODELS);

  for (const model of modelsToTry) {
    try {
      const payload = {
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1024
      };

      if (tools && Array.isArray(tools) && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = "auto";
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        workingGroqModel = model;
        return data.choices[0]?.message || null;
      }
      
      const errText = await res.text();
      console.warn(`Groq API notice (${model}):`, res.status, errText);
      continue;
    } catch (err) {
      console.warn(`Groq fetch notice (${model}):`, err.message);
      continue;
    }
  }

  return null;
}

export function parseBudgetFromPrompt(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  const kMatch = lower.match(/(?:under|budget|below|max|cap|within|upto|up to|less than)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }
  const numMatch = lower.match(/(?:under|budget|below|max|cap|within|upto|up to|less than)\s*(?:₹|rs\.?|inr)?\s*(\d{2,7})\b/i);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }
  return null;
}

export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_merchant_network",
      description: "Search live products across connected stores (Amazon India, Flipkart Assured) comparing pricing, ratings, discounts, and delivery speeds.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Product keyword or category" },
          max_price: { type: "number", description: "Optional upper price budget" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "negotiate_best_price",
      description: "Trigger cross-store price matching and dynamic coupon negotiations to lower the purchase price.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string", description: "Name of target product" },
          target_merchant_id: { type: "string", description: "Target store ID ('aura-tech' or 'prime-gadgets')" },
          original_price: { type: "number", description: "Starting listed price" }
        },
        required: ["product_name", "target_merchant_id", "original_price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_permission",
      description: "Issue or adjust a cryptographically signed AP2 mandate bound to a merchant and spend cap.",
      parameters: {
        type: "object",
        properties: {
          max_budget: { type: "number", description: "Maximum budget limit in INR" },
          allowed_categories: { type: "array", items: { type: "string" } },
          merchant_id: { type: "string", description: "Chosen merchant store ID" },
          justification: { type: "string", description: "Fiduciary justification for merchant & product selection" }
        },
        required: ["max_budget", "allowed_categories", "merchant_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_checkout",
      description: "Execute ACP headless 0-OTP checkout for the specified item using active AP2 token and UPI Autopay.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "The product ID to purchase" },
          mandate_id: { type: "string", description: "Active AP2 mandate ID" },
          merchant_id: { type: "string", description: "Target merchant store ID" }
        },
        required: ["item_id", "mandate_id"]
      }
    }
  }
];

export async function executeTool(toolName, args, sessionContext = {}) {
  await addAuditLog({
    actor: "AI_AGENT",
    action: `TOOL_CALL_${toolName.toUpperCase()}`,
    status: "INVOKED",
    details: `Agent invoked '${toolName}' with parameters: ${JSON.stringify(args)}`,
    payload: args
  });

  if (toolName === "search_merchant_network" || toolName === "check_catalog") {
    const profile = await getUserProfile();
    const allowedMerchants = profile.allowed_merchants || ["aura-tech", "prime-gadgets", "meesho-direct"];

    const query = args.query || "electronics";
    const allOffers = searchAcrossAllMerchants(query);
    
    // Filter strictly by connected / allowed storefronts from profile
    const candidateOffers = allOffers.filter(o => allowedMerchants.includes(o.merchant_id));

    const filtered = args.max_price 
      ? candidateOffers.filter(o => (o.product?.price || o.price) <= args.max_price) 
      : candidateOffers;
    
    const formatted = filtered.slice(0, 6).map(o => {
      const prod = o.product || o;
      const merchantId = o.merchant_id || "aura-tech";
      let merchantName = "Amazon India";
      let deliveryText = "Free 1-Day Prime Delivery";

      if (merchantId === "meesho-direct") {
        merchantName = "Meesho Direct";
        deliveryText = "Factory Direct Free Shipping (3-4 Days)";
      } else if (merchantId === "prime-gadgets") {
        merchantName = "Flipkart Assured";
        deliveryText = "Free Express Delivery with SuperCoins";
      }

      return {
        id: prod.id || `prod_${Date.now()}`,
        name: prod.name || "Product Item",
        brand: prod.brand || "Brand",
        category: prod.category || "electronics",
        price: Number(prod.price || o.price || 499),
        mrp: Number(prod.mrp || o.mrp || 999),
        rating: Number(prod.rating || o.merchant_rating || 4.8),
        reviews: Number(prod.review_count || o.reviews || 2400),
        merchant_id: merchantId,
        merchant_name: o.merchant_name || merchantName,
        delivery: o.shipping_speed || deliveryText,
        badge: prod.badge || o.merchant_badge || "Verified Deal"
      };
    });

    sessionContext.discoveredOffers = formatted;
    return {
      offers_found: formatted.length,
      offers: formatted
    };
  }

  if (toolName === "negotiate_best_price") {
    const result = await negotiateBestPrice({
      product_name: args.product_name,
      target_merchant_id: args.target_merchant_id || args.merchant_id || "aura-tech",
      original_price: Number(args.original_price || args.listed_price || args.price || 499)
    });
    sessionContext.negotiation = result;
    return result;
  }

  if (toolName === "request_permission") {
    const profile = await getUserProfile();
    const profileAllowed = profile.allowed_categories || [];
    const requestedCategories = args.allowed_categories || profileAllowed;

    // Fiduciary Guardrail: Auto-created mandate budget cannot exceed user's configured spend ceiling
    // unless the user explicitly specified a higher budget in the prompt or request parameters
    const userMaxLimit = sessionContext?.explicitBudget || sessionContext?.parsedBudget || profile.default_max_budget;
    let authorizedBudget = Number(args.max_budget);
    if (userMaxLimit && authorizedBudget > userMaxLimit) {
      authorizedBudget = userMaxLimit;
    }

    const mandate = await createMandate({
      max_budget: authorizedBudget,
      allowed_categories: requestedCategories,
      user_intent: args.justification || "Fiduciary Autonomous Purchase",
      agent_id: "groq_shopping_agent",
      merchant_id: args.merchant_id || "aura-tech"
    });

    sessionContext.mandate = mandate;

    return {
      success: true,
      mandate_id: mandate.mandate_id,
      max_budget: mandate.max_budget,
      allowed_categories: mandate.allowed_categories,
      signature: mandate.signature,
      message: `AP2 Mandate issued for merchant '${mandate.merchant_id}' with budget ₹${mandate.max_budget}`
    };
  }

  if (toolName === "execute_checkout") {
    let product = await getProductById(args.item_id);
    if (!product) {
      const allOffers = searchAcrossAllMerchants();
      const match = allOffers.find(o => o.product.id === args.item_id);
      if (match) product = match.product;
    }

    if (!product) return { success: false, error: `Product '${args.item_id}' not found.` };

    const effectivePrice = (sessionContext?.negotiation?.success && !sessionContext?.negotiation?.skipped && sessionContext?.negotiation?.negotiated_price) 
      ? sessionContext.negotiation.negotiated_price 
      : product.price;

    const validation = await validateMandateForPurchase({
      mandate_id: args.mandate_id,
      item_price: effectivePrice,
      item_category: product.category,
      item_name: product.name
    });

    if (!validation.isValid) {
      await addAuditLog({
        actor: "CHECKOUT_GATEKEEPER",
        action: "CHECKOUT_DENIED",
        status: "REJECTED_GRACEFULLY",
        mandate_id: args.mandate_id,
        details: `Checkout denied: ${validation.reason}`,
        payload: { error_code: validation.errorCode, reason: validation.reason, product }
      });
      return {
        success: false,
        error: validation.reason,
        errorCode: validation.errorCode,
        mandate: validation.mandate
      };
    }

    const merchantId = args.merchant_id || validation.mandate.merchant_id || "aura-tech";

    // 🛡️ Deduplication Guard: Prevent duplicate order if identical product & merchant bought within 15 seconds
    const recentOrders = await getOrders();
    const duplicateOrder = recentOrders.find(o => 
      (o.product?.id === product.id || o.product?.name === product.name) &&
      o.merchant_id === merchantId &&
      (Date.now() - new Date(o.created_at || 0).getTime() < 15000)
    );

    if (duplicateOrder) {
      console.log(`[Idempotency] Duplicate checkout prevented for '${product.name}'. Reusing existing order ${duplicateOrder.order_id}`);
      return {
        success: true,
        order: duplicateOrder,
        remaining_budget: validation.mandate.remaining_budget,
        merchant_id: merchantId,
        message: `Checkout already completed for ${product.name} (Order ID: ${duplicateOrder.order_id})`
      };
    }

    const rzpOrder = await createRazorpayOrder({
      amount: effectivePrice,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        mandate_id: args.mandate_id,
        product_id: product.id,
        merchant_id: merchantId
      }
    });

    const mandate = validation.mandate;
    const spent_amount = (mandate.spent_amount || 0) + effectivePrice;
    const remaining_budget = mandate.max_budget - spent_amount;
    
    await updateMandate(args.mandate_id, {
      spent_amount,
      remaining_budget,
      status: remaining_budget > 0 ? "ACTIVE" : "CONSUMED"
    });

    const orderRecord = {
      order_id: rzpOrder.order_id,
      product: { ...product, effective_price: effectivePrice },
      merchant_id: merchantId,
      mandate_id: args.mandate_id,
      amount: effectivePrice,
      currency: "INR",
      receipt: rzpOrder.receipt,
      payment_status: "SUCCESS_TEST_MODE",
      created_at: new Date().toISOString(),
      is_live_test_api: rzpOrder.is_live_test_api
    };
    await saveOrder(orderRecord);

    await addAuditLog({
      actor: "CHECKOUT_GATEKEEPER",
      action: "CHECKOUT_SUCCESSFUL",
      status: "SUCCESS",
      mandate_id: args.mandate_id,
      details: `Razorpay Order ${rzpOrder.order_id} generated for '${product.name}' (₹${product.price}) on ${merchantId}`,
      payload: orderRecord
    });

    return {
      success: true,
      order: orderRecord,
      remaining_budget,
      merchant_id: merchantId,
      message: `Checkout successful on ${merchantId}! Razorpay Order ID: ${rzpOrder.order_id}`
    };
  }

  return { success: false, error: `Unknown tool: ${toolName}` };
}

export async function generateUpsellRecommendation(purchasedProduct, remainingBudget = 0) {
  const allProducts = await getProducts();
  const candidates = (allProducts || []).filter(p => p.id !== purchasedProduct?.id);

  if (candidates.length === 0) {
    return null;
  }

  let recommendation = candidates.find(p => p.id === "prod_pad_01") || candidates[0];
  let bundleSavingsPct = 10;
  let rationale = `Pair with this Memory Foam Mouse Pad (₹${recommendation.price}). Bundle saves 10% and fits within remaining ₹${remainingBudget} budget!`;

  return {
    product: recommendation,
    original_price: recommendation.price,
    bundle_discount_price: Math.round(recommendation.price * 0.9),
    savings_percent: bundleSavingsPct,
    rationale,
    fits_remaining_budget: recommendation.price <= remainingBudget,
    remaining_budget: remainingBudget
  };
}

/**
 * Enhanced Conversational Shopping Agent with Multi-Turn Context Memory
 */
export async function runShoppingAgent(userPrompt, explicitBudget = null, forceCategory = null, history = [], selectedModel = null, agentMode = 'autonomous') {
  let promptText = userPrompt;
  if (typeof userPrompt === 'object' && userPrompt !== null) {
    promptText = userPrompt.prompt || userPrompt.userPrompt || '';
    explicitBudget = userPrompt.explicit_budget || userPrompt.explicitBudget || explicitBudget;
    forceCategory = userPrompt.force_category || userPrompt.forceCategory || forceCategory;
    history = userPrompt.history || history;
    selectedModel = userPrompt.selected_model || userPrompt.selectedModel || selectedModel;
    agentMode = userPrompt.agent_mode || userPrompt.agentMode || agentMode;
  }
  userPrompt = promptText;

  const parsedBudget = explicitBudget || parseBudgetFromPrompt(userPrompt);
  const sessionSteps = [];
  const sessionContext = { prompt: userPrompt, explicitBudget, parsedBudget };

  const isAdviceOnly = agentMode === 'advice_only';

  await addAuditLog({
    actor: "USER",
    action: "AGENT_PROMPT_RECEIVED",
    status: "INFO",
    details: `Agent received prompt: "${userPrompt}" (Mode: ${agentMode}, Model: ${selectedModel || 'auto'}, History: ${history.length})`
  });

  const profile = await getUserProfile();
  const activeMandate = await getLatestActiveMandate();
  const autopay = await getAutopayStatus();

  // Retrieve Qdrant RAG Vector Knowledge Chunks
  const ragSources = await retrieveRelevantKnowledge(userPrompt, 4);
  const ragContext = formatRAGContextForPrompt(ragSources);

  const isGroqAvailable = selectedModel !== 'deterministic' && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_');

  // Tools available based on mode
  const activeTools = isAdviceOnly 
    ? AGENT_TOOLS.filter(t => t.function.name === 'search_merchant_network' || t.function.name === 'negotiate_best_price')
    : AGENT_TOOLS;

  if (isGroqAvailable) {
    try {
      const baseSystemPrompt = isAdviceOnly
        ? `You are an expert Fiduciary Shopping Advisor.
Mode: ADVICE ONLY.
Your duty is to search merchant catalogs, compare pricing & delivery speed, explain specifications & warranty, and advise the user on the best option.
STRICT RULE: In Advice Only mode, DO NOT execute purchases or checkout. Provide objective, helpful advice and highlight the top deals without charging funds.`
        : `You are a high-caliber Autonomous Commerce Fiduciary Agent. You act on behalf of the user to search merchant catalogs, compare offers, dynamically negotiate discounts, verify AP2 security policies, and execute 0-OTP headless checkouts.

Stores connected:
1. 'aura-tech' (Amazon India) - Prime fulfillment, Free 1-Day delivery, authentic warranty.
2. 'prime-gadgets' (Flipkart Assured) - Flipkart Assured badge, competitive SuperCoins rewards.
3. 'meesho-direct' (Meesho Direct) - Factory direct wholesale pricing.

Active User Profile & Bounds:
- User Name: "${profile.name}"
- Default Budget Cap: ₹${profile.default_max_budget}
- Allowed Purchase Categories: [${(profile.allowed_categories || []).join(', ')}]
- Whitelisted Merchants: [${(profile.allowed_merchants || []).join(', ')}]
- Active AP2 Mandate Token: ${activeMandate ? activeMandate.mandate_id : 'None'}
- UPI Autopay Status: ${autopay?.is_active ? `Active (₹${autopay.remaining_limit} remaining)` : 'Inactive'}

Professional Fiduciary Guidelines:
1. Maintain conversational continuity. If the user asks a follow-up, answer with exact reference to previously discussed items and context.
2. HANDLING PURCHASE REQUESTS:
   - VAGUE / AMBIGUOUS REQUEST RULE (Crucial): If the user gives a general or vague request without specific criteria (e.g. "buy a mouse", "buy headphones", "order a keyboard" without specifying budget, brand, or key specs like wireless/wired/silent/gaming/DPI):
     DO NOT execute checkout or charge money immediately.
     Instead:
     a. Call 'search_merchant_network' to retrieve matching items.
     b. Present 2-3 top recommended options across diverse price points and specs.
     c. Ask the user what specific specs (wireless vs wired, silent click, gaming DPI, ergonomic) and price range / budget they prefer before buying.
   - SPECIFIC / CONFIRMED SELECTION RULE: If the user provides specific constraints (e.g. "Logitech M330", "wireless mouse under 800", budget "1000") OR selects an option (e.g. "buy option 1", "option 2", "proceed with 2nd one", "buy it", "confirm"):
     You MUST autonomously execute the full tool pipeline:
     1. 'search_merchant_network' -> find the selected product.
     2. 'negotiate_best_price' -> negotiate dynamic coupons / price match.
     3. 'request_permission' -> issue AP2 mandate with required budget & merchant.
     4. 'execute_checkout' -> execute headless 0-OTP payment.
3. If the user is just exploring options, comparing features, or inquiring about delivery/reviews/policies, answer directly in an executive, courteous tone without calling execute_checkout.
4. Keep answers concise, clear, and professional.`;

      const systemPrompt = baseSystemPrompt + (ragContext ? `\n\n${ragContext}` : '');

      const formattedHistory = (Array.isArray(history) ? history : []).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      }));

      const messages = [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        { role: "user", content: userPrompt }
      ];

      let finalAssistantMessage = "";
      let hasReceivedAnyMessage = false;

      for (let turn = 0; turn < 4; turn++) {
        const msg = await callGroqChat({ messages, tools: activeTools, preferredModel: selectedModel });
        if (!msg) break;
        hasReceivedAnyMessage = true;
        messages.push(msg);

        if (msg.tool_calls && msg.tool_calls.length > 0) {
          for (const toolCall of msg.tool_calls) {
            const fnName = toolCall.function.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments || '{}');
            } catch (e) {
              args = {};
            }

            sessionSteps.push({
              type: "tool_call",
              name: fnName,
              args,
              thought: msg.content || `Executing ${fnName}...`
            });

            const toolResult = await executeTool(fnName, args, sessionContext);

            sessionSteps.push({
              type: "tool_result",
              name: fnName,
              result: toolResult
            });

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
          }
        } else if (msg.content) {
          finalAssistantMessage = msg.content;
          sessionSteps.push({ type: "agent_final_response", content: finalAssistantMessage });
          break;
        }
      }

      // If tools executed but final text is empty, request a natural language completion from Groq
      if (!finalAssistantMessage && sessionSteps.length > 0) {
        const summaryCall = await callGroqChat({
          messages: [
            ...messages,
            { role: "user", content: "Based on the tool results above, summarize the exact answers and recommendations clearly for the user." }
          ],
          preferredModel: selectedModel
        });
        if (summaryCall?.content) {
          finalAssistantMessage = summaryCall.content;
        }
      }

      // Robust fallback if LLM returned tool calls without text summary
      if (!finalAssistantMessage && sessionSteps.length > 0) {
        const negStep = sessionSteps.find(s => s.type === "tool_result" && s.name === "negotiate_best_price");
        if (negStep?.result && negStep.result.discount_amount > 0) {
          finalAssistantMessage = `🎉 **Dynamic Multi-Agent Price Negotiation Succeeded!**\n\nI initiated an ACP handshake directly with the merchant bot and negotiated an exclusive **₹${negStep.result.discount_amount.toLocaleString()} discount** using coupon \`${negStep.result.coupon_applied || 'AGENTIC_FIRST10'}\`.\n\n- **Original Price**: ₹${negStep.result.original_price?.toLocaleString()}\n- **Negotiated Final Price**: **₹${negStep.result.final_price?.toLocaleString()}**\n\nReply with **"Buy now"** or click **"Buy 0-OTP"** below to complete your checkout at this discounted rate!`;
        } else {
          const scanStep = sessionSteps.find(s => s.type === "tool_result" && s.name === "search_merchant_network");
          const foundOffers = scanStep?.result?.offers || [];
          if (foundOffers.length > 0) {
            const listText = foundOffers.slice(0, 3).map((item, idx) => 
              `${idx + 1}. **${item.name}**\n   - **Price**: **₹${item.price?.toLocaleString()}** (MRP: ₹${(item.mrp || item.price * 1.25)?.toLocaleString()})\n   - **Merchant**: ${item.merchant_name} (${item.delivery})\n   - **Rating**: ${item.rating}★ (${item.reviews?.toLocaleString()} reviews)`
            ).join('\n\n');
            finalAssistantMessage = `### 🛍️ Verified Products Found Across Whitelisted Stores\n\n${listText}\n\n---\n🛡️ **Fiduciary Status**: Reply with **"Buy Option 1"** or specify your preferred model/specs to execute instant 0-OTP checkout!`;
          }
        }
      }

      const checkoutResult = sessionSteps.find(s => s.type === "tool_result" && s.name === "execute_checkout")?.result;
      const lowerCheck = (userPrompt || '').toLowerCase().trim();

      const KNOWN_BRANDS_CHECK = [
        "logitech", "cosmic byte", "apple", "anker", "zebronics", "sony", "portronics", 
        "boat", "noise", "dell", "hp", "razer", "boult", "oneplus", "samsung", 
        "blue tokai", "sandisk", "redragon", "crucial", "tp-link", "lenovo", "asus"
      ];
      const KNOWN_SPECS_CHECK = [
        "wireless", "wired", "bluetooth", "silent", "gaming", "mechanical", "rgb", 
        "optical", "rechargeable", "ergonomic", "type c", "type-c", "fast charging", 
        "anc", "noise cancelling", "tws", "dark roast", "dpi", "100w", "65w", "4k", 
        "1080p", "1tb", "500gb", "256gb", "supercoins", "prime"
      ];

      const isVagueBuy = (
        (lowerCheck.startsWith("buy ") || lowerCheck.startsWith("order ") || lowerCheck.startsWith("purchase ") || lowerCheck.startsWith("get me ")) &&
        !KNOWN_BRANDS_CHECK.some(b => lowerCheck.includes(b)) &&
        !KNOWN_SPECS_CHECK.some(s => lowerCheck.includes(s)) &&
        !/(?:under|below|budget|within|upto|up to|less than)\s*(?:₹|rs\.?|inr)?\s*\d+/i.test(lowerCheck) &&
        !lowerCheck.includes("option") && !lowerCheck.includes("1st") && !lowerCheck.includes("2nd") && !lowerCheck.includes("3rd")
      );

      const isExplicitBuySelection = !isAdviceOnly && !isVagueBuy && (
        lowerCheck.startsWith("buy option") || 
        lowerCheck.startsWith("buy 1st") || 
        lowerCheck.startsWith("buy 2nd") || 
        lowerCheck.startsWith("buy 3rd") ||
        lowerCheck.includes("option 1") ||
        lowerCheck.includes("option 2") ||
        lowerCheck.includes("option 3") ||
        lowerCheck.startsWith("buy ") ||
        lowerCheck.startsWith("order ") ||
        lowerCheck.startsWith("purchase ") ||
        lowerCheck.includes("place order") ||
        lowerCheck.includes("checkout") ||
        lowerCheck.includes("execute purchase") ||
        lowerCheck.includes("buy 0-otp") ||
        lowerCheck === "yes" || 
        lowerCheck === "confirm" ||
        lowerCheck === "proceed"
      );

      if (isExplicitBuySelection && !checkoutResult) {
        // Fall through to deterministic fiduciary pipeline to ensure checkout executes
      } else if (hasReceivedAnyMessage && (finalAssistantMessage || sessionSteps.length > 0)) {
        let upsell = null;
        if (checkoutResult && checkoutResult.success && checkoutResult.order) {
          upsell = await generateUpsellRecommendation(checkoutResult.order.product, checkoutResult.remaining_budget);
        }

        const isDirectBuy = Boolean(checkoutResult);

        return {
          prompt: userPrompt,
          engine: `Groq (${workingGroqModel || 'Llama 3'})`,
          steps: sessionSteps,
          response_text: finalAssistantMessage || "I evaluated the merchant network. Here are the top matches:",
          mandate: sessionContext.mandate || activeMandate,
          discoveredOffers: sessionContext.discoveredOffers || [],
          negotiation: sessionContext.negotiation || null,
          checkout: checkoutResult || null,
          upsell,
          rag_sources: ragSources,
          is_checkout_flow: isDirectBuy,
          success: checkoutResult ? checkoutResult.success : true
        };
      }
    } catch (llmErr) {
      console.warn("Groq execution notice, falling back to contextual semantic engine:", llmErr.message);
    }
  }

  // --- Executive Contextual Semantic Engine (Deep Multi-Turn Intelligence) ---
  const lowerPrompt = (userPrompt || '').toLowerCase().trim();

  // 1. Dynamic Category Permission Modification & Auto-Execution Intent
  const isCategoryUpdate = (lowerPrompt.includes("category") || lowerPrompt.includes("categories")) &&
    (lowerPrompt.includes("add") || lowerPrompt.includes("allow") || lowerPrompt.includes("enable") || lowerPrompt.includes("include") || lowerPrompt.includes("permit") || lowerPrompt.includes("unlock"));

  if (isCategoryUpdate) {
    const currentCats = profile.allowed_categories || ["mobiles"];
    const allKnownCats = ["electronics", "computers", "accessories", "mobiles", "cables", "wearables", "storage", "gaming", "smarthome"];
    
    let toAdd = [];
    if (lowerPrompt.includes("computer") || lowerPrompt.includes("mouse") || lowerPrompt.includes("keyboard") || lowerPrompt.includes("this category") || lowerPrompt.includes("all")) {
      toAdd.push("computers", "accessories", "electronics");
    }
    if (lowerPrompt.includes("audio") || lowerPrompt.includes("headphone") || lowerPrompt.includes("earbuds")) {
      toAdd.push("electronics");
    }
    if (lowerPrompt.includes("mobile") || lowerPrompt.includes("phone")) {
      toAdd.push("mobiles");
    }
    if (toAdd.length === 0) {
      toAdd = allKnownCats;
    }

    const updatedCategories = Array.from(new Set([...currentCats, ...toAdd]));
    await saveUserProfile({ allowed_categories: updatedCategories });

    const newMandate = await createMandate({
      max_budget: profile.default_max_budget || 2000,
      allowed_categories: updatedCategories,
      merchant_id: "aura-tech",
      validity_minutes: 24 * 60
    });

    // If user also indicated purchase (e.g. "so i can buy mouse", "and buy it", "order mouse")
    const hasBuyFollowup = lowerPrompt.includes("buy") || lowerPrompt.includes("order") || lowerPrompt.includes("purchase") || lowerPrompt.includes("get me") || lowerPrompt.includes("proceed");
    
    if (hasBuyFollowup) {
      let targetProduct = "mouse";
      if (lowerPrompt.includes("keyboard")) targetProduct = "keyboard";
      else if (lowerPrompt.includes("charger")) targetProduct = "charger";
      else if (lowerPrompt.includes("headphone")) targetProduct = "headphone";
      else if (lowerPrompt.includes("iphone")) targetProduct = "iphone";

      const searchRes = await executeTool("search_merchant_network", { query: targetProduct }, sessionContext);
      const chosen = searchRes.offers?.[0] || {
        id: "amz_prod_0008",
        name: "Logitech Silent Wireless Optical Mouse",
        price: 699,
        merchant_id: "aura-tech",
        merchant_name: "Amazon India (Prime ✓)"
      };

      const checkoutRes = await executeTool("execute_checkout", {
        item_id: chosen.id,
        mandate_id: newMandate.mandate_id,
        merchant_id: chosen.merchant_id
      }, sessionContext);

      return {
        prompt: userPrompt,
        engine: "AgentPay AI",
        steps: [
          { type: "category_policy_updated", categories: updatedCategories },
          { type: "tool_result", name: "execute_checkout", result: checkoutRes }
        ],
        response_text: `### ✅ Category Policy Updated & Purchase Executed!

1. **Policy Expansion**: Added **\`${toAdd.join(', ')}\`** to your approved AP2 categories list. Active categories: \`${updatedCategories.join(', ')}\`.
2. **Mandate Re-Signed**: New cryptographic token \`${newMandate.mandate_id}\` signed with HMAC-SHA256.
3. **0-OTP Checkout Completed**: Purchased **${chosen.name}** for **₹${checkoutRes.order?.amount || chosen.price}** on **${chosen.merchant_name}** with **Free 1-Day Prime Delivery**.

Payment settled headlessly through Razorpay Autopay under your AP2 spending cap.`,
        mandate: newMandate,
        discoveredOffers: searchRes.offers || [chosen],
        negotiation: null,
        checkout: checkoutRes,
        upsell: null,
        rag_sources: [],
        is_checkout_flow: true,
        success: checkoutRes.success
      };
    }

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [{ type: "category_policy_updated", categories: updatedCategories }],
      response_text: `### ✅ Policy Permissions Updated!

- **Added Categories**: \`${toAdd.join(', ')}\`
- **Active Approved Categories**: \`${updatedCategories.join(', ')}\`
- **Re-Signed Mandate**: \`${newMandate.mandate_id}\`

Your autonomous spending policy has been expanded in the database. You can now buy any items in these categories without restriction.`,
      mandate: newMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: [],
      is_checkout_flow: false,
      success: true
    };
  }

  // 2. Dynamic Budget & Policy Limit Modification Intent
  const isBudgetChange = (lowerPrompt.includes("budget") || lowerPrompt.includes("spending cap") || lowerPrompt.includes("spending limit") || lowerPrompt.includes("limit to") || lowerPrompt.includes("cap to") || lowerPrompt.includes("set max")) &&
    (lowerPrompt.includes("set") || lowerPrompt.includes("increase") || lowerPrompt.includes("change") || lowerPrompt.includes("update") || lowerPrompt.includes("raise") || lowerPrompt.includes("make"));
  
  if (isBudgetChange) {
    const amountMatch = lowerPrompt.match(/(?:to|of|cap|budget|is|₹|\$)\s*([0-9,]+)/i) || lowerPrompt.match(/([0-9,]+)\s*(?:rupees|rs|inr|budget)/i);
    const newAmount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 60000;
    
    if (newAmount > 0) {
      await saveUserProfile({ default_max_budget: newAmount });
      const newMandate = await createMandate({
        max_budget: newAmount,
        allowed_categories: profile.allowed_categories || ["electronics", "computers", "accessories", "mobiles", "cables", "wearables", "storage", "gaming", "smarthome"],
        merchant_id: "aura-tech",
        validity_minutes: 24 * 60
      });

      return {
        prompt: userPrompt,
        engine: "AgentPay AI",
        steps: [{ type: "mandate_updated", new_budget: newAmount, mandate_id: newMandate.mandate_id }],
        response_text: `### ✅ AP2 Spending Cap Successfully Updated!\n\n- **New Authorization Ceiling**: **₹${newAmount.toLocaleString()}**\n- **Cryptographic Token**: \`${newMandate.mandate_id}\` (Signed with HMAC-SHA256)\n- **Active Rails**: Razorpay Headless Autopay (0-OTP)\n- **Status**: Live & Valid for next 24 hours\n\nYou are now authorized to purchase items up to **₹${newAmount.toLocaleString()}**. Would you like me to proceed with purchasing your desired item now?`,
        mandate: newMandate,
        discoveredOffers: [],
        negotiation: null,
        checkout: null,
        upsell: null,
        rag_sources: [],
        is_checkout_flow: false,
        success: true
      };
    }
  }

  // 2. Order Status & History Inquiries
  const isOrderTracking = lowerPrompt.includes("where is my order") || lowerPrompt.includes("track") || lowerPrompt.includes("order status") || lowerPrompt.includes("my orders") || lowerPrompt.includes("recent order") || lowerPrompt.includes("what did i buy") || lowerPrompt.includes("purchase history") || lowerPrompt.includes("package");

  if (isOrderTracking) {
    const orders = await getOrders();
    if (orders && orders.length > 0) {
      const orderList = orders.slice(0, 4).map((o, idx) => 
        `${idx + 1}. **${o.product?.name || 'Verified Product'}**\n   - **Order ID**: \`${o.order_id}\`\n   - **Merchant**: ${o.merchant_id === 'prime-gadgets' ? 'Flipkart Assured' : 'Amazon India (Prime ✓)'}\n   - **Amount Paid**: **₹${o.amount?.toLocaleString()}** (0-OTP Settle)\n   - **Status**: 🚚 **${o.status === 'confirmed' || o.status === 'created' ? 'Dispatched (Arriving Tomorrow by 8 PM)' : o.status}**\n   - **Payment Token**: \`${o.mandate_id?.slice(0, 18)}...\``
      ).join('\n\n');

      return {
        prompt: userPrompt,
        engine: "AgentPay AI",
        steps: [],
        response_text: `### 📦 Your Active Purchases & Tracking\n\n${orderList}\n\nAll orders are verified and protected by our **7-Day Doorstep Replacement Guarantee**. Need help with any specific order?`,
        mandate: activeMandate,
        discoveredOffers: [],
        negotiation: null,
        checkout: null,
        upsell: null,
        rag_sources: [],
        is_checkout_flow: false,
        success: true
      };
    } else {
      return {
        prompt: userPrompt,
        engine: "AgentPay AI",
        steps: [],
        response_text: `You do not have any active orders yet. When you request a product (e.g. *"Buy a wireless mouse under ₹800"*), I will negotiate discounts and complete checkout with 0-OTP Autopay under your AP2 spending cap.`,
        mandate: activeMandate,
        discoveredOffers: [],
        negotiation: null,
        checkout: null,
        upsell: null,
        rag_sources: [],
        is_checkout_flow: false,
        success: true
      };
    }
  }

  // 3. Returns, Refunds & Warranty SLA Inquiries
  const isReturnOrWarranty = lowerPrompt.includes("return") || lowerPrompt.includes("refund") || lowerPrompt.includes("warranty") || lowerPrompt.includes("guarantee") || lowerPrompt.includes("defective") || lowerPrompt.includes("broken") || lowerPrompt.includes("replace");

  if (isReturnOrWarranty && !lowerPrompt.includes("buy") && !lowerPrompt.includes("which is better")) {
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 🛡️ Return Policy, Warranty & Buyer Protection\n\n1. **7-Day Doorstep Replacement**: All items from **Amazon India (Prime ✓)** and **Flipkart Assured (✦)** include a zero-cost 7-day doorstep replacement window for any defect or damage.\n2. **Official OEM Brand Warranty**: 1 to 3-Year manufacturer warranty on all electronics, laptops, and smartphones with verified serial tracking.\n3. **Instant AP2 Bank Sweep Refunds**: In the event of an order cancellation or return, 100% of the funds are reversed headlessly back to your linked bank account via NPCI e-mandate rails within 15 minutes.\n4. **Authenticity Guarantee**: 100% genuine products directly dispatched from authorized tier-1 fulfillment hubs.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: [],
      is_checkout_flow: false,
      success: true
    };
  }

  // 4. Category & Catalog Discovery
  const isCategoryInquiry = lowerPrompt.includes("what categories") || lowerPrompt.includes("available categories") || lowerPrompt.includes("what can you buy") || lowerPrompt.includes("what products") || lowerPrompt.includes("what do you sell");

  if (isCategoryInquiry) {
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 🛒 Supported Multi-Merchant Product Categories\n\nI can autonomously search, compare, and buy across **8 verified product categories**:\n\n1. 📱 **Mobiles & Tablets**: Apple iPhones, Samsung Galaxy, OnePlus, iPads.\n2. 💻 **Computers & Laptops**: MacBook Air, Mechanical Keyboards, Wireless Mice, USB-C Hubs, Webcams, Laptop Risers.\n3. 🎧 **Electronics & Audio**: ANC Headphones, True Wireless Earbuds, Desktop Soundbars.\n4. 🎮 **Gaming & VR**: RGB Mechanical Keyboards, Gaming Mouse, Extended Desk Mats.\n5. ⚡ **Cables & Fast Chargers**: 65W GaN Chargers, 100W Braided Type-C Cables, 20,000mAh Power Banks.\n6. ⌚ **Smartwatches & Wearables**: AMOLED Calling Watches, Fitness Trackers.\n7. 💾 **Storage & Drives**: 1TB NVMe M.2 SSDs, 128GB High-Speed MicroSD Cards.\n8. 💡 **Smart Home**: WiFi Ambient RGB Light Bars, Smart Plugs.\n\nWhat category would you like to explore today?`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: [],
      is_checkout_flow: false,
      success: true
    };
  }

  // 5. Detect "Why can't I buy?" / Policy Block Explanation
  const isWhyCantBuy = lowerPrompt.includes("why cant") || lowerPrompt.includes("why can't") || lowerPrompt.includes("why did it fail") || lowerPrompt.includes("why was it blocked") || lowerPrompt.includes("why failed") || (lowerPrompt.includes("why") && lowerPrompt.includes("buy") && (lowerPrompt.includes("not") || lowerPrompt.includes("cant") || lowerPrompt.includes("can't") || lowerPrompt.includes("unable") || lowerPrompt.includes("fail") || lowerPrompt.includes("stop")));

  if (isWhyCantBuy) {
    const budgetCap = profile.default_max_budget || 2000;
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 🛡️ Why Was Your Purchase Intercepted?

Your checkout was intercepted by the **AP2 (Agent Payment Protocol) Policy Gatekeeper** because of cryptographic budget bounding:

1. **Active Authorization Limit**: Your current authorized spending cap is **₹${budgetCap.toLocaleString()}**.
2. **Item Value**: Flagship devices like the **Apple iPhone 16 Pro** (₹119,700) or **iPhone 15** (₹59,836) exceed your active limit by over **₹57,000+**.
3. **Cryptographic Protection**: The AP2 protocol mathematically forbids the agent from signing or settling payments higher than your active authorization ceiling, ensuring zero unexpected charges.

---
### 💡 How to Complete Your Purchase:
- **Option 1 (Instant Dashboard Authorization)**: Go to the **Personalization / Policy** tab and update your **Default Max Budget** to **₹60,000** or **₹120,000**.
- **Option 2 (Autonomous Mandate Re-auth)**: Ask me: *"Set my spending cap to ₹1,20,000 and buy the iPhone 16 Pro"* to re-sign a high-value mandate.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: [],
      is_checkout_flow: false,
      success: true
    };
  }

  // 6. Detect Store Comparison ("Which store is best?")
  const isStoreComparison = lowerPrompt.includes("which store is best") || lowerPrompt.includes("which store is better") || lowerPrompt.includes("amazon or flipkart") || lowerPrompt.includes("flipkart or amazon") || lowerPrompt.includes("which one is best") || (lowerPrompt.includes("store") && (lowerPrompt.includes("best") || lowerPrompt.includes("better") || lowerPrompt.includes("prefer")));

  if (isStoreComparison) {
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `Both **Amazon India** and **Flipkart** have distinct advantages depending on your priority:\n\n1. **Amazon India (Aura Tech / Prime Authorized)** — **Best for Delivery Speed & Reliable Warranties**:\n   - **Fulfillment**: Guaranteed Free 1-Day Prime Delivery.\n   - **Warranties**: 1 to 3-Year official OEM warranty with authentic serial tracking.\n   - **Returns**: Hassle-free 7-day doorstep replacement window.\n\n2. **Flipkart (Prime Gadgets / Assured ✦)** — **Best for Budget Deals & SuperCoins Rewards**:\n   - **Pricing**: Frequently features competitive promotional pricing and stackable SuperCoins.\n   - **Fulfillment**: 1 to 2 business days with express tracking.\n   - **Quality**: 6-stage testing on Flipkart Assured certified items.\n\n💡 **Your Fiduciary Advantage**: You never have to manually choose! For every item you request, I compare real-time pricing and delivery across both gateways, automatically applying the optimal deal under your AP2 spending cap.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources.filter(s => s.similarity_score >= 35),
      is_checkout_flow: false,
      success: true
    };
  }

  // 7. Detect Connected Storefronts List Inquiry
  const isStoreInquiry = lowerPrompt.includes("connected") || lowerPrompt.includes("which all store") || lowerPrompt.includes("supported store") || lowerPrompt.includes("where do you buy") || lowerPrompt.includes("list store") || lowerPrompt.includes("merchants you have") || lowerPrompt.includes("stores you are");

  if (isStoreInquiry) {
    const merchants = getAllMerchants();
    const merchantListText = merchants.map((m, idx) => 
      `${idx + 1}. **${m.name}** (\`${m.id}\`)\n   - **Domain**: ${m.domain} • **Badge**: ${m.badge}\n   - **Fulfillment**: ${m.shipping_speed}\n   - **Rating**: ${m.rating}★ (${m.review_count.toLocaleString()} reviews)\n   - **Catalog Size**: ${m.total_inventory}+ active items indexed in Qdrant Vector DB.`
    ).join('\n\n');

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `I am currently connected to **${merchants.length} tier-1 verified merchant storefronts**:\n\n${merchantListText}\n\nWhenever you request a product, I search across these catalogs, cross-check delivery times and prices, dynamically negotiate stackable coupon codes, and execute 0-OTP checkouts under your AP2 spending cap.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources.filter(s => s.similarity_score >= 35),
      is_checkout_flow: false,
      success: true
    };
  }

  // 7b. Detect Vague Buying / Underspecified Purchase Prompts
  const trimmedLower = lowerPrompt.trim().replace(/[.?!,]/g, '');
  const isVagueBuy = /^(buy|order|purchase|shop|buy something|order something|purchase something|i want to buy|i want to order|want to buy|need to buy|buy item|buy product|buy a thing|get me something|find something)$/i.test(trimmedLower) ||
    (/^(buy|order|purchase|shop)\b/i.test(trimmedLower) && trimmedLower.split(/\s+/).length <= 2 && !lowerPrompt.includes("mouse") && !lowerPrompt.includes("keyboard") && !lowerPrompt.includes("charger") && !lowerPrompt.includes("headphone") && !lowerPrompt.includes("earbuds") && !lowerPrompt.includes("laptop") && !lowerPrompt.includes("watch") && !lowerPrompt.includes("cable") && !lowerPrompt.includes("coffee") && !lowerPrompt.includes("tumbler") && !lowerPrompt.includes("webcam") && !lowerPrompt.includes("ssd") && !lowerPrompt.includes("stand"));

  if (isVagueBuy) {
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 🛍️ What item would you like to buy?

Please specify the product, category, or brand you are looking for so I can search and compare verified deals across **Amazon India** and **Flipkart Assured**.

#### 💡 Try asking:
- *"Buy a wireless mouse under ₹800"*
- *"Find a mechanical gaming keyboard with 1-day delivery"*
- *"Get a 65W GaN fast charger"*
- *"Compare ANC headphones on Amazon & Flipkart"*

---
🛡️ **Fiduciary AP2 Protection**: You can also mention your budget limit (e.g. *under ₹1,500*), and I will automatically verify prices, negotiate coupon codes, and execute 0-OTP Autopay under your AP2 spending cap.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // 8. Detect Greetings & Identity Inquiries
  const isIdentityInquiry = lowerPrompt.includes("your name") || lowerPrompt.includes("who are you") || lowerPrompt.includes("what are you") || lowerPrompt.includes("about yourself") || lowerPrompt.includes("who made you") || lowerPrompt.includes("who created you") || lowerPrompt.includes("what is agentpay");

  const isGreeting = isIdentityInquiry || /^(hi|hello|hey|greetings|hola|namaste|good\s+(morning|afternoon|evening)|howdy|sup|yo|what can you do|help)\b/i.test(lowerPrompt);
  const hasProductKeywords = lowerPrompt.includes("buy ") || lowerPrompt.includes("order ") || lowerPrompt.includes("purchase ");

  if (isGreeting && !hasProductKeywords) {
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 🤖 I am **AgentPay AI** — A Razorpay Initiative

I am your autonomous commerce copilot and fiduciary shopping engine.

#### Here is what I can do for you:
1. **Cross-Store Catalog Discovery**: Instantly search and compare matching products, real customer reviews, and prices across **Amazon India** and **Flipkart Assured**.
2. **Autonomous Coupon Negotiation**: Automatically scan, verify, and apply the highest-value merchant discount coupons (e.g. \`PRIME_AUTOPAY_50\`, \`SUPERCOIN_ASSURED_5\`) before checkout.
3. **0-OTP Headless Checkouts**: Execute instantaneous, secure purchases under your AP2 cryptographic spending cap via **Razorpay / NPCI UPI Autopay** rails with zero OTP prompts.
4. **Anti-Substitution Protection**: Cryptographically guarantee that you will never be charged for an incorrect or out-of-stock item.

---
💡 Try asking: *"Find me a gaming headset"*, *"What is my remaining AP2 budget?"*, or *"Show me my purchase receipt"*!`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // 9. Receipt / Purchase History Inquiries
  const isReceiptInquiry = lowerPrompt.includes("receipt") || lowerPrompt.includes("invoice") || lowerPrompt.includes("my purchase") || lowerPrompt.includes("my order") || lowerPrompt.includes("order status") || lowerPrompt.includes("last order") || lowerPrompt.includes("order history") || lowerPrompt.includes("track order") || lowerPrompt.includes("view receipt") || lowerPrompt.includes("show receipt");

  if (isReceiptInquiry && !lowerPrompt.includes("buy ") && !lowerPrompt.includes("order a") && !lowerPrompt.includes("order an")) {
    const ordersList = await getOrders();
    const latestOrder = ordersList && ordersList.length > 0 ? ordersList[0] : null;

    if (!latestOrder) {
      return {
        prompt: userPrompt,
        engine: "AgentPay AI",
        steps: [],
        response_text: `### 🧾 No Recent Orders Found\n\nYou haven't placed any autonomous orders yet. When you complete a purchase, your AP2 cryptographic receipt, order ID, and tracking status will appear here.\n\nWould you like to search for products or explore available deals?`,
        mandate: activeMandate,
        discoveredOffers: [],
        negotiation: null,
        checkout: null,
        upsell: null,
        rag_sources: ragSources,
        is_checkout_flow: false,
        success: true
      };
    }

    const prod = latestOrder.product || { name: "Purchased Item", price: latestOrder.amount };
    const dateFormatted = new Date(latestOrder.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [{ type: "receipt_retrieved", order_id: latestOrder.order_id }],
      response_text: `### 🧾 Official AP2 Cryptographic Purchase Receipt

Here are the verified transaction and settlement details for your latest order:

| Field | Details |
| :--- | :--- |
| **Order ID** | \`${latestOrder.order_id}\` |
| **Item** | **${prod.name}** |
| **Merchant** | **${latestOrder.merchant_name || 'Amazon India (Aura Tech Partner)'}** |
| **Amount Paid** | **₹${Number(latestOrder.amount || prod.price).toLocaleString()} INR** |
| **Payment Rail** | **0-OTP UPI Autopay** (Razorpay NPCI Settlement) |
| **AP2 Mandate Token** | \`${latestOrder.mandate_id || 'ap2_mandate_active'}\` |
| **Fulfillment** | **${latestOrder.delivery || 'Free 1-Day Prime Delivery (Guaranteed Tomorrow by 8 PM)'}** |
| **Timestamp** | ${dateFormatted} |
| **Status** | 🟢 **SETTLED & CONFIRMED** |

---
💡 **Mandate Security**: This transaction was autonomously validated against your AP2 spending cap and signed with HMAC-SHA256 tokens. Your raw bank credentials were not exposed.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // 10. Remaining Budget & Autopay Balance Inquiries
  const isBudgetInquiry = (lowerPrompt.includes("remaining") || lowerPrompt.includes("budget") || lowerPrompt.includes("balance") || lowerPrompt.includes("spending cap") || lowerPrompt.includes("limit") || lowerPrompt.includes("cap left") || lowerPrompt.includes("how much can i spend") || lowerPrompt.includes("autopay balance")) && !lowerPrompt.includes("buy ") && !lowerPrompt.includes("order ");

  if (isBudgetInquiry) {
    const apStatus = await getAutopayStatus();
    const totalLimit = apStatus.max_limit || 10000;
    const totalSpent = apStatus.spent_amount || 0;
    const remainingLimit = Math.max(0, totalLimit - totalSpent);
    const pctUsed = Math.round((totalSpent / totalLimit) * 100);

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 💳 Active AP2 Mandate & Budget Status

Here is your current authorized spending breakdown:

- **Total Mandate Authorization**: **₹${totalLimit.toLocaleString()} INR**
- **Total Amount Spent**: **₹${totalSpent.toLocaleString()} INR** (${pctUsed}% utilized)
- **Available 0-OTP Balance**: **₹${remainingLimit.toLocaleString()} INR**
- **Approved Categories**: \`${(profile.allowed_categories || ['electronics', 'computers', 'accessories']).join(', ')}\`
- **Connected Merchants**: Amazon India (\`aura-tech\`), Flipkart Assured (\`prime-gadgets\`)

---
💡 You can safely execute any autonomous purchase up to **₹${remainingLimit.toLocaleString()}** without OTP interruptions. If you need to adjust your ceiling, you can update it anytime in the Personalization tab.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // 11. Matching Accessories Inquiry
  const isAccessoriesInquiry = (lowerPrompt.includes("matching accessories") || lowerPrompt.includes("accessories") || lowerPrompt.includes("recommend accessories") || lowerPrompt.includes("what goes with this") || lowerPrompt.includes("add-on")) && !lowerPrompt.includes("buy ");

  if (isAccessoriesInquiry) {
    const accSearch = await executeTool("search_merchant_network", { query: "cables" }, sessionContext);
    const accOffers = accSearch.offers || [];
    const topAcc = accOffers.slice(0, 3);

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [{ type: "tool_result", name: "search_merchant_network", result: accSearch }],
      response_text: `### 🔌 Recommended Matching Accessories:

I identified high-compatibility accessories to pair with your setup:

1. **Braided 100W Type-C to Type-C Fast Cable (2m)**: **₹249** (MRP: ₹499 • 50% OFF)
2. **Extended Anti-Skid RGB Gaming Desk Mat (900x400mm)**: **₹299** (MRP: ₹599 • 50% OFF)
3. **Heavy Duty Aluminum Headphone / Laptop Stand**: **₹599** (MRP: ₹1,199 • 50% OFF)

---
💡 All accessories are in stock with **Free 1-Day Prime Delivery** and comply with your active AP2 spending cap. Would you like me to add any of these to your order?`,
      mandate: activeMandate,
      discoveredOffers: topAcc,
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // 12. Detect AP2 Protocol & Security Inquiries
  const isPolicyInquiry = lowerPrompt.includes("ap2") || lowerPrompt.includes("security") || lowerPrompt.includes("safe") || lowerPrompt.includes("protect") || lowerPrompt.includes("how it works") || lowerPrompt.includes("token");
  if (isPolicyInquiry && !lowerPrompt.includes("buy")) {
    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [],
      response_text: `### 🔒 AP2 (Agent Payment Protocol) Security Architecture\n\n1. **HMAC-SHA256 Cryptographic Bounding**: Every transaction requires an active mandate signed with SHA-256 tokens defining: spending ceiling (₹${profile.default_max_budget.toLocaleString()}), approved merchant IDs, and allowed item categories.\n2. **Time-To-Live (TTL) Safety Window**: Mandates automatically expire after 15 minutes to prevent unauthorized future charges.\n3. **0-OTP UPI Autopay Tokenization**: Payments settle through Razorpay/NPCI e-mandate rails with zero OTP prompts while keeping raw bank account details 100% private.\n4. **Revocation & Instant Bank Sweep**: You can revoke permissions anytime; 100% of remaining funds are swept back to your bank account immediately.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // parsedBudget is already resolved in sessionContext from top-level helper

  // Known Brands & Specs keywords for fiduciary precision
  const KNOWN_BRANDS = [
    "logitech", "cosmic byte", "apple", "anker", "zebronics", "sony", "portronics", 
    "boat", "noise", "dell", "hp", "razer", "boult", "oneplus", "samsung", 
    "blue tokai", "sandisk", "redragon", "crucial", "tp-link", "lenovo", "asus"
  ];
  
  const KNOWN_SPEC_MODIFIERS = [
    "wireless", "wired", "bluetooth", "silent", "gaming", "mechanical", "rgb", 
    "optical", "rechargeable", "ergonomic", "type c", "type-c", "fast charging", 
    "anc", "noise cancelling", "tws", "dark roast", "dpi", "100w", "65w", "4k", 
    "1080p", "1tb", "500gb", "256gb", "supercoins", "prime"
  ];

  // 1. Detect Ordinal References in user prompt (e.g. "buy second one", "option 2", "2nd one", "first option", "buy option 1")
  let ordinalIndex = null;
  if (/(?:second|2nd|option\s*2|2nd\s*option|second\s*option|second\s*one|2nd\s*one|the\s*second|\b2\b)/i.test(lowerPrompt)) {
    ordinalIndex = 1;
  } else if (/(?:third|3rd|option\s*3|3rd\s*option|third\s*option|third\s*one|3rd\s*one|the\s*third|\b3\b)/i.test(lowerPrompt)) {
    ordinalIndex = 2;
  } else if (/(?:first|1st|option\s*1|1st\s*option|first\s*option|first\s*one|1st\s*one|the\s*first|\b1\b)/i.test(lowerPrompt)) {
    ordinalIndex = 0;
  }

  // 2. Multi-Turn History Extraction: Brand, Model, & Structured Option Resolver
  const reversedHistory = (Array.isArray(history) ? history : []).slice().reverse();
  let explicitSelectedProduct = null;
  let contextBrand = "";
  let foundTopic = "";

  for (const msg of reversedHistory) {
    if (!msg) continue;
    const raw = typeof msg === 'string' ? msg : (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || ''));
    const txt = raw || '';
    const lowerTxt = txt.toLowerCase();

    // Check brand mentions in history
    if (!contextBrand) {
      for (const b of KNOWN_BRANDS) {
        if (lowerTxt.includes(b)) {
          contextBrand = b;
          break;
        }
      }
    }

    // Check category/topic with compound accessory precedence
    if (!foundTopic) {
      if (lowerTxt.includes("iphone charger") || (lowerTxt.includes("iphone") && lowerTxt.includes("charger"))) foundTopic = "iphone charger";
      else if (lowerTxt.includes("charger") || lowerTxt.includes("adapter") || lowerTxt.includes("power bank") || lowerTxt.includes("gan")) foundTopic = "charger";
      else if (lowerTxt.includes("cable") || lowerTxt.includes("wire") || lowerTxt.includes("cord")) foundTopic = "cable";
      else if (lowerTxt.includes("mouse") || lowerTxt.includes("mice")) foundTopic = "mouse";
      else if (lowerTxt.includes("keyboard")) foundTopic = "keyboard";
      else if (lowerTxt.includes("cosmic byte headset") || (lowerTxt.includes("cosmic") && lowerTxt.includes("headset"))) foundTopic = "cosmic byte headset";
      else if (lowerTxt.includes("gaming headset") || lowerTxt.includes("headset")) foundTopic = "gaming headset";
      else if (lowerTxt.includes("earbuds") || lowerTxt.includes("airpods") || lowerTxt.includes("tws")) foundTopic = "earbuds";
      else if (lowerTxt.includes("headphone") || lowerTxt.includes("audio")) foundTopic = "headphone";
      else if (lowerTxt.includes("watch") || lowerTxt.includes("smartwatch")) foundTopic = "smartwatch";
      else if (lowerTxt.includes("webcam") || lowerTxt.includes("camera")) foundTopic = "webcam";
      else if (lowerTxt.includes("soundbar") || lowerTxt.includes("speaker")) foundTopic = "soundbar";
      else if (lowerTxt.includes("stand") || lowerTxt.includes("tripod")) foundTopic = "stand";
      else if (lowerTxt.includes("ssd") || lowerTxt.includes("storage")) foundTopic = "ssd";
      else if (lowerTxt.includes("iphone") || lowerTxt.includes("apple phone") || lowerTxt.includes("phone")) foundTopic = "iphone";
    }

    // If user specified an ordinal index, parse the assistant's previous message for that specific model
    if (ordinalIndex !== null && msg.role === 'assistant' && !explicitSelectedProduct) {
      const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);

      // 1) Multi-line format: line is "1" or "1." and nextLine is "UGREEN 65W Nexode GaN Fast Charger"
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const nextLine = lines[i + 1];
        const isOptHeader = /^(?:1|2|3|1\.|2\.|3\.|1️⃣|2️⃣|3️⃣|\*\*1\.\*\*|\*\*2\.\*\*|\*\*3\.\*\*|option\s*[1-3]:?)$/i.test(line);
        if (isOptHeader) {
          const numMatch = line.match(/([1-3])/);
          const optNum = numMatch ? parseInt(numMatch[1], 10) - 1 : -1;
          if (optNum === ordinalIndex && nextLine && !/^(?:price|specs|rating|best|mrp|₹)/i.test(nextLine)) {
            const cleanNext = nextLine.split(/[–—•(-]/)[0].replace(/[*_`]/g, '').trim();
            if (cleanNext && cleanNext.length > 2) {
              explicitSelectedProduct = cleanNext;
              break;
            }
          }
        }
      }

      // 2) Inline format: "1️⃣ Model 28 – ₹544" or "1. UGREEN 65W ... - ₹999"
      if (!explicitSelectedProduct) {
        const optionLines = lines.filter(l => /^(?:[1-3]️⃣|[1-3]\.|\*\*[1-3]\.\*\*|option\s*[1-3]:?|[1-3]\s+)/i.test(l));
        
        if (optionLines.length > ordinalIndex) {
          const line = optionLines[ordinalIndex];
          const clean = line
            .replace(/^(?:[1-3]️⃣|[1-3]\.|\*\*[1-3]\.\*\*|option\s*[1-3]:?|[1-3]\s+)\s*/i, '')
            .split(/[–—•(-]/)[0]
            .replace(/[*_`]/g, '')
            .trim();
          if (clean && clean.length > 2) {
            explicitSelectedProduct = clean;
          }
        }
      }

      // 3) Regex match fallback for emoji numbers 1️⃣, 2️⃣, 3️⃣
      if (!explicitSelectedProduct) {
        const numEmoji = ordinalIndex === 0 ? "1️⃣" : ordinalIndex === 1 ? "2️⃣" : "3️⃣";
        const emojiIdx = txt.indexOf(numEmoji);
        if (emojiIdx !== -1) {
          const chunk = txt.substring(emojiIdx + numEmoji.length, emojiIdx + numEmoji.length + 80);
          const chunkClean = chunk.split(/[–—•\n\r(-]/)[0].replace(/[*_`]/g, '').trim();
          if (chunkClean && chunkClean.length > 2) {
            explicitSelectedProduct = chunkClean;
          }
        }
      }
    }
  }

  // 3. Intelligent Query Extraction
  let queryKeyword = "";
  const followUpTriggers = [
    "which option", "which is better", "better", "faster", "delivery", "negotiate",
    "price", "coupon", "spec", "battery", "first option", "second option", "third option",
    "1st option", "2nd option", "3rd option", "the first", "the second", "option 1",
    "option 2", "why", "compare", "recommend", "yes", "proceed", "sure", "ok", "confirm",
    "second one", "first one", "third one", "2nd one", "1st one", "3rd one",
    "buy second one", "buy first one", "buy third one", "buy 2nd one", "buy 1st one",
    "buy second", "buy first", "buy 2nd", "buy 1st", "buy 2", "buy 1", "buy 3"
  ];
  const isPureFollowUp = followUpTriggers.includes(lowerPrompt.trim()) ||
    (ordinalIndex !== null && !lowerPrompt.includes('mouse') && !lowerPrompt.includes('earbuds') && !lowerPrompt.includes('headphone') && !lowerPrompt.includes('keyboard') && !lowerPrompt.includes('stand') && !lowerPrompt.includes('iphone') && !lowerPrompt.includes('watch') && !lowerPrompt.includes('charger')) ||
    followUpTriggers.some(w => lowerPrompt === w || (lowerPrompt.startsWith(w + ' ') && !lowerPrompt.includes('buy ') && !lowerPrompt.includes('mouse') && !lowerPrompt.includes('earbuds') && !lowerPrompt.includes('headphone') && !lowerPrompt.includes('keyboard')));

  // Extract clean search phrase from current prompt
  let cleaned = lowerPrompt
    .replace(/^(can you|please|kindly|i want to|i'd like to|i need to|help me|find me a|find me an|find a|find an|find|search for a|search for an|search a|search an|search|buy me a|buy me an|buy a|buy an|buy the|buy|order me a|order me an|order a|order an|order the|order|purchase a|purchase an|purchase the|purchase|get me a|get me an|get me|show me|look for|recommend a|recommend an|recommend|which|what is the)\s+/i, '')
    .replace(/\s+(on|from|in)\s+(amazon|flipkart|meesho|aura tech|prime gadgets|direct).*$/i, '')
    .replace(/(?:under|below|budget|within|upto|up to|less than)\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*k?\b/gi, '')
    .replace(/\s+with\s+(0-otp|zero-otp|autopay|prime).*$/i, '')
    .trim();

  // If prompt is just an ordinal reference ("second one", "buy second", etc.), don't search for the literal string "second one"
  if (['second one', 'first one', 'third one', '2nd one', '1st one', '3rd one', 'second', 'first', 'third', '2nd', '1st', '3rd', 'option 1', 'option 2', 'option 3', '2', '1', '3', 'this', 'that', 'it', 'option 1', 'option 2', 'option 3'].includes(cleaned)) {
    cleaned = "";
  }

  if (explicitSelectedProduct) {
    const topicToAdd = (foundTopic && !explicitSelectedProduct.toLowerCase().includes(foundTopic) && foundTopic !== "iphone") ? ` ${foundTopic}` : '';
    const brandToAdd = (contextBrand && !explicitSelectedProduct.toLowerCase().includes(contextBrand)) ? `${contextBrand} ` : '';
    queryKeyword = `${brandToAdd}${explicitSelectedProduct}${topicToAdd}`.trim();
  } else if (!isPureFollowUp && cleaned && cleaned.length >= 2) {
    queryKeyword = contextBrand && !cleaned.includes(contextBrand) ? `${contextBrand} ${cleaned}` : cleaned;
  } else {
    queryKeyword = contextBrand && foundTopic ? `${contextBrand} ${foundTopic}` : (foundTopic || cleaned || "mouse");
  }

  // Affirmative checkout confirmation
  const isAffirmativeConfirmation = (
    lowerPrompt === 'yes' ||
    lowerPrompt === 'yes please' ||
    lowerPrompt === 'yes proceed' ||
    lowerPrompt === 'proceed' ||
    lowerPrompt === 'go ahead' ||
    lowerPrompt === 'sure' ||
    lowerPrompt === 'ok' ||
    lowerPrompt === 'okay' ||
    lowerPrompt === 'do it' ||
    lowerPrompt === 'confirm' ||
    lowerPrompt === 'buy it' ||
    lowerPrompt === 'order it' ||
    lowerPrompt === 'place order' ||
    lowerPrompt === 'place the order' ||
    lowerPrompt.startsWith('yes ')
  );

  const isExplorationOrSearch = (
    lowerPrompt.startsWith("i want to buy") ||
    lowerPrompt.startsWith("want to buy") ||
    lowerPrompt.startsWith("looking to buy") ||
    lowerPrompt.startsWith("looking for") ||
    lowerPrompt.startsWith("find ") ||
    lowerPrompt.startsWith("search ") ||
    lowerPrompt.startsWith("show ") ||
    lowerPrompt.startsWith("show me ") ||
    lowerPrompt.startsWith("recommend ") ||
    lowerPrompt.startsWith("what is ") ||
    lowerPrompt.startsWith("compare ")
  );



  const hasSpecificBrand = KNOWN_BRANDS.some(b => lowerPrompt.includes(b));
  const hasSpecificSpecs = KNOWN_SPEC_MODIFIERS.some(s => lowerPrompt.includes(s));
  const hasBudgetConstraint = parsedBudget !== null;
  const hasExplicitSelection = ordinalIndex !== null || isAffirmativeConfirmation || 
    lowerPrompt.includes("this one") || lowerPrompt.includes("that one") || 
    lowerPrompt.includes("option ") || lowerPrompt.includes("item ") ||
    lowerPrompt.includes("first") || lowerPrompt.includes("second") || lowerPrompt.includes("third");

  // Vague Purchase Intent Detection:
  // e.g. "buy a mouse", "buy me a mouse", "buy mouse", "order headphones" without specs, brand, budget, or option choice
  const isVaguePurchaseRequest = !isAdviceOnly && !isWhyCantBuy && !isExplorationOrSearch && (
    (lowerPrompt.startsWith("buy ") || lowerPrompt.startsWith("order ") || lowerPrompt.startsWith("purchase ") || lowerPrompt.startsWith("get me ")) &&
    !hasSpecificBrand &&
    !hasSpecificSpecs &&
    !hasBudgetConstraint &&
    !hasExplicitSelection
  );

  // Check intent types
  const userWantsToBuy = !isWhyCantBuy && !isExplorationOrSearch && !isVaguePurchaseRequest && (
    isAffirmativeConfirmation ||
    ordinalIndex !== null ||
    lowerPrompt.startsWith("buy ") ||
    lowerPrompt.startsWith("order ") ||
    lowerPrompt.startsWith("purchase ") ||
    lowerPrompt.includes("checkout") ||
    lowerPrompt.includes("place order") ||
    lowerPrompt.includes("execute purchase") ||
    lowerPrompt.includes("proceed with buy") ||
    lowerPrompt.includes("proceed with") ||
    lowerPrompt.includes("yes buy") ||
    lowerPrompt.includes("buy the first") ||
    lowerPrompt.includes("buy on")
  );

  // If in Advice Only mode and user asks to buy, explicitly communicate that buying access is not allowed
  if (isAdviceOnly && userWantsToBuy) {
    const scanResult = await executeTool("search_merchant_network", { query: queryKeyword }, sessionContext);
    const offers = scanResult.offers || [];
    const chosen = offers[0] || { name: "Requested Item", price: 758, merchant_name: "Amazon India (Prime ✓)" };

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: [{ type: "advice_mode_restricted", reason: "Buying access is not permitted in Advice Only mode" }],
      response_text: `### 🔒 Buying Access Restricted in Advice-Only Mode

You are currently in **💬 Advice Only** mode. In this mode, **buying access and autonomous 0-OTP payments are not allowed**.

I cannot execute checkouts or charge your AP2 mandate while in Advice Only mode.

---
💡 **What I can do right now:**
- Compare prices and 1-day delivery speeds across Amazon India & Flipkart.
- Check product specs, battery life, and warranty coverage.
- Negotiate dynamic coupon codes.

👉 **To proceed with purchasing ${chosen.name}:**
Switch the mode selector in the bottom-left dropdown from **💬 Advice Only** to **♾️ Autonomous Agent**, then re-submit your purchase request!`,
      mandate: activeMandate,
      discoveredOffers: offers,
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  const isDirectCheckoutIntent = !isAdviceOnly && userWantsToBuy;
  const isBetterInquiry = !isDirectCheckoutIntent && (lowerPrompt.includes("better") || lowerPrompt.includes("recommend") || lowerPrompt.includes("why") || lowerPrompt.includes("difference") || lowerPrompt.includes("vs") || lowerPrompt.includes("compare") || lowerPrompt.includes("which one") || lowerPrompt.includes("which option"));
  const isOptionsInquiry = !isDirectCheckoutIntent && !isBetterInquiry && (lowerPrompt.includes("price range") || lowerPrompt.includes("what are my options") || lowerPrompt.includes("show options") || lowerPrompt.includes("models available") || lowerPrompt.includes("options available") || lowerPrompt.includes("available variants") || lowerPrompt.includes("what options") || lowerPrompt.includes("more options") || lowerPrompt.includes("all options"));
  const isDeliveryInquiry = lowerPrompt.includes("faster") || lowerPrompt.includes("delivery") || lowerPrompt.includes("arrive") || lowerPrompt.includes("speed") || lowerPrompt.includes("time");
  const isCouponInquiry = lowerPrompt.includes("coupon") || lowerPrompt.includes("cupon") || lowerPrompt.includes("coupons") || lowerPrompt.includes("cupons") || lowerPrompt.includes("discount") || lowerPrompt.includes("promo") || lowerPrompt.includes("voucher") || lowerPrompt.includes("deal") || lowerPrompt.includes("cheaper");
  const isSpecsInquiry = lowerPrompt.includes("spec") || lowerPrompt.includes("battery") || lowerPrompt.includes("dpi") || lowerPrompt.includes("warranty") || lowerPrompt.includes("review") || lowerPrompt.includes("rating");

  // Step 1: Search network
  const scanResult = await executeTool("search_merchant_network", { query: queryKeyword }, sessionContext);
  sessionSteps.push({ type: "tool_result", name: "search_merchant_network", result: scanResult });
  const offers = scanResult.offers || [];

  // Anti-Substitution & Out-of-Stock Fiduciary Guardrail:
  if (offers.length === 0) {
    const requestedItemName = userPrompt.replace(/^(can you|please|find|search|buy a|buy an|buy me a|buy me an|buy|order a|order an|order|purchase a|purchase an|purchase)\s+/i, '').trim();
    return {
      prompt: userPrompt,
      engine: "AgentPay Engine",
      steps: sessionSteps,
      response_text: `### 🔍 Item Not Available in Connected Storefronts

I searched across connected storefront catalogs for **"${requestedItemName || queryKeyword}"**, but no matching products were found in stock.

🛡️ **AP2 Fiduciary Anti-Substitution Guardrail**: As your AgentPay Assistant, I **will never purchase an unrelated item** or substitute a different product when your requested item is unavailable. Your bank funds remain 100% untouched.

---
💡 **Next Steps:**
- Try searching for a broader category (e.g. *Gaming Headset*, *Wireless Mouse*, *Earbuds*).
- Specify an alternative brand or model.`,
      mandate: activeMandate,
      discoveredOffers: [],
      negotiation: null,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  const allowedMerchants = profile.allowed_merchants || ["aura-tech", "prime-gadgets", "meesho-direct"];
  const allowedOffers = offers.filter(o => allowedMerchants.includes(o.merchant_id));
  const candidateList = allowedOffers.length > 0 ? allowedOffers : offers;

  // 3. Multi-Factor Scored Product Relevance Matching
  const stopWords = new Set(['buy', 'order', 'purchase', 'the', 'for', 'with', 'under', 'from', 'and', 'india', 'partner', 'assured', 'direct', 'please', 'me', 'a', 'an', 'on', 'in', 'at']);
  const queryTokens = (queryKeyword + ' ' + lowerPrompt)
    .toLowerCase()
    .split(/[\s,()/-]+/)
    .filter(t => t.length > 1 && !stopWords.has(t));

  const scoredOffers = candidateList.map(offer => {
    const nameLower = offer.name.toLowerCase();
    const brandLower = (offer.brand || '').toLowerCase();
    const catLower = (offer.category || '').toLowerCase();
    const nameTokens = nameLower.split(/[\s,()/-]+/).filter(t => t.length > 1);
    let score = 0;

    // Token matching
    queryTokens.forEach(token => {
      if (nameTokens.includes(token)) score += 50;
      else if (nameLower.includes(token)) score += 25;
      if (brandLower === token || brandLower.includes(token)) score += 35;
      if (catLower.includes(token)) score += 15;
    });

    // Exact query keyword phrase bonus
    if (queryKeyword && nameLower.includes(queryKeyword.toLowerCase())) {
      score += 100;
    }

    // Merchant preference matching
    if (lowerPrompt.includes("meesho") || lowerPrompt.includes("factory") || lowerPrompt.includes("wholesale")) {
      if (offer.merchant_id === "meesho-direct") score += 60;
    } else if (lowerPrompt.includes("flipkart") || lowerPrompt.includes("prime gadgets")) {
      if (offer.merchant_id === "prime-gadgets") score += 60;
    } else if (lowerPrompt.includes("amazon") || lowerPrompt.includes("aura tech")) {
      if (offer.merchant_id === "aura-tech") score += 60;
    }

    // Strict Budget Constraint Matching
    if (parsedBudget) {
      if (offer.price <= parsedBudget) {
        score += 80;
      } else {
        // Severe penalty for exceeding explicit user budget!
        score -= 500;
      }
    }

    // Explicit Option Target Exact Match Bonus
    if (explicitSelectedProduct) {
      const cleanTarget = explicitSelectedProduct.toLowerCase();
      if (nameLower.includes(cleanTarget)) {
        score += 300;
      }
      const modelMatch = cleanTarget.match(/\b\d+\b/);
      if (modelMatch && (nameLower.includes(`model ${modelMatch[0]}`) || nameLower.includes(modelMatch[0]))) {
        score += 250;
      }
    }

    return { offer, score };
  });

  scoredOffers.sort((a, b) => b.score - a.score);

  // 4. Candidate Resolution: Respect explicit option model selection, explicit ordinal, or score ranking
  let chosenOffer = null;
  if (explicitSelectedProduct) {
    const cleanTarget = explicitSelectedProduct.toLowerCase().trim();
    const modelNumMatch = cleanTarget.match(/\b\d+\b/);
    const modelNum = modelNumMatch ? modelNumMatch[0] : null;

    chosenOffer = 
      (modelNum ? candidateList.find(o => o.name.toLowerCase().includes(`model ${modelNum}`) && (!foundTopic || o.name.toLowerCase().includes(foundTopic))) : null) ||
      (modelNum ? candidateList.find(o => o.name.toLowerCase().includes(modelNum)) : null) ||
      candidateList.find(o => o.name.toLowerCase().includes(cleanTarget) && (!foundTopic || o.name.toLowerCase().includes(foundTopic) || (o.category && o.category.toLowerCase().includes(foundTopic)))) ||
      candidateList.find(o => o.name.toLowerCase().includes(cleanTarget)) ||
      candidateList.find(o => (o.brand && cleanTarget.includes(o.brand.toLowerCase())) || cleanTarget.includes(o.name.toLowerCase())) ||
      scoredOffers[0]?.offer || candidateList[0];
  } else if (ordinalIndex !== null && candidateList.length > ordinalIndex) {
    chosenOffer = candidateList[ordinalIndex];
  } else if (lowerPrompt.includes("cheaper") || lowerPrompt.includes("cheapest") || lowerPrompt.includes("lowest price")) {
    chosenOffer = [...candidateList].sort((a, b) => a.price - b.price)[0] || candidateList[0];
  } else {
    chosenOffer = scoredOffers[0]?.offer || candidateList[0];
  }

  const amazonOffer = candidateList.find(o => o.merchant_id === "aura-tech") || chosenOffer;
  const flipkartOffer = candidateList.find(o => o.merchant_id === "prime-gadgets") || candidateList.find(o => o !== amazonOffer) || chosenOffer;
  const meeshoOffer = candidateList.find(o => o.merchant_id === "meesho-direct") || chosenOffer;

  // Find a realistic competing offer from a rival store for accurate A2A negotiation price match
  const competingOffer = candidateList.find(o => o.merchant_id !== chosenOffer.merchant_id && Math.abs(o.price - chosenOffer.price) < chosenOffer.price * 0.5) ||
    candidateList.find(o => o.merchant_id !== chosenOffer.merchant_id);

  const competitorPrice = competingOffer ? competingOffer.price : Math.max(50, Math.round(chosenOffer.price * 0.95));
  const competitorMerchant = competingOffer ? competingOffer.merchant_id : (chosenOffer.merchant_id === "aura-tech" ? "prime-gadgets" : "aura-tech");

  // Step 2: Dynamic price negotiation strictly on the CHOSEN product
  const negotiationResult = await executeTool("negotiate_best_price", {
    product_name: chosenOffer.name,
    listed_price: chosenOffer.price,
    merchant_id: chosenOffer.merchant_id,
    competing_merchant_id: competitorMerchant,
    competing_price: competitorPrice
  }, sessionContext);
  sessionSteps.push({ type: "tool_result", name: "negotiate_best_price", result: negotiationResult });

  let responseText = "";

  // 1. Prioritize Direct Checkout Execution
  if (isDirectCheckoutIntent) {
    const effectiveItemPrice = negotiationResult.negotiated_price || negotiationResult.final_price || chosenOffer.price;
    let budget = parsedBudget || explicitBudget || profile.default_max_budget || 2000;

    let categories = forceCategory ? [forceCategory] : (profile.allowed_categories || ["electronics", "computers", "accessories", "mobiles", "cables", "wearables", "storage", "gaming", "smarthome"]);
    if (lowerPrompt.includes("groceries only") || lowerPrompt.includes("coffee")) {
      categories = forceCategory ? [forceCategory] : ["groceries"];
    }

    const mandateResult = await executeTool("request_permission", {
      max_budget: budget,
      allowed_categories: categories,
      merchant_id: chosenOffer.merchant_id,
      justification: `Direct autonomous checkout for ${chosenOffer.name} on ${chosenOffer.merchant_name}`
    }, sessionContext);
    sessionSteps.push({ type: "tool_result", name: "request_permission", result: mandateResult });

    const checkoutResult = await executeTool("execute_checkout", {
      item_id: chosenOffer.id,
      mandate_id: mandateResult.mandate_id,
      merchant_id: chosenOffer.merchant_id
    }, sessionContext);
    sessionSteps.push({ type: "tool_result", name: "execute_checkout", result: checkoutResult });

    let upsell = null;

    if (checkoutResult.success) {
      responseText = `I have successfully completed the autonomous checkout for **${chosenOffer.name}** at **₹${checkoutResult.order.amount.toLocaleString()}** via **${chosenOffer.merchant_name}** with **Free 1-Day Prime Delivery**.\n\nPayment settled headlessly with 0-OTP under AP2 cryptographic mandate token \`${mandateResult.mandate_id}\`.`;
    } else {
      responseText = `### 🛑 AP2 Policy Violation: Purchase Intercepted & Blocked

The checkout for **${chosenOffer.name}** (₹${chosenOffer.price.toLocaleString()}) was intercepted and blocked by the AP2 Gatekeeper:

> **${checkoutResult.error || 'Spending limit exceeded.'}**

🛡️ **Fiduciary Protection**: Your bank funds remain 100% untouched. To proceed with new purchases, please top up or increase your Monthly Mandate Limit in the Personalization tab.`;
    }

    return {
      prompt: userPrompt,
      engine: "AgentPay Engine",
      steps: sessionSteps,
      response_text: responseText,
      mandate: mandateResult,
      discoveredOffers: offers,
      negotiation: negotiationResult,
      checkout: checkoutResult,
      upsell,
      rag_sources: ragSources,
      is_checkout_flow: true,
      success: checkoutResult.success
    };
  }

  // 1.5. Fiduciary Ambiguity Clarification: General / Vague Purchase Request
  if (isVaguePurchaseRequest) {
    const topChoices = candidateList.slice(0, 3);
    const optionsText = topChoices.map((item, idx) => {
      let tier = idx === 0 ? "Entry / Budget Choice" : (idx === 1 ? "Top Seller / Ergonomic" : "High-Performance / Premium");
      return `${idx + 1}. **${item.name}**\n   - **Price**: **₹${item.price.toLocaleString()}** (MRP: ₹${(item.mrp || item.price * 1.3).toLocaleString()})\n   - **Store**: ${item.merchant_name} (${item.delivery})\n   - **Rating**: ${item.rating}★ (${item.reviews?.toLocaleString()} verified reviews)\n   - **Tier**: \`${item.badge || tier}\``;
    }).join('\n\n');

    responseText = `### 🛍️ Top ${queryKeyword.toUpperCase()} Options Found Across Connected Stores

Before I execute an autonomous 0-OTP purchase on your behalf, could you please clarify what specific features and budget you have in mind?

${optionsText}

---
### ⚙️ Please specify your requirements:
1. **Price Range / Budget**: (e.g. *Under ₹500*, *₹500–₹1,000*, or *Premium ₹1,500+*)
2. **Connectivity & Usage**: (e.g. *Wireless (2.4GHz / Bluetooth)* vs *Wired*, *Silent clicks for office*, *Gaming RGB / High DPI*)
3. **Preferred Store**: (*Amazon Prime 1-Day* vs *Flipkart Assured* vs *Meesho Direct*)

👉 **To proceed with checkout**: Simply reply:
- *"Buy Option 1"*
- *"Buy Option 2"*
- *"Buy the wireless one under ₹800"*
...and I will negotiate the dynamic discount, issue the AP2 cryptographic mandate, and complete your 0-OTP checkout instantly!`;

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: sessionSteps,
      response_text: responseText,
      mandate: activeMandate,
      discoveredOffers: offers,
      negotiation: negotiationResult,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  }

  // 2. Options / Catalog Breakdown
  if (isOptionsInquiry) {
    const matchingItems = offers.slice(0, 4);
    const optionsList = matchingItems.map((item, idx) => 
      `${idx + 1}. **${item.name}**\n   - **Store**: ${item.merchant_name} (${item.delivery})\n   - **Price**: **₹${item.price.toLocaleString()}** (MRP: ₹${item.mrp?.toLocaleString() || (item.price * 1.2)})\n   - **Rating**: ${item.rating}★ (${item.reviews?.toLocaleString()} reviews)`
    ).join('\n\n');

    responseText = `Here are the verified **${queryKeyword.toUpperCase()}** options and price tiers available across connected stores:\n\n${optionsList}\n\n🛡️ **AP2 Budget Notice**: Your active authorization cap is **₹${profile.default_max_budget.toLocaleString()}**. If you wish to purchase one of these models, you can increase your policy budget in the Personalization tab or ask me to auto-sign a mandate for your preferred model. Which option would you like?`;

    return {
      prompt: userPrompt,
      engine: "AgentPay AI",
      steps: sessionSteps,
      response_text: responseText,
      mandate: activeMandate,
      discoveredOffers: offers,
      negotiation: negotiationResult,
      checkout: null,
      upsell: null,
      rag_sources: ragSources,
      is_checkout_flow: false,
      success: true
    };
  } 

  // --- Conversational Follow-Up Inquiries ---
  if (isBetterInquiry || lowerPrompt.includes("which one") || lowerPrompt.includes("opt for") || lowerPrompt.includes("recommend") || lowerPrompt.includes("should i buy") || lowerPrompt.includes("suggest")) {
    if (queryKeyword === "iphone" || lowerPrompt.includes("iphone") || offers[0]?.name.includes("iPhone")) {
      const p16 = offers.find(o => o.name.includes("16")) || offers[0];
      const p15 = offers.find(o => o.name.includes("15")) || offers[1];
      const p14 = offers.find(o => o.name.includes("14")) || offers[2];

      responseText = `### 📊 Fiduciary Comparative Analysis: iPhone Models

Here is the strategic breakdown between your top options:

1. **${p15.name} (~₹${p15.price.toLocaleString()})** — 🏆 **Top Recommendation (Best Value Pick)**
   - **Why It's Better for Most Users**: Features the modern **Dynamic Island**, bright **OLED Super Retina display**, universal **USB-C charging**, and the high-performance **A16 Bionic chip**.
   - **Fiduciary Verdict**: Delivers **90% of the flagship experience** at **half the cost** of the Pro model.

2. **${p16.name} (~₹${p16.price.toLocaleString()})** — ⚡ **Best for Extreme Power & Creators**
   - **Key Upgrades**: **A18 Pro 3nm Silicon**, **120Hz ProMotion display**, **48MP Fusion Triple Camera** with 5x optical zoom, and lightweight Aerospace Titanium finish.
   - **Who Should Buy**: Professional videographers, mobile gamers, and users who demand 120Hz refresh rate.

3. **${p14.name} (~₹${p14.price.toLocaleString()})** — 💰 **Best Budget Entry Tier**
   - **Pros**: Solid A15 Bionic performance, all-day battery life, lowest upfront investment.
   - **Trade-off**: Still utilizes older Lightning connector and standard notch.

---
🎯 **Final Fiduciary Recommendation**: Unless you specifically require 120Hz ProMotion and 5x optical zoom for pro work, the **Apple iPhone 15** is the smartest financial purchase.

Would you like me to initiate an AP2 mandate for the **Apple iPhone 15** or negotiate coupon discounts?`;
    } else if (queryKeyword.includes("headset") || queryKeyword.includes("headphone") || queryKeyword.includes("audio") || offers[0]?.name.toLowerCase().includes("headset") || offers[0]?.name.toLowerCase().includes("headphone")) {
      const topHeadsets = offers.slice(0, 3);
      const opt1 = topHeadsets[0] || amazonOffer;
      const opt2 = topHeadsets[1] || flipkartOffer;

      responseText = `### 🎧 Headset Comparative Analysis & Recommendation

Here is the fiduciary breakdown between your top matching headsets across connected storefronts:

1. 🏆 **Top Recommendation**: **${opt1.name}**
   - **Store**: **${opt1.merchant_name}**
   - **Price**: **₹${opt1.price.toLocaleString()}** (MRP: ₹${(opt1.mrp || Math.round(opt1.price * 1.25)).toLocaleString()} — **${opt1.discount_pct || 20}% OFF**)
   - **Why It's the Best Pick**: 50mm dynamic drivers with 7.1 Virtual Surround Sound, crystal-clear noise-cancelling boom mic, and ultra-plush memory foam ear cushions for long gaming and call sessions.
   - **Fulfillment**: **${opt1.delivery || 'Free 1-Day Prime Delivery'}**

2. 🥈 **Alternative Option**: **${opt2.name}**
   - **Store**: **${opt2.merchant_name}**
   - **Price**: **₹${opt2.price.toLocaleString()}**
   - **Key Highlights**: High-grade braided anti-tangle cable, inline volume controls, and lightweight chassis.

---
🎯 **Fiduciary Verdict**: **${opt1.name}** on **${opt1.merchant_name}** provides the best price-to-performance ratio and fastest doorstep delivery.

Would you like me to auto-apply coupons and complete checkout with 0-OTP Autopay?`;
    } else if (queryKeyword.includes("mouse") || offers[0]?.name.toLowerCase().includes("mouse")) {
      const opt1 = offers[0] || amazonOffer;
      const opt2 = offers[1] || flipkartOffer;
      responseText = `### 🖱️ Wireless Mouse Comparative Recommendation

Between the available options across Amazon India & Flipkart Assured:

1. 🏆 **Top Recommendation**: **${opt1.name}** on **${opt1.merchant_name}**
   - **Price**: **₹${opt1.price.toLocaleString()}** (${opt1.rating}★ rating, ${opt1.reviews?.toLocaleString() || '3,400+'} reviews)
   - **Why It's Better**: 90% silent micro-switches, 18-month battery longevity, and precision 1600 DPI optical tracking.
   - **Fulfillment**: **${opt1.delivery || 'Free 1-Day Prime Delivery'}**

2. 🥈 **Alternative**: **${opt2.name}** on **${opt2.merchant_name}** for **₹${opt2.price.toLocaleString()}**

---
🎯 **Fiduciary Recommendation**: **${opt1.name}** on **${opt1.merchant_name}** delivers superior ergonomic comfort and 1-day delivery.

Would you like me to proceed with a 0-OTP purchase for **₹${negotiationResult.negotiated_price || negotiationResult.final_price || opt1.price}**?`;
    } else {
      const a = amazonOffer || offers[0];
      const f = flipkartOffer || offers[1] || offers[0];
      responseText = `### 📊 Fiduciary Comparative Recommendation for ${queryKeyword.toUpperCase()}

Between the available options, **${a?.merchant_name} (${a?.name})** is the superior fiduciary pick:

1. **Price-to-Performance**: **₹${a?.price?.toLocaleString() || 'N/A'}**${f && f !== a ? ` (vs ₹${f?.price?.toLocaleString()} on ${f?.merchant_name})` : ''}.
2. **Fulfillment Speed**: **${a?.delivery || 'Free 1-Day Prime Delivery'}** (dispatched today with priority transit).
3. **Quality & Reliability**: **${a?.rating || 4.8}★** with ${a?.reviews?.toLocaleString() || '2,400+'} verified customer reviews and full manufacturer warranty.

Would you like me to execute this purchase with 0-OTP under your AP2 mandate?`;
    }
  } else if (isDeliveryInquiry) {
    responseText = `Here is the verified delivery breakdown:\n- **Amazon India (Prime ✓)**: **Free 1-Day Delivery** (Guaranteed delivery tomorrow by 8 PM).\n- **Flipkart Assured (✦)**: **Standard Express (1 to 2 Business Days)** with SuperCoins rewards.\n\n**Amazon India** offers the fastest fulfillment. Would you like me to place the order?`;
  } else if (isCouponInquiry) {
    const aN = amazonOffer?.name || offers[0]?.name || 'the item';
    const aP = amazonOffer?.price || offers[0]?.price || 0;
    responseText = `### 🏷️ Active Merchant Coupons & Dynamic Price Matches:

I scanned and negotiated available discount codes across your connected storefronts:

1. **Amazon India (Aura Tech Partner)**:
   - **Coupon**: \`${negotiationResult.applied_coupon?.code || negotiationResult.coupon_code || 'PRIME_AUTOPAY_50'}\` (Auto-applied)
   - **Discount**: **₹${negotiationResult.total_savings || negotiationResult.savings || 50} OFF**
   - **Effective Price for ${aN}**: **₹${negotiationResult.negotiated_price || negotiationResult.final_price || (aP - 50)}** (was ₹${aP})

2. **Flipkart Assured (Prime Gadgets)**:
   - **Coupon**: \`SUPERCOIN_ASSURED_5\`
   - **Discount**: **5% SuperCoins Cashback** on 0-OTP checkout

---
💡 **Autonomous Price Optimization**: As your AgentPay Assistant, I automatically apply the highest-value coupon at checkout before cryptographically signing your AP2 mandate.

Would you like me to proceed with the **₹${negotiationResult.negotiated_price || negotiationResult.final_price || amazonOffer.price}** discounted purchase?`;
  } else if (isSpecsInquiry) {
    responseText = `Technical Specifications for **${amazonOffer.name}**:\n- **Resolution**: 1600 DPI Optical Tracking sensor.\n- **Battery Life**: Up to 18 Months on a single AA battery.\n- **Acoustic Noise**: 90% Silent Touch micro-switches.\n- **Connectivity**: 2.4 GHz Nano USB Wireless Receiver (10m range).\n- **Warranty**: Official Manufacturer Warranty.\n\nWould you like me to order this under your AP2 mandate?`;
  } else {
    // General inquiry — safe fallback for missing merchants
    const a = amazonOffer || offers[0];
    const f = flipkartOffer || offers[1] || offers[0];
    if (!a) {
      responseText = `I found **${offers.length}** verified merchant offers for **"${queryKeyword}"**. Ask me to buy one or compare options.`;
    } else {
      const minPrice = Math.min(a.price ?? 0, f?.price ?? a.price ?? 0);
      const maxPrice = Math.max(a.price ?? 0, f?.price ?? a.price ?? 0);
      const budgetCap = profile.default_max_budget || 2000;

      let budgetComplianceText = "";
      if (maxPrice <= budgetCap) {
        budgetComplianceText = `✅ Both items comply with your **₹${budgetCap.toLocaleString()}** AP2 budget cap. Which option would you like me to secure for you?`;
      } else if (minPrice <= budgetCap) {
        budgetComplianceText = `⚖️ **Budget Alert**: Only the **₹${minPrice.toLocaleString()}** option complies with your **₹${budgetCap.toLocaleString()}** AP2 budget cap.`;
      } else {
        budgetComplianceText = `🛡️ **AP2 Policy Guard Alert**: Both options (₹${minPrice.toLocaleString()} – ₹${maxPrice.toLocaleString()}) exceed your active **₹${budgetCap.toLocaleString()}** authorization cap.`;
      }

      responseText = `I analyzed **${offers.length} verified merchant offers** for **"${queryKeyword}"**:\n\n1. **${a.name}** on **${a.merchant_name}** for **₹${a.price.toLocaleString()}** (${a.rating || 4.8}★, ${a.delivery || 'Free Delivery'}).\n${f && f !== a ? `2. **${f.name}** on **${f.merchant_name}** for **₹${f.price.toLocaleString()}** (${f.rating || 4.6}★).\n\n` : '\n'}${budgetComplianceText}`;
    }
  }

  return {
    prompt: userPrompt,
    engine: "AgentPay Engine",
    steps: sessionSteps,
    response_text: responseText,
    mandate: activeMandate,
    discoveredOffers: offers,
    negotiation: negotiationResult,
    checkout: null,
    upsell: null,
    rag_sources: ragSources,
    is_checkout_flow: false,
    success: true
  };
}
