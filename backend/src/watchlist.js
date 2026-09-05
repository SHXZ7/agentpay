// backend/src/watchlist.js - Price Drop Alerts & Watchlist Poll Engine
import { getWatchlist, updateWatchlistItem, addAuditLog, getLatestActiveMandate } from './db.js';
import { getAutopayStatus } from './autopay.js';

// ─── Price fetcher ────────────────────────────────────────────────────────────
async function fetchCurrentPrice(item) {
  try {
    const { AMAZON_CATALOG, FLIPKART_CATALOG } = await import('./catalogGenerator.js');
    const { SEED_PRODUCTS } = await import('./db.js');

    const allProducts = [...SEED_PRODUCTS, ...AMAZON_CATALOG, ...FLIPKART_CATALOG];
    const match = allProducts.find(p => p.id === item.product_id);
    if (match) return Number(match.price);
  } catch {}
  return item.last_checked_price ?? item.current_price ?? item.target_price ?? 500;
}

// ─── Auto-buy trigger ─────────────────────────────────────────────────────────
async function triggerAutoBuy(item, currentPrice) {
  try {
    const autopay = await getAutopayStatus();
    let mandate = await getLatestActiveMandate();

    // If mandate missing or expired, load user profile limits to create or abort
    if (!mandate) {
      const { getUserProfile } = await import('./db.js');
      const profile = await getUserProfile(item.user_id);
      if (profile && profile.default_max_budget) {
        const { createMandate } = await import('./mandates.js');
        mandate = await createMandate({
          max_budget: Number(profile.default_max_budget),
          allowed_categories: profile.allowed_categories || ['electronics', 'computers', 'accessories', 'audio']
        });
      } else {
        await addAuditLog({
          actor: 'WATCHLIST_AUTOBUY',
          action: 'AUTOBUY_ABORTED',
          status: 'BLOCKED',
          details: `Auto-buy aborted for "${item.product_name}": No active mandate or valid user profile budget configured.`,
          payload: { watchlist_id: item.id }
        });
        return { success: false, reason: 'No active mandate or profile budget configured' };
      }
    }

    const buyPrice = Number(currentPrice ?? item.target_price ?? item.current_price ?? 500);

    // Execute checkout with proper Razorpay parameter object
    const { createRazorpayOrder } = await import('./razorpay.js');
    const { saveOrder } = await import('./db.js');

    const rzpOrder = await createRazorpayOrder({
      amount: buyPrice,
      receipt: `rcpt_wl_${Date.now()}`,
      notes: {
        watchlist_id: item.id,
        product_name: item.product_name,
        merchant_id: item.merchant_id || 'aura-tech',
        mandate_id: mandate?.mandate_id || 'ap2_mandate_auto'
      }
    });

    const orderId = rzpOrder?.order_id || `order_WL${Date.now()}`;

    const orderData = {
      order_id: orderId,
      product: {
        id: item.product_id || `prod_wl_${Date.now()}`,
        name: item.product_name,
        image: item.product_image || '🛒',
        price: buyPrice,
        category: 'electronics'
      },
      product_id: item.product_id,
      product_name: item.product_name,
      product_image: item.product_image || '🛒',
      amount: buyPrice,
      currency: 'INR',
      merchant_id: item.merchant_id || 'aura-tech',
      mandate_id: mandate?.mandate_id || 'ap2_mandate_auto',
      payment_status: 'SUCCESS_TEST_MODE',
      settlement_status: 'SETTLED',
      source: 'watchlist_autobuy',
      watchlist_id: item.id,
      created_at: new Date().toISOString()
    };

    await saveOrder(orderData);

    const isMonthly = item.recurrence === 'monthly_recurring';
    let nextFireAt = null;
    if (isMonthly && item.fire_at) {
      const d = new Date(item.fire_at);
      d.setMonth(d.getMonth() + 1);
      nextFireAt = d.toISOString();
    }

    const updatedItem = await updateWatchlistItem(item.id, {
      status: 'bought',
      triggered_at: new Date().toISOString(),
      last_ordered_at: new Date().toISOString(),
      order_id: orderId,
      fire_at: isMonthly ? nextFireAt : item.fire_at,
      notes: isMonthly 
        ? `Monthly auto-buy executed at ₹${buyPrice} (${orderId}). Next auto-order: ${new Date(nextFireAt).toLocaleDateString()}`
        : `Auto-bought at ₹${buyPrice} — order ${orderId}`
    });

    await addAuditLog({
      actor: 'WATCHLIST_POLLER',
      action: isMonthly ? 'WATCHLIST_MONTHLY_RECURRING_EXECUTED' : 'WATCHLIST_AUTOBUY_EXECUTED',
      status: 'SUCCESS',
      details: isMonthly
        ? `Recurring monthly purchase executed for "${item.product_name}" at ₹${buyPrice}. Next: ${new Date(nextFireAt).toLocaleDateString()}. Order: ${orderId}`
        : `Auto-bought "${item.product_name}" at ₹${buyPrice} via 0-OTP mandate. Order: ${orderId}`,
      payload: orderData
    });

    console.log(`🎯 Watchlist auto-buy: "${item.product_name}" at ₹${buyPrice} → ${orderId} (Status: bought)`);
    return updatedItem;
  } catch (err) {
    console.error('Watchlist auto-buy error:', err.message);
    await addAuditLog({
      actor: 'WATCHLIST_POLLER',
      action: 'WATCHLIST_AUTOBUY_ERROR',
      status: 'ERROR',
      details: `Auto-buy failed for "${item.product_name}": ${err.message}`,
      payload: { watchlist_id: item.id }
    });
    return item;
  }
}

