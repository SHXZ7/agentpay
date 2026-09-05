// backend/src/merchants.js - Multi-Merchant Network Registry linked to Differentiated Catalogs
import { AMAZON_CATALOG, FLIPKART_CATALOG, MEESHO_CATALOG, filterAndPaginateCatalog } from './catalogGenerator.js';

export const MERCHANTS = [
  {
    id: "aura-tech",
    store_type: "amazon",
    name: "Amazon India (Aura Tech Partner)",
    tagline: "India's Largest Online Store • 1-Day Prime Delivery",
    domain: "amazon.in",
    badge: "Amazon Prime Authorized",
    rating: 4.8,
    review_count: 85400,
    shipping_speed: "FREE Delivery by Tomorrow for Prime",
    total_inventory: AMAZON_CATALOG.length,
    theme: {
      primary: "#131921",
      accent: "#FF9900",
      bg: "bg-[#0F1111]"
    },
    products: AMAZON_CATALOG
  },
  {
    id: "prime-gadgets",
    store_type: "flipkart",
    name: "Flipkart (Prime Gadgets Assured)",
    tagline: "Ab Har Wish Hogi Poori • Flipkart Plus & Assured",
    domain: "flipkart.com",
    badge: "Flipkart Assured ✦",
    rating: 4.6,
    review_count: 64200,
    shipping_speed: "Free Express Delivery with SuperCoins",
    total_inventory: FLIPKART_CATALOG.length,
    theme: {
      primary: "#2874F0",
      accent: "#FFE500",
      bg: "bg-[#F1F3F6]"
    },
    products: FLIPKART_CATALOG
  },
  {
    id: "meesho-direct",
    store_type: "meesho",
    name: "Meesho (Direct Supplier Network)",
    tagline: "Lowest Factory Direct Prices • Zero Commission Wholesale",
    domain: "meesho.com",
    badge: "Direct Factory Rate 🏷️",
    rating: 4.5,
    review_count: 98200,
    shipping_speed: "Factory Direct Free Shipping (3-4 Days)",
    total_inventory: MEESHO_CATALOG.length,
    theme: {
      primary: "#F43397",
      accent: "#FF69B4",
      bg: "bg-[#FFF0F6]"
    },
    products: MEESHO_CATALOG
  }
];

export function getAllMerchants() {
  return MERCHANTS.map(m => ({
    id: m.id,
    store_type: m.store_type,
    name: m.name,
    tagline: m.tagline,
    domain: m.domain,
    badge: m.badge,
    rating: m.rating,
    review_count: m.review_count,
    shipping_speed: m.shipping_speed,
    total_inventory: m.products.length,
    sample_products: m.products.slice(0, 6)
  }));
}

export function getMerchantById(id) {
  return MERCHANTS.find(m => m.id === id || m.store_type === id) || MERCHANTS[0];
}

export function getMerchantProducts(merchantId, options = {}) {
  const merchant = getMerchantById(merchantId);
  return filterAndPaginateCatalog(merchant.products, options);
}

export function searchAcrossAllMerchants(queryKeyword = '', limit = 15) {
  const q = (queryKeyword || '').toLowerCase().trim();
  const searchTerms = q.split(/\s+/).filter(t => t.length > 1);
  const results = [];

  const isChargerQuery = q.includes("charger") || q.includes("adapter") || q.includes("power bank") || q.includes("gan") || q.includes("20w") || q.includes("65w");
  const isCableQuery = q.includes("cable") || q.includes("wire") || q.includes("cord");
  const isMouseQuery = q.includes("mouse") || q.includes("mice");
  const isKeyboardQuery = q.includes("keyboard") || q.includes("keypad");
  const isHeadphoneQuery = q.includes("headphone") || q.includes("earbuds") || q.includes("earphone") || q.includes("headset") || q.includes("airpod");
  const isPhoneQuery = !isChargerQuery && !isCableQuery && (q.includes("phone") || q.includes("iphone") || q.includes("mobile") || q.includes("smartphone"));

  for (const merchant of MERCHANTS) {
    const scored = merchant.products.map(p => {
      if (!q) return { product: p, score: 1 };
      const nameL = (p.name || '').toLowerCase();
      const brandL = (p.brand || '').toLowerCase();
      const catL = (p.category || '').toLowerCase();
      const descL = (p.description || '').toLowerCase();
      
      let score = 0;
      if (nameL === q) score += 120;
      if (nameL.startsWith(q)) score += 70;
      if (nameL.includes(q)) score += 50;
      if (brandL.includes(q)) score += 30;
      if (catL.includes(q)) score += 20;
      if (descL.includes(q)) score += 10;

      for (const term of searchTerms) {
        if (nameL.includes(term)) score += 25;
        if (brandL.includes(term)) score += 15;
        if (catL.includes(term)) score += 10;
        if (descL.includes(term)) score += 5;

        // Exact model number match bonus
        if (/^\d+$/.test(term) && (nameL.includes(`model ${term}`) || nameL.includes(`(${term})`) || nameL.includes(` ${term}`) || nameL.includes(term))) {
          score += 200;
        }
      }

      // ─── Semantic Anti-Substitution Category Filtering ─────────────────────
      if (isChargerQuery) {
        if (nameL.includes("charger") || nameL.includes("adapter") || (nameL.includes("power bank") && q.includes("power"))) {
          score += 150;
          if (q.includes("iphone") && (nameL.includes("iphone") || descL.includes("iphone") || brandL === "apple" || brandL === "ugreen" || brandL === "anker" || brandL === "lg")) {
            score += 100;
          }
        } else if (catL === "mobiles" || nameL.includes("iphone 16") || nameL.includes("phone")) {
          // Severely penalize mobile phones when user searched for a charger!
          score -= 500;
        } else if (nameL.includes("cable") && !q.includes("cable")) {
          score -= 200;
        }
      } else if (isCableQuery) {
        if (nameL.includes("cable") || nameL.includes("wire") || catL === "cables") {
          score += 100;
        } else if (catL === "mobiles") {
          score -= 500;
        }
      } else if (isMouseQuery) {
        if ((nameL.includes("mouse pad") || nameL.includes("mousepad")) && !q.includes("pad") && !q.includes("mat")) {
          score -= 400; // Penalize mouse pads when searching for a mouse!
        } else if (nameL.includes("mouse") || nameL.includes("mice")) {
          score += 100;
        } else {
          score -= 400;
        }
      } else if (isKeyboardQuery) {
        if (nameL.includes("keyboard") || nameL.includes("keypad")) {
          score += 100;
        } else {
          score -= 400;
        }
      } else if (isHeadphoneQuery) {
        if (nameL.includes("headphone") || nameL.includes("earbud") || nameL.includes("headset") || nameL.includes("airpod") || nameL.includes("audio")) {
          score += 100;
        } else {
          score -= 400;
        }
      } else if (isPhoneQuery) {
        if (catL === "mobiles" || nameL.includes("iphone") || nameL.includes("phone")) {
          score += 100;
        } else if (catL === "cables" || catL === "accessories") {
          score -= 200;
        }
      }

      return { product: p, score };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    scored.forEach(({ product }) => {
      results.push({
        merchant_id: merchant.id,
        store_type: merchant.store_type,
        merchant_name: merchant.name,
        merchant_badge: merchant.badge,
        merchant_rating: merchant.rating,
        shipping_speed: merchant.shipping_speed,
        product
      });
    });
  }

  // Sort overall results by score and relevance
  return results.slice(0, limit * 2);
}

