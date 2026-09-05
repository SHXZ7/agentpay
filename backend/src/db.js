// backend/src/db.js - Resilient Dual-Tier Persistence Engine (MongoDB Atlas + Persistent JSON Storage)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const SEED_PRODUCTS = [
  {
    id: "prod_mouse_01",
    name: "Logitech M330 Silent Wireless Mouse",
    description: "Quiet 2.4GHz optical wireless mouse with 24-month battery life, ergonomic rubber grip, and 1000 DPI precision.",
    price: 799,
    category: "electronics",
    stock: 24,
    rating: 4.8,
    image: "🖱️",
    badge: "Best Seller",
    specs: { connectivity: "2.4 GHz USB", battery: "1x AA", weight: "91g" }
  },
  {
    id: "prod_pad_01",
    name: "Ergonomic Memory Foam Mouse Pad",
    description: "Wrist support non-slip base mouse pad designed for long coding and productivity sessions.",
    price: 149,
    category: "accessories",
    stock: 50,
    rating: 4.6,
    image: "⬛",
    badge: "Add-on Favorite",
    specs: { material: "Memory Foam", dimensions: "230x210mm", base: "Anti-skid PU" }
  },
  {
    id: "prod_kb_01",
    name: "Keychron K2 V2 Mechanical Keyboard",
    description: "Wireless RGB compact 75% mechanical keyboard with hot-swappable Gateron Brown switches.",
    price: 1899,
    category: "electronics",
    stock: 12,
    rating: 4.9,
    image: "⌨️",
    badge: "Premium",
    specs: { switches: "Gateron Brown", layout: "75%", connectivity: "Bluetooth 5.1 / Type-C" }
  },
  {
    id: "prod_hub_01",
    name: "Anker 7-in-1 USB-C Power Delivery Hub",
    description: "Multiport adapter with 4K HDMI, 100W Power Delivery, SD card slot, and 3x USB 3.0 ports.",
    price: 1199,
    category: "electronics",
    stock: 18,
    rating: 4.7,
    image: "🔌",
    badge: "Workstation Essential",
    specs: { ports: "7-in-1", pd: "100W Pass-through", video: "4K @ 30Hz" }
  },
  {
    id: "prod_headphone_01",
    name: "Sony WH-CH520 Wireless Bluetooth Headphones",
    description: "Lightweight on-ear headphones with 50-hour battery life, DSEE sound enhancement, and multipoint pairing.",
    price: 2499,
    category: "electronics",
    stock: 15,
    rating: 4.7,
    image: "🎧",
    badge: "Top Audio",
    specs: { battery: "50 Hours", weight: "147g", bluetooth: "v5.2" }
  },
  {
    id: "prod_cable_01",
    name: "Braided Nylon 100W Type-C Fast Cable (2m)",
    description: "Durable military-grade braided fast-charging USB-C to USB-C cable supporting up to 100W PD.",
    price: 299,
    category: "accessories",
    stock: 80,
    rating: 4.5,
    image: "⚡",
    badge: "Popular Add-on",
    specs: { length: "2 Meters", power: "100W Max", data: "480 Mbps" }
  },
  {
    id: "prod_coffee_01",
    name: "Blue Tokai Attikan Estate Dark Roast Coffee (250g)",
    description: "Single-origin artisanal roasted whole bean coffee with tasting notes of dark chocolate and roasted almond.",
    price: 499,
    category: "groceries",
    stock: 30,
    rating: 4.9,
    image: "☕",
    badge: "Artisanal",
    specs: { roast: "Dark", origin: "Biligirirangan Hills, Karnataka", grind: "Whole Bean" }
  },
  {
    id: "prod_tumbler_01",
    name: "Thermal Insulated Stainless Steel Tumbler (500ml)",
    description: "Double-walled vacuum insulated travel flask keeping coffee hot for 8 hours and cold for 16 hours.",
    price: 649,
    category: "lifestyle",
    stock: 25,
    rating: 4.8,
    image: "🥤",
    badge: "Desk Utility",
    specs: { capacity: "500 ml", material: "304 Food-Grade Steel", leakproof: true }
  },
  {
    id: "prod_webcam_01",
    name: "Logitech C920 Pro HD 1080p Webcam",
    description: "Full HD 1080p video calling webcam with dual stereo mics, auto light correction, and privacy shutter.",
    price: 2499,
    category: "electronics",
    stock: 15,
    rating: 4.8,
    image: "📷",
    badge: "Pro Video",
    specs: { resolution: "1080p @ 30fps", fov: "78 Degrees", focus: "Autofocus" }
  },
  {
    id: "prod_light_01",
    name: "BenQ ScreenBar LED Monitor Light",
    description: "Auto-dimming space-saving monitor light bar with zero screen glare and adjustable color temperature.",
    price: 1599,
    category: "accessories",
    stock: 20,
    rating: 4.9,
    image: "💡",
    badge: "Eye Care",
    specs: { power: "USB 5V/1A", temp: "2700K - 6500K", sensor: "Auto-Dim" }
  },
  {
    id: "prod_stand_01",
    name: "Aluminum Adjustable Laptop Riser Stand",
    description: "Ergonomic ventilated aluminum alloy stand compatible with all 10-16 inch MacBook and Windows laptops.",
    price: 649,
    category: "accessories",
    stock: 35,
    rating: 4.7,
    image: "💻",
    badge: "Ergonomic",
    specs: { material: "Aerospace Aluminum", angles: "6-Level Adjust" }
  },
  {
    id: "prod_gan_01",
    name: "UGREEN 65W Nexode GaN Fast Charger",
    description: "Compact 3-port GaN fast wall charger with 2x USB-C and 1x USB-A ports for laptops, phones, and tablets.",
    price: 999,
    category: "electronics",
    stock: 28,
    rating: 4.8,
    image: "⚡",
    badge: "Fast Charge",
    specs: { max_power: "65W GaN II", ports: "2x USB-C + 1x USB-A" }
  }
];

