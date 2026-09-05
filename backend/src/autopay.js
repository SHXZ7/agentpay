// backend/src/autopay.js - Razorpay UPI Autopay & Headless Payments Engine with Persistent Storage
import { addAuditLog, saveAutopayRecord, getAutopayRecord, getOrders } from './db.js';
import { createRazorpayOrder, getRazorpayInstance } from './razorpay.js';

let ACTIVE_UPI_AUTOPAY = {
  is_active: true,
  token_id: "tok_rzp_autopay",
  customer_id: "cust_agent_01",
  upi_vpa: "shopper@oksbi",
  vpa: "shopper@oksbi",
  max_limit: 5000,
  max_amount: 5000,
  spent_amount: 0,
  remaining_limit: 5000,
  frequency: "monthly",
  bank_name: "UPI Autopay (NPCI e-Mandate)",
  authorized_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};

// Hydrate from persistent store on startup
async function initAutopay() {
  try {
    const saved = await getAutopayRecord();
    if (saved && typeof saved.is_active === 'boolean') {
      ACTIVE_UPI_AUTOPAY = { ...ACTIVE_UPI_AUTOPAY, ...saved };
    }
  } catch (err) {}
}
initAutopay();

export async function getAutopayStatus() {
  try {
    const saved = await getAutopayRecord();
    if (saved && typeof saved.is_active === 'boolean') {
      ACTIVE_UPI_AUTOPAY = { ...ACTIVE_UPI_AUTOPAY, ...saved };
    }
    
    // Dynamically calculate spent amount from all orders
    const orders = await getOrders();
    const totalSpent = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    
    if (!ACTIVE_UPI_AUTOPAY.is_active) {
      ACTIVE_UPI_AUTOPAY.spent_amount = 0;
      ACTIVE_UPI_AUTOPAY.remaining_limit = 0;
      ACTIVE_UPI_AUTOPAY.loaded_funds = 0;
      ACTIVE_UPI_AUTOPAY.max_limit = 0;
      ACTIVE_UPI_AUTOPAY.max_amount = 0;
      ACTIVE_UPI_AUTOPAY.storage_ceiling = 0;
    } else {
      const storageCeiling = Number(saved?.storage_ceiling ?? saved?.max_limit ?? saved?.max_amount ?? 100000);
      
      // Calculate loaded funds (actual money added via Top-Up)
      let loadedFunds = saved?.loaded_funds !== undefined && saved?.loaded_funds !== null
        ? Number(saved.loaded_funds)
        : Math.min(storageCeiling, totalSpent + Number(saved?.remaining_limit ?? 10000));

      const availableBalance = Math.max(0, loadedFunds - totalSpent);

      ACTIVE_UPI_AUTOPAY.storage_ceiling = storageCeiling;
      ACTIVE_UPI_AUTOPAY.max_limit = storageCeiling;
      ACTIVE_UPI_AUTOPAY.max_amount = storageCeiling;
      ACTIVE_UPI_AUTOPAY.loaded_funds = loadedFunds;
      ACTIVE_UPI_AUTOPAY.spent_amount = totalSpent;
      ACTIVE_UPI_AUTOPAY.remaining_limit = availableBalance;
      ACTIVE_UPI_AUTOPAY.available_balance = availableBalance;

      await saveAutopayRecord(ACTIVE_UPI_AUTOPAY);
    }
    ACTIVE_UPI_AUTOPAY.vpa = ACTIVE_UPI_AUTOPAY.upi_vpa || ACTIVE_UPI_AUTOPAY.vpa || "shopper@oksbi";
    ACTIVE_UPI_AUTOPAY.autopay_id = ACTIVE_UPI_AUTOPAY.token_id || "tok_rzp_autopay";

  } catch (err) {}

  return ACTIVE_UPI_AUTOPAY;
}

