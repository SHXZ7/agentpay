// frontend/lib/api.js - Client API Service with JWT Token Management
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// ─── JWT Authentication & Token Storage ─────────────────────────────────────

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('agentpay_auth_token') || null;
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('agentpay_auth_token', token);
  } else {
    localStorage.removeItem('agentpay_auth_token');
  }
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('agentpay_auth_token');
  localStorage.removeItem('agentpay_auth_user');
}

export function getAuthHeaders(extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function loginWithCredentials({ identifier, otp, name, upi_vpa, mode = 'login' }) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, otp, name, upi_vpa, mode })
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAuthToken(data.token);
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('agentpay_auth_user', JSON.stringify(data.user));
      }
    }
    return data;
  } catch (err) {
    console.error("loginWithCredentials error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendAuthOtp(identifier) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    return await res.json();
  } catch (err) {
    console.error("sendAuthOtp error:", err);
    return { success: false, error: err.message };
  }
}

export async function registerWithCredentials(userData) {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAuthToken(data.token);
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('agentpay_auth_user', JSON.stringify(data.user));
      }
    }
    return data;
  } catch (err) {
    console.error("registerWithCredentials error:", err);
    return { success: false, error: err.message };
  }
}

export async function fetchCurrentUserProfile() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    const data = await res.json();
    if (data.success && data.user && typeof window !== 'undefined') {
      localStorage.setItem('agentpay_auth_user', JSON.stringify(data.user));
    }
    return data;
  } catch (err) {
    console.error("fetchCurrentUserProfile error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateCurrentUserProfile(profileUpdates) {
  try {
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileUpdates)
    });
    const data = await res.json();
    if (data.success && data.profile && typeof window !== 'undefined') {
      localStorage.setItem('agentpay_auth_user', JSON.stringify(data.profile));
    }
    return data;
  } catch (err) {
    console.error("updateCurrentUserProfile error:", err);
    return { success: false, error: err.message };
  }
}

export async function logoutCurrentUser() {
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch (err) {
    console.warn("logout error:", err);
  } finally {
    clearAuthToken();
  }
  return { success: true };
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { cache: 'no-store' });
    return await res.json();
  } catch (err) {
    return { status: "OFFLINE", error: err.message };
  }
}

export async function fetchProducts(category = "", max_price = "") {
  try {
    let url = `${BASE_URL}/products`;
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (max_price) params.append('max_price', max_price);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return data.products || [];
  } catch (err) {
    console.error("fetchProducts error:", err);
    return [];
  }
}

export async function searchNetworkProducts(query = "") {
  try {
    const res = await fetch(`${BASE_URL}/network/search?query=${encodeURIComponent(query)}`, { cache: 'no-store' });
    const data = await res.json();
    return data.offers || [];
  } catch (err) {
    console.error("searchNetworkProducts error:", err);
    return [];
  }
}

export async function createMandate({ max_budget, allowed_categories, validity_minutes, user_intent }) {
  const res = await fetch(`${BASE_URL}/mandates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_budget,
      allowed_categories,
      validity_minutes,
      user_intent
    })
  });
  return await res.json();
}

export async function fetchMandate(mandate_id) {
  const res = await fetch(`${BASE_URL}/mandates/${mandate_id}`, { cache: 'no-store' });
  return await res.json();
}

export async function executeCheckout({ item_id, mandate_id, quantity = 1 }) {
  const res = await fetch(`${BASE_URL}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id, mandate_id, quantity })
  });
  return await res.json();
}

export async function runAgentShop({ prompt, explicit_budget, force_category, history = [], selected_model = null, agent_mode = 'autonomous' }) {
  const res = await fetch(`${BASE_URL}/agent/shop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, explicit_budget, force_category, history, selected_model, agent_mode })
  });
  return await res.json();
}

export async function fetchUpsell({ product_id, remaining_budget }) {
  const res = await fetch(`${BASE_URL}/agent/upsell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id, remaining_budget })
  });
  return await res.json();
}

export async function fetchAuditLogs(limit = 100) {
  try {
    const res = await fetch(`${BASE_URL}/audit?limit=${limit}`, { cache: 'no-store' });
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.error("fetchAuditLogs error:", err);
    return [];
  }
}