export const SEED_CAMPAIGNS = [
  {
    id: "camp_flash_ai",
    name: "⚡ Flash AI Agent Deal: 15% Off All Electronics",
    merchant_id: "aura-tech",
    merchant_name: "Amazon India (Aura Tech)",
    type: "percentage",
    discount_value: 15,
    target_category: "electronics",
    min_order_value: 499,
    is_active: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    ai_buyer_sales_count: 14,
    revenue_unlocked: 10486,
    description: "Autonomous AI buyer coupon automatically matched during checkout on Amazon India"
  },
  {
    id: "camp_express_free",
    name: "🚀 Agentic Cart Booster: Free 1-Hour Express Dispatch",
    merchant_id: "prime-gadgets",
    merchant_name: "Flipkart Assured (Prime Gadgets)",
    type: "shipping_waiver",
    discount_value: 49,
    target_category: "all",
    min_order_value: 299,
    is_active: true,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    ai_buyer_sales_count: 28,
    revenue_unlocked: 21320,
    description: "Automated delivery fee waiver for UPI Autopay headless AI transactions"
  },
  {
    id: "camp_flipkart_surge",
    name: "✦ Flipkart Plus Agent Exclusive: Flat ₹100 Off",
    merchant_id: "prime-gadgets",
    merchant_name: "Flipkart Assured (Prime Gadgets)",
    type: "fixed_discount",
    discount_value: 100,
    target_category: "peripherals",
    min_order_value: 800,
    is_active: true,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    ai_buyer_sales_count: 19,
    revenue_unlocked: 17800,
    description: "High-value basket conversion campaign targeting autonomous peripheral buyers"
  },
  {
    id: "camp_meesho_direct",
    name: "🏭 Factory Direct AI Clearance: 20% Off Cables & Accessories",
    merchant_id: "meesho-direct",
    merchant_name: "Meesho Direct Wholesale",
    type: "percentage",
    discount_value: 20,
    target_category: "accessories",
    min_order_value: 199,
    is_active: true,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    ai_buyer_sales_count: 32,
    revenue_unlocked: 9600,
    description: "Zero-middleman factory clearance discounts for price-sensitive shopping agents"
  }
];

export const SEED_USERS = [
  {
    id: "usr_shaaz_01",
    name: "Shaaz Ahmed",
    email: "shaaz@agentic.commerce",
    phone: "+91 98765 43210",
    upi_vpa: "shaaz@oksbi",
    default_max_budget: 2000,
    auto_negotiate_coupons: true,
    preferred_delivery: "fastest_1day",
    allowed_categories: ["electronics", "computers", "accessories", "mobiles", "cables", "wearables", "storage", "gaming", "smarthome"],
    allowed_merchants: ["aura-tech", "prime-gadgets", "meesho-direct"],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: "usr_priya_02",
    name: "Priya Sharma",
    email: "priya@agentic.commerce",
    phone: "+91 98123 45678",
    upi_vpa: "priya@okhdfcbank",
    default_max_budget: 3500,
    auto_negotiate_coupons: true,
    preferred_delivery: "fastest_1day",
    allowed_categories: ["electronics", "accessories", "lifestyle", "audio"],
    allowed_merchants: ["aura-tech", "prime-gadgets", "meesho-direct"],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: "usr_alex_03",
    name: "Alex Rivera",
    email: "alex@agentic.commerce",
    phone: "+91 97777 88888",
    upi_vpa: "alex@okaxis",
    default_max_budget: 5000,
    auto_negotiate_coupons: true,
    preferred_delivery: "fastest_1day",
    allowed_categories: ["electronics", "computers", "gaming", "accessories"],
    allowed_merchants: ["aura-tech", "prime-gadgets"],
    created_at: new Date(Date.now() - 7 * 86400000).toISOString()
  }
];