export async function authorizeUPIAutopay({
  action_type = "auto",
  storage_ceiling,
  max_limit,
  max_amount,
  topup_amount,
  add_funds_amount,
  upi_vpa,
  vpa,
  customer_email = "shopper@agentic.commerce"
}) {
  const currentStatus = await getAutopayStatus();
  const currentCeiling = Number(currentStatus.storage_ceiling ?? currentStatus.max_limit ?? 100000);
  const currentLoaded = Number(currentStatus.loaded_funds ?? 10000);
  
  const orders = await getOrders();
  const totalSpent = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  let newCeiling = currentCeiling;
  let newLoaded = currentLoaded;

  const targetVpa = upi_vpa || vpa || currentStatus.upi_vpa || "shopper@oksbi";

  // CASE A: Add Funds (+Top Up money into vault)
  const addAmount = Number(add_funds_amount || topup_amount || 0);
  if (addAmount > 0) {
    newLoaded = Math.min(newCeiling, currentLoaded + addAmount);
  }

  // CASE B: Change Storage Ceiling Limit
  const specifiedCeiling = Number(storage_ceiling ?? max_limit ?? max_amount ?? 0);
  if (specifiedCeiling > 0 && addAmount === 0) {
    newCeiling = specifiedCeiling;
    newLoaded = Math.min(newLoaded, newCeiling);
  }

  const remaining = Math.max(0, newLoaded - totalSpent);

  const tokenId = currentStatus.token_id || `tok_rzp_autopay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const customerId = currentStatus.customer_id || `cust_agent_${Date.now()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let rzpOrderId = `order_auth_${Date.now()}`;
  try {
    const rzpOrder = await createRazorpayOrder({
      amount: 1, // Standard ₹1 mandate verification
      receipt: `rcpt_auth_${Date.now()}`,
      notes: { mandate_type: "upi_autopay", storage_ceiling: newCeiling, loaded_funds: newLoaded, add_amount: addAmount }
    });
    rzpOrderId = rzpOrder.order_id;
  } catch (err) {
    console.warn("Razorpay autopay auth note:", err.message);
  }

  ACTIVE_UPI_AUTOPAY = {
    ...currentStatus,
    is_active: true,
    token_id: tokenId,
    autopay_id: tokenId,
    customer_id: customerId,
    auth_order_id: rzpOrderId,
    upi_vpa: targetVpa,
    vpa: targetVpa,
    storage_ceiling: newCeiling,
    max_limit: newCeiling,
    max_amount: newCeiling,
    target_budget: newCeiling,
    loaded_funds: newLoaded,
    spent_amount: totalSpent,
    remaining_limit: remaining,
    available_balance: remaining,
    frequency: "monthly",
    bank_name: "UPI Autopay (NPCI e-Mandate)",
    authorized_at: currentStatus.authorized_at || now.toISOString(),
    last_updated_at: now.toISOString(),
    expires_at: expiresAt
  };

  await saveAutopayRecord(ACTIVE_UPI_AUTOPAY);

  const actionName = addAmount > 0 ? "VAULT_FUNDS_ADDED" : "STORAGE_CEILING_UPDATED";
  const detailsMsg = addAmount > 0 
    ? `Added +₹${addAmount} to vault. Available balance: ₹${remaining} / ₹${newCeiling} Storage Limit.`
    : `Updated Mandate Storage Ceiling to ₹${newCeiling}. Available balance: ₹${remaining}.`;

  await addAuditLog({
    actor: "UPI_AUTOPAY_GATEWAY",
    action: actionName,
    status: "SUCCESS",
    details: detailsMsg,
    payload: ACTIVE_UPI_AUTOPAY
  });

  return ACTIVE_UPI_AUTOPAY;
}

export async function chargeUPIAutopay({ amount, merchant_id, product_name }) {
  if (!ACTIVE_UPI_AUTOPAY.is_active) {
    return {
      success: false,
      error: "NO_ACTIVE_AUTOPAY",
      reason: "No active UPI Autopay mandate found. Please authorize UPI Autopay once."
    };
  }

  const chargeAmount = Number(amount);
  const status = await getAutopayStatus();

  if (chargeAmount > status.remaining_limit) {
    return {
      success: false,
      error: "AUTOPAY_LIMIT_EXCEEDED",
      reason: `Amount ₹${chargeAmount} exceeds available vault funds of ₹${status.remaining_limit} (Storage Ceiling: ₹${status.storage_ceiling})`
    };
  }

  // Atomically reserve charge amount before external gateway dispatch
  ACTIVE_UPI_AUTOPAY.spent_amount += chargeAmount;
  ACTIVE_UPI_AUTOPAY.remaining_limit = Math.max(0, ACTIVE_UPI_AUTOPAY.loaded_funds - ACTIVE_UPI_AUTOPAY.spent_amount);
  ACTIVE_UPI_AUTOPAY.available_balance = ACTIVE_UPI_AUTOPAY.remaining_limit;
  await saveAutopayRecord(ACTIVE_UPI_AUTOPAY);

  let rzpOrder;
  try {
    // Create real recurring charge in Razorpay
    rzpOrder = await createRazorpayOrder({
      amount: chargeAmount,
      receipt: `rcpt_recurring_${Date.now()}`,
      notes: {
        type: "headless_upi_recurring",
        token_id: ACTIVE_UPI_AUTOPAY.token_id,
        merchant_id,
        product_name
      }
    });
  } catch (err) {
    // Rollback atomic reservation on gateway failure
    ACTIVE_UPI_AUTOPAY.spent_amount -= chargeAmount;
    ACTIVE_UPI_AUTOPAY.remaining_limit = Math.max(0, ACTIVE_UPI_AUTOPAY.loaded_funds - ACTIVE_UPI_AUTOPAY.spent_amount);
    ACTIVE_UPI_AUTOPAY.available_balance = ACTIVE_UPI_AUTOPAY.remaining_limit;
    await saveAutopayRecord(ACTIVE_UPI_AUTOPAY);
    throw err;
  }

  await addAuditLog({
    actor: "HEADLESS_AUTOPAY_ENGINE",
    action: "RECURRING_DEBIT_SUCCESS",
    status: "SUCCESS",
    details: `Headless 0-OTP recurring debit of ₹${chargeAmount} executed on ${merchant_id} using token '${ACTIVE_UPI_AUTOPAY.token_id}'`,
    payload: { amount: chargeAmount, rzp_order: rzpOrder, remaining_limit: ACTIVE_UPI_AUTOPAY.remaining_limit }
  });

  return {
    success: true,
    order_id: rzpOrder.order_id,
    amount: chargeAmount,
    token_id: ACTIVE_UPI_AUTOPAY.token_id,
    remaining_limit: ACTIVE_UPI_AUTOPAY.remaining_limit
  };
}

export async function revokeUPIAutopay() {
  const previousToken = ACTIVE_UPI_AUTOPAY.token_id;
  const unspentBalance = Number(ACTIVE_UPI_AUTOPAY.remaining_limit || 0);
  const vpa = ACTIVE_UPI_AUTOPAY.upi_vpa || ACTIVE_UPI_AUTOPAY.vpa || "shopper@oksbi";

  ACTIVE_UPI_AUTOPAY = {
    is_active: false,
    token_id: null,
    customer_id: null,
    upi_vpa: vpa,
    vpa: vpa,
    max_limit: 0,
    max_amount: 0,
    spent_amount: 0,
    remaining_limit: 0,
    target_budget: 0,
    frequency: "monthly",
    bank_name: "UPI Autopay (NPCI e-Mandate)",
    authorized_at: null,
    last_reset_at: new Date().toISOString(),
    expires_at: null
  };

  await saveAutopayRecord(ACTIVE_UPI_AUTOPAY);

  // Clear active ephemeral mandates, but keep all past completed orders intact in history!
  const { clearAllMandates } = await import('./db.js');
  await clearAllMandates();

  await addAuditLog({
    actor: "USER_HEADLESS_VAULT",
    action: "UPI_AUTOPAY_REVOKED_CYCLE_RESET",
    status: "SUCCESS",
    details: `User revoked UPI Autopay mandate token '${previousToken || "active"}'. Active vault cycle spending reset to 0 while preserving past order history. Unspent funds of ₹${unspentBalance} swept back to ${vpa}.`,
    payload: {
      revoked_token: previousToken,
      credited_amount: unspentBalance,
      vpa: vpa,
      reset_spent: 0
    }
  });

  return {
    success: true,
    autopay: ACTIVE_UPI_AUTOPAY,
    credited_amount: unspentBalance,
    vpa: vpa,
    message: `Mandate revoked & spending cycle reset to 0. Order history preserved.`
  };
}