export async function resetDatabase() {
  const res = await fetch(`${BASE_URL}/audit/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return await res.json();
}

// ─── UPI Autopay API ──────────────────────────────────────────────────────────

export async function authorizeAutopay(payload) {
  try {
    const res = await fetch(`${BASE_URL}/autopay/authorize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error("authorizeAutopay error:", err);
    return { success: false, error: err.message };
  }
}

export async function revokeAutopay() {
  try {
    const res = await fetch(`${BASE_URL}/autopay/revoke`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (err) {
    console.error("revokeAutopay error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Watchlist API ────────────────────────────────────────────────────────────

export async function fetchWatchlist() {
  try {
    const res = await fetch(`${BASE_URL}/watchlist`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    const data = await res.json();
    return data.watchlist || [];
  } catch (err) {
    console.error('fetchWatchlist error:', err);
    return [];
  }
}

export async function addWatchlistItem(item) {
  const res = await fetch(`${BASE_URL}/watchlist`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(item)
  });
  return await res.json();
}

export async function updateWatchlistItem(id, updates) {
  try {
    const res = await fetch(`${BASE_URL}/watchlist/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    return await res.json();
  } catch (err) {
    console.error('updateWatchlistItem error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteWatchlistItem(id) {
  try {
    const res = await fetch(`${BASE_URL}/watchlist/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (err) {
    console.error('deleteWatchlistItem error:', err);
    return { success: false, error: err.message };
  }
}

export async function checkWatchlistItemNow(id) {
  try {
    const res = await fetch(`${BASE_URL}/watchlist/${id}/check`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (err) {
    console.error('checkWatchlistItemNow error:', err);
    return { success: false, error: err.message };
  }
}

export async function sendWhatsAppMessage(text, from = "+919876543210") {
  try {
    const res = await fetch(`${BASE_URL}/channels/whatsapp/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from })
    });
    return await res.json();
  } catch (err) {
    console.error('sendWhatsAppMessage error:', err);
    return { success: false, error: err.message };
  }
}

export async function sendTelegramMessage(text, chatId = "simulator_chat") {
  try {
    const res = await fetch(`${BASE_URL}/channels/telegram/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, chat_id: chatId })
    });
    return await res.json();
  } catch (err) {
    console.error('sendTelegramMessage error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchChannelStatus() {
  try {
    const res = await fetch(`${BASE_URL}/channels/status`, { cache: 'no-store' });
    return await res.json();
  } catch (err) {
    console.error('fetchChannelStatus error:', err);
    return { success: false, channels: {} };
  }
}

// ─── Merchant Campaign Orchestrator & Protocol APIs ───────────────────────────

export async function fetchCampaigns() {
  try {
    const res = await fetch(`${BASE_URL}/merchant/campaigns`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    const data = await res.json();
    return data.campaigns || [];
  } catch (err) {
    console.error('fetchCampaigns error:', err);
    return [];
  }
}

export async function createCampaign(campaign) {
  try {
    const res = await fetch(`${BASE_URL}/merchant/campaigns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(campaign)
    });
    return await res.json();
  } catch (err) {
    console.error('createCampaign error:', err);
    return { success: false, error: err.message };
  }
}

export async function toggleCampaign(id) {
  try {
    const res = await fetch(`${BASE_URL}/merchant/campaigns/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return await res.json();
  } catch (err) {
    console.error('toggleCampaign error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchDiscoveryManifest() {
  try {
    const res = await fetch(`${BASE_URL}/.well-known/agent-commerce.json`, { cache: 'no-store' });
    return await res.json();
  } catch (err) {
    console.error('fetchDiscoveryManifest error:', err);
    return null;
  }
}

export async function executeX402Checkout({ product_id, merchant_id, amount, mandate_id, signature }) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (mandate_id && signature) {
      headers['Authorization'] = `AP2-Token ${mandate_id}:${signature}`;
    }
    const res = await fetch(`${BASE_URL}/acp/v1/checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ product_id, merchant_id, amount, mandate_id, signature })
    });
    const data = await res.json();
    return { status: res.status, ...data };
  } catch (err) {
    console.error('executeX402Checkout error:', err);
    return { status: 500, success: false, error: err.message };
  }
}


