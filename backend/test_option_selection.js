// backend/test_option_selection.js - Verify Multi-Turn Option Selection Accuracy
import { runShoppingAgent } from './src/agent.js';
import { searchAcrossAllMerchants } from './src/merchants.js';

async function runOptionTests() {
  console.log('🧪 Starting Multi-Turn Option Selection & Anti-Substitution Verification...\n');

  // Test 0: Search "iphone charger" in merchant network
  console.log('Test 0: Search "iphone charger" in merchant network');
  const searchResults = searchAcrossAllMerchants('iphone charger');
  console.log('  Top 3 Results:');
  searchResults.slice(0, 3).forEach((r, i) => {
    console.log(`    ${i + 1}. [${r.merchant_name}] ${r.product.name} (₹${r.product.price}) - Cat: ${r.product.category}`);
  });

  const topResult = searchResults[0]?.product;
  const isCharger = topResult?.name?.toLowerCase().includes('charger') || topResult?.category === 'electronics' || topResult?.category === 'cables' || topResult?.category === 'accessories';
  if (!topResult || !isCharger || topResult.category === 'mobiles' || topResult.name.includes('iPhone 16 Pro')) {
    throw new Error(`Test 0 Failed: Expected charger as top result for 'iphone charger', but got ${topResult?.name}`);
  }
  console.log('  ✅ Test 0 Passed: "iphone charger" returns real chargers and never mobile phones!\n');

  // Test 1: User selects "Buy option 1" for Anker Mouse
  console.log('Test 1: Prompt = "Buy option 1" (Anker Mouse Options in History)');
  const simulatedMouseHistory = [
    {
      role: 'user',
      content: 'Can you show me anker mice available?'
    },
    {
      role: 'assistant',
      content: `I’m ready to place the order, but I need to know which exact Anker mouse you’d like to purchase:

1️⃣ Model 56 – ₹544, rating 4.9★
2️⃣ Model 64 – ₹484, rating 4.2★
3️⃣ Model 72 – ₹484, rating 4.4★

Please reply with the option number (e.g., “Buy option 1”) or the full model name, and I’ll negotiate the best price and complete the checkout for you.`
    }
  ];

  const res1 = await runShoppingAgent({
    prompt: 'Buy option 1',
    history: simulatedMouseHistory,
    selectedModel: 'deterministic',
    agentMode: 'full_autonomous'
  });

  if (!res1.checkout?.success) {
    throw new Error(`Test 1 Failed: Expected checkout.success === true, but got ${res1.checkout?.success}`);
  }
  const purchasedItem1 = res1.checkout?.order?.product?.name;
  console.log('  Purchased Product:', purchasedItem1);
  if (!purchasedItem1 || !purchasedItem1.toLowerCase().includes('model 56') || purchasedItem1.toLowerCase().includes('logitech')) {
    throw new Error(`Test 1 Failed: Expected Anker Model 56, but got ${purchasedItem1}`);
  }
  console.log('  ✅ Test 1 Passed: Exactly purchased Anker Model 56!\n');

  // Test 2: User selects "buy 1st option" for iPhone Charger
  console.log('Test 2: Prompt = "buy 1st option" (iPhone Charger Multi-Line Options in History)');
  const simulatedChargerHistory = [
    {
      role: 'user',
      content: 'I need an iphone charger'
    },
    {
      role: 'assistant',
      content: `Here are some high-quality fast chargers that are compatible with iPhones:

1
UGREEN 65W Nexode GaN Fast Charger
Price: ₹999 (MRP: ₹1,299)
Specs: 65W GaN II, 2x USB-C + 1x USB-A ports.
Rating: 4.8 Stars (1,200+ reviews)
Best for: Fast charging iPhones, iPads, and laptops.

2
LG 65W GaN Fast Charger 3-Port Wall Adapter
Price: ₹944 (MRP: ₹1,133)
Specs: GaN III Pro, 2x USB-C + 1x USB-A, PD 3.0 / QC 4+ protocols.
Rating: 4.5 Stars (11,865+ reviews)

Please let me know which option you prefer!`
    }
  ];

  const res2 = await runShoppingAgent({
    prompt: 'buy 1st option',
    history: simulatedChargerHistory,
    selectedModel: 'deterministic',
    agentMode: 'full_autonomous'
  });

  if (!res2.checkout?.success) {
    console.error('Test 2 checkout failure details:', JSON.stringify(res2.checkout, null, 2));
    throw new Error(`Test 2 Failed: Expected checkout.success === true, but got ${res2.checkout?.success}`);
  }
  const purchasedItem2 = res2.checkout?.order?.product?.name;
  const purchasedPrice2 = res2.checkout?.order?.amount;
  console.log('  Purchased Product:', purchasedItem2);
  console.log('  Price:', purchasedPrice2);
  console.log('  Checkout Success:', res2.checkout?.success);

  if (!purchasedItem2 || !purchasedItem2.toLowerCase().includes('ugreen') || purchasedItem2.toLowerCase().includes('iphone 16 pro')) {
    throw new Error(`Test 2 Failed: Expected UGREEN 65W Charger, but got ${purchasedItem2}`);
  }
  console.log('  ✅ Test 2 Passed: Exactly purchased UGREEN 65W Charger and avoided phone substitution!\n');

  console.log('🎉 ALL MULTI-TURN OPTION & ANTI-SUBSTITUTION TESTS PASSED PERFECTLY!\n');
}

runOptionTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