const DEFAULT_USER_PROFILE = {
  name: "Autonomous Shopper",
  email: "shopper@agentic.commerce",
  upi_vpa: "shopper@oksbi",
  default_max_budget: 1500,
  auto_negotiate_coupons: true,
  preferred_delivery: "fastest_1day",
  allowed_categories: [
    "electronics",
    "computers",
    "accessories",
    "mobiles",
    "cables",
    "wearables",
    "storage",
    "gaming",
    "smarthome"
  ],
  allowed_merchants: ["aura-tech", "prime-gadgets", "meesho-direct"]
};

// Persistent state holder
const store = {
  products: [...SEED_PRODUCTS],
  mandates: new Map(),
  orders: new Map(),
  sessions: new Map(),
  users: new Map(SEED_USERS.map(u => [u.id, u])),
  auditLogs: [],
  autopay: null,
  profile: { ...DEFAULT_USER_PROFILE },
  watchlist: [],
  campaigns: [...SEED_CAMPAIGNS]
};

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load initial state from disk
function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      if (data.mandates) {
        store.mandates = new Map(Object.entries(data.mandates));
      }
      if (data.orders) {
        store.orders = new Map(Object.entries(data.orders));
      }
      if (data.sessions) {
        store.sessions = new Map(Object.entries(data.sessions));
      }
      if (data.users) {
        store.users = new Map(Object.entries(data.users));
      } else {
        store.users = new Map(SEED_USERS.map(u => [u.id, u]));
      }
      if (Array.isArray(data.auditLogs)) {
        store.auditLogs = data.auditLogs;
      }
      if (data.autopay) {
        store.autopay = data.autopay;
      }
      if (data.profile) {
        store.profile = { ...DEFAULT_USER_PROFILE, ...data.profile };
      }
      if (Array.isArray(data.watchlist)) {
        store.watchlist = data.watchlist;
      }
      if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
        store.campaigns = data.campaigns;
      }
      console.log(`💾 Loaded persistent store from disk: ${store.orders.size} orders, ${store.mandates.size} mandates, ${store.users.size} users, ${store.sessions.size} sessions, ${store.campaigns.length} campaigns`);
    }
  } catch (err) {
    console.warn("Disk store load notice:", err.message);
  }
}

const AUDIT_LOG_LIMIT = 200;
let saveDebounceTimer = null;