// ─── Check a single entry ─────────────────────────────────────────────────────
export async function checkWatchlistEntry(item) {
  if (item.status === 'bought' || item.status === 'expired' || !item.is_active) return item;

  const now = Date.now();
  const lastChecked = item.last_checked ? new Date(item.last_checked).getTime() : 0;
  const intervalMs = (item.poll_interval_min || 30) * 60 * 1000;

  // For scheduled mode: check if fire_at has arrived
  const scheduledFired = (item.mode === 'scheduled' || item.mode === 'both')
    ? (item.fire_at && now >= new Date(item.fire_at).getTime())
    : false;

  // For price_drop mode: check if interval has elapsed or manual check
  const isDue = now - lastChecked >= intervalMs;

  // Fetch current price
  const currentPrice = await fetchCurrentPrice(item);

  const updates = {
    last_checked: new Date().toISOString(),
    last_checked_price: currentPrice
  };

  await updateWatchlistItem(item.id, updates);

  const refreshed = { ...item, ...updates };

  // Evaluate trigger conditions
  const priceDrop = (refreshed.mode === 'price_drop' || refreshed.mode === 'both')
    && currentPrice !== null
    && currentPrice <= Number(refreshed.target_price);

  const shouldFire = priceDrop || (scheduledFired && isDue);

  if (shouldFire) {
    if (refreshed.auto_buy !== false) {
      const boughtResult = await triggerAutoBuy(refreshed, currentPrice);
      return boughtResult || refreshed;
    } else {
      // notify-only: mark as triggered
      const triggered = await updateWatchlistItem(item.id, { 
        status: 'triggered', 
        triggered_at: new Date().toISOString() 
      });
      await addAuditLog({
        actor: 'WATCHLIST_POLLER',
        action: 'WATCHLIST_PRICE_ALERT',
        status: 'NOTIFIED',
        details: `Price alert: "${refreshed.product_name}" hit ₹${currentPrice} (target ₹${refreshed.target_price}). Auto-buy is OFF.`,
        payload: { watchlist_id: refreshed.id, current_price: currentPrice }
      });
      return triggered || refreshed;
    }
  }

  return refreshed;
}

// ─── Background poll engine ────────────────────────────────────────────────────
let pollerTimer = null;

export function startWatchlistPoller() {
  if (pollerTimer) return;

  const runPoll = async () => {
    try {
      const list = await getWatchlist();
      const activeItems = list.filter(w => w.is_active && w.status !== 'bought' && w.status !== 'expired');

      for (const item of activeItems) {
        await checkWatchlistEntry(item);
      }
    } catch (err) {
      console.warn('Watchlist poller error:', err.message);
    }
  };

  // Run on startup after 3s, then every 30s
  setTimeout(runPoll, 3000);
  pollerTimer = setInterval(runPoll, 30 * 1000);
}