// Save state to disk asynchronously with temp file rename
function saveToDisk() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    try {
      const payload = {
        mandates: Object.fromEntries(store.mandates),
        orders: Object.fromEntries(store.orders),
        sessions: Object.fromEntries(store.sessions),
        users: Object.fromEntries(store.users),
        auditLogs: store.auditLogs.slice(0, AUDIT_LOG_LIMIT),
        autopay: store.autopay,
        profile: store.profile,
        watchlist: store.watchlist,
        campaigns: store.campaigns,
        updated_at: new Date().toISOString()
      };
      const tmpFile = `${STORE_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
      await fs.promises.rename(tmpFile, STORE_FILE);
    } catch (err) {
      console.warn("Disk store save error:", err.message);
    }
  }, 100);
}

// Initialize on boot
loadFromDisk();

let mongoDb = null;
let isConnecting = false;
let mongoFailedUntil = 0;

export async function getDb() {
  if (mongoDb) return mongoDb;
  if (Date.now() < mongoFailedUntil) return null;
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<db_password>') || isConnecting) return null;

  try {
    isConnecting = true;
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, {
      tls: true,
      serverSelectionTimeoutMS: 2000
    });
    await client.connect();
    mongoDb = client.db('agent_storefront');
    console.log("🍃 MongoDB Connected successfully to Cluster0 ('agent_storefront')");

    // Initialize collections & seed if empty
    const count = await mongoDb.collection('products').countDocuments();
    if (count === 0) {
      await mongoDb.collection('products').insertMany(SEED_PRODUCTS);
      console.log("🌱 Seeded MongoDB with catalog products.");
    }

    return mongoDb;
  } catch (err) {
    // Cache failure for 60 seconds to avoid repeating 2s delays on each db operation
    mongoFailedUntil = Date.now() + 60000;
    return null;
  } finally {
    isConnecting = false;
  }
}

export async function getProducts(category, maxPrice) {
  const db = await getDb();
  if (db) {
    try {
      const query = {};
      if (category && category !== 'all') {
        query.category = { $regex: new RegExp(`^${category}$`, 'i') };
      }
      if (maxPrice) {
        query.price = { $lte: Number(maxPrice) };
      }
      const list = await db.collection('products').find(query).toArray();
      if (list.length > 0) return list;
    } catch (e) {}
  }

  let list = store.products;
  if (category && category !== 'all') {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (maxPrice) {
    list = list.filter(p => p.price <= Number(maxPrice));
  }
  return list;
}

export async function getProductById(id) {
  const db = await getDb();
  if (db) {
    try {
      const item = await db.collection('products').findOne({ id });
      if (item) return item;
    } catch {}
  }
  const inStore = store.products.find(p => p.id === id);
  if (inStore) return inStore;

  // Also search dynamic Amazon & Flipkart 1,000+ catalogs
  try {
    const { AMAZON_CATALOG, FLIPKART_CATALOG } = await import('./catalogGenerator.js');
    const inAmz = AMAZON_CATALOG.find(p => p.id === id);
    if (inAmz) return inAmz;
    const inFkp = FLIPKART_CATALOG.find(p => p.id === id);
    if (inFkp) return inFkp;
  } catch {}

  return null;
}

export async function saveMandate(mandate) {
  store.mandates.set(mandate.mandate_id, mandate);
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('mandates').updateOne(
        { mandate_id: mandate.mandate_id },
        { $set: mandate },
        { upsert: true }
      );
    } catch (e) {}
  }
  return mandate;
}

export async function getMandate(mandate_id) {
  const db = await getDb();
  if (db) {
    try {
      const item = await db.collection('mandates').findOne({ mandate_id });
      if (item) return item;
    } catch {}
  }
  return store.mandates.get(mandate_id) || null;
}

export async function getLatestActiveMandate() {
  const db = await getDb();
  if (db) {
    try {
      const item = await db.collection('mandates').find({ status: 'ACTIVE' }).sort({ created_at: -1 }).limit(1).toArray();
      if (item.length > 0) return item[0];
    } catch {}
  }
  const active = Array.from(store.mandates.values()).filter(m => m.status === 'ACTIVE').sort((a, b) => new Date(b.created_at || b.valid_from || 0) - new Date(a.created_at || a.valid_from || 0));
  return active[0] || null;
}

export async function updateMandate(mandate_id, updateFields) {
  const existing = await getMandate(mandate_id);
  if (!existing) return null;
  const updated = { ...existing, ...updateFields, updated_at: new Date().toISOString() };
  store.mandates.set(mandate_id, updated);
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('mandates').updateOne(
        { mandate_id },
        { $set: updated }
      );
    } catch {}
  }
  return updated;
}

export async function saveOrder(order) {
  store.orders.set(order.order_id, order);
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('orders').updateOne(
        { order_id: order.order_id },
        { $set: order },
        { upsert: true }
      );
    } catch (e) {}
  }
  return order;
}

export async function getOrder(order_id) {
  const db = await getDb();
  if (db) {
    try {
      const item = await db.collection('orders').findOne({ order_id });
      if (item) return item;
    } catch {}
  }
  return store.orders.get(order_id) || null;
}

export async function getAllOrders() {
  const db = await getDb();
  if (db) {
    try {
      const list = await db.collection('orders').find().sort({ created_at: -1 }).toArray();
      if (list.length > 0) return list;
    } catch {}
  }
  return Array.from(store.orders.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export const getOrders = getAllOrders;

export async function clearAllOrders() {
  store.orders.clear();
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('orders').deleteMany({});
    } catch {}
  }
  return true;
}

export async function clearAllMandates() {
  store.mandates.clear();
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('mandates').deleteMany({});
    } catch {}
  }
  return true;
}

export async function saveAutopayRecord(autopay) {
  store.autopay = autopay;
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('autopay').updateOne(
        { type: 'primary_vault' },
        { $set: { type: 'primary_vault', ...autopay } },
        { upsert: true }
      );
    } catch {}
  }
  return autopay;
}

export async function getAutopayRecord() {
  const db = await getDb();
  if (db) {
    try {
      const item = await db.collection('autopay').findOne({ type: 'primary_vault' });
      if (item) return item;
    } catch {}
  }
  return store.autopay;
}

// ─── User Authentication & Profile Store ────────────────────────────────────

export async function findUserById(userId) {
  if (!userId) return null;
  const db = await getDb();
  if (db) {
    try {
      const u = await db.collection('users').findOne({ id: userId });
      if (u) return u;
    } catch {}
  }
  return store.users.get(userId) || null;
}

export async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();
  const db = await getDb();
  if (db) {
    try {
      const u = await db.collection('users').findOne({
        $or: [
          { email: cleanId },
          { phone: identifier.trim() },
          { id: identifier.trim() }
        ]
      });
      if (u) return u;
    } catch {}
  }

  for (const u of store.users.values()) {
    if (
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.phone && u.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, '')) ||
      u.id === identifier
    ) {
      return u;
    }
  }
  return null;
}

export async function createUser(userData) {
  const userId = userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  const newUser = {
    id: userId,
    name: userData.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Shopper'),
    email: cleanEmail,
    phone: userData.phone || '',
    upi_vpa: userData.upi_vpa || 'shopper@oksbi',
    default_max_budget: Number(userData.default_max_budget) || 1500,
    auto_negotiate_coupons: userData.auto_negotiate_coupons !== false,
    preferred_delivery: userData.preferred_delivery || 'fastest_1day',
    allowed_categories: userData.allowed_categories || [
      "electronics", "computers", "accessories", "mobiles", "cables", "wearables", "storage", "gaming", "smarthome"
    ],
    allowed_merchants: userData.allowed_merchants || ["aura-tech", "prime-gadgets", "meesho-direct"],
    created_at: new Date().toISOString()
  };

  store.users.set(userId, newUser);
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('users').insertOne(newUser);
    } catch {}
  }
  return newUser;
}

export async function updateUser(userId, updates) {
  const existing = await findUserById(userId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString()
  };

  store.users.set(userId, updated);
  if (store.profile.id && store.profile.id === userId) {
    store.profile = { ...store.profile, ...updated };
  }
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('users').updateOne({ id: userId }, { $set: updated }, { upsert: true });
    } catch {}
  }
  return updated;
}

export async function getUserProfile(userId = null) {
  if (userId) {
    const user = await findUserById(userId);
    if (user) return user;
  }

  const db = await getDb();
  if (db) {
    try {
      const p = await db.collection('profile').findOne({ type: 'user_preferences' });
      if (p) return { ...store.profile, ...p };
    } catch {}
  }
  return store.profile;
}

export async function saveUserProfile(newProfile, userId = null) {
  if (userId) {
    const updated = await updateUser(userId, newProfile);
    if (updated) return updated;
  }

  store.profile = { ...store.profile, ...newProfile };
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('profile').updateOne(
        { type: 'user_preferences' },
        { $set: { type: 'user_preferences', ...store.profile } },
        { upsert: true }
      );
    } catch {}
  }
  return store.profile;
}

export async function addAuditLog(entry) {
  const log = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };
  store.auditLogs.unshift(log);
  if (store.auditLogs.length > 200) {
    store.auditLogs.pop();
  }
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('audit_logs').insertOne(log);
    } catch {}
  }
  return log;
}

export async function getAuditLogs(limit = 100) {
  const db = await getDb();
  if (db) {
    try {
      const logs = await db.collection('audit_logs').find().sort({ timestamp: -1 }).limit(limit).toArray();
      if (logs.length > 0) return logs;
    } catch {}
  }
  return store.auditLogs.slice(0, limit);
}

export async function getChatSessions() {
  const db = await getDb();
  if (db) {
    try {
      const list = await db.collection('chat_sessions').find().sort({ updated_at: -1 }).toArray();
      if (list && list.length > 0) return list;
    } catch {}
  }
  return Array.from(store.sessions.values()).sort((a, b) => new Date(b.updated_at || b.time || 0) - new Date(a.updated_at || a.time || 0));
}

export async function saveChatSession(sessionData) {
  if (!sessionData || !sessionData.id) return null;
  const now = new Date().toISOString();
  const session = {
    ...sessionData,
    updated_at: now
  };
  store.sessions.set(session.id, session);
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('chat_sessions').updateOne(
        { id: session.id },
        { $set: session },
        { upsert: true }
      );
    } catch {}
  }
  return session;
}

export async function deleteChatSession(sessionId) {
  store.sessions.delete(sessionId);
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('chat_sessions').deleteOne({ id: sessionId });
    } catch {}
  }
  return true;
}

export async function resetDatabase() {
  store.products = [...SEED_PRODUCTS];
  store.mandates.clear();
  store.orders.clear();
  store.auditLogs = [];
  store.autopay = null;
  saveToDisk();

  const db = await getDb();
  if (db) {
    try {
      await db.collection('mandates').deleteMany({});
      await db.collection('orders').deleteMany({});
      await db.collection('audit_logs').deleteMany({});
      await db.collection('autopay').deleteMany({});
      await db.collection('products').deleteMany({});
      await db.collection('products').insertMany(SEED_PRODUCTS);
    } catch {}
  }
  return true;
}

// ─── Watchlist CRUD ───────────────────────────────────────────────────────────

export async function getWatchlist() {
  const db = await getDb();
  if (db) {
    try {
      const list = await db.collection('watchlist').find().sort({ created_at: -1 }).toArray();
      if (list.length > 0) return list;
    } catch {}
  }
  return [...store.watchlist];
}

export async function addWatchlistItem(item) {
  store.watchlist.unshift(item);
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('watchlist').insertOne(item);
    } catch {}
  }
  return item;
}

export async function updateWatchlistItem(id, updates) {
  const idx = store.watchlist.findIndex(w => w.id === id);
  if (idx === -1) return null;
  store.watchlist[idx] = { ...store.watchlist[idx], ...updates, updated_at: new Date().toISOString() };
  const updated = store.watchlist[idx];
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('watchlist').updateOne({ id }, { $set: updated });
    } catch {}
  }
  return updated;
}

export async function deleteWatchlistItem(id) {
  store.watchlist = store.watchlist.filter(w => w.id !== id);
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('watchlist').deleteOne({ id });
    } catch {}
  }
  return true;
}

export async function clearWatchlist() {
  store.watchlist = [];
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('watchlist').deleteMany({});
    } catch {}
  }
  return true;
}

// ─── Merchant Campaign Orchestrator CRUD ─────────────────────────────────────────

export async function getCampaigns() {
  const db = await getDb();
  if (db) {
    try {
      const list = await db.collection('campaigns').find().sort({ created_at: -1 }).toArray();
      if (list.length > 0) return list;
    } catch {}
  }
  return [...store.campaigns];
}

export async function addCampaign(campaign) {
  const item = {
    id: campaign.id || `camp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: campaign.name,
    merchant_id: campaign.merchant_id || "aura-tech",
    merchant_name: campaign.merchant_name || "Amazon India",
    type: campaign.type || "percentage",
    discount_value: Number(campaign.discount_value) || 10,
    target_category: campaign.target_category || "all",
    min_order_value: Number(campaign.min_order_value) || 0,
    is_active: campaign.is_active !== false,
    created_at: new Date().toISOString(),
    ai_buyer_sales_count: 0,
    revenue_unlocked: 0,
    description: campaign.description || "AI Agent exclusive growth campaign"
  };
  store.campaigns.unshift(item);
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('campaigns').insertOne(item);
    } catch {}
  }
  return item;
}

export async function toggleCampaign(id) {
  const idx = store.campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  store.campaigns[idx].is_active = !store.campaigns[idx].is_active;
  store.campaigns[idx].updated_at = new Date().toISOString();
  const updated = store.campaigns[idx];
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('campaigns').updateOne({ id }, { $set: { is_active: updated.is_active, updated_at: updated.updated_at } });
    } catch {}
  }
  return updated;
}

export async function recordCampaignConversion(campaignId, orderAmount) {
  const idx = store.campaigns.findIndex(c => c.id === campaignId);
  if (idx === -1) return;
  store.campaigns[idx].ai_buyer_sales_count = (store.campaigns[idx].ai_buyer_sales_count || 0) + 1;
  store.campaigns[idx].revenue_unlocked = (store.campaigns[idx].revenue_unlocked || 0) + orderAmount;
  saveToDisk();
  const db = await getDb();
  if (db) {
    try {
      await db.collection('campaigns').updateOne({ id: campaignId }, { $inc: { ai_buyer_sales_count: 1, revenue_unlocked: orderAmount } });
    } catch {}
  }
}

