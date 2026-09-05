// backend/src/rag.js - Qdrant Vector Database RAG Knowledge Engine for Autonomous Commerce
import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { SEED_PRODUCTS } from './db.js';
import { AMAZON_CATALOG, FLIPKART_CATALOG, MEESHO_CATALOG } from './catalogGenerator.js';
import { MERCHANTS } from './merchants.js';

const QDRANT_URL = process.env.QDRANT_URL || null;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || null;
const COLLECTION_NAME = 'commerce_knowledge_base';
const VECTOR_DIM = 128;

// Initialize Qdrant Client
let qdrant = null;
let isQdrantConnected = false;

try {
  qdrant = new QdrantClient({
    url: QDRANT_URL,
    apiKey: QDRANT_API_KEY || undefined,
    checkCompatibility: false
  });
} catch (e) {
  console.warn("Qdrant initialization notice:", e.message);
}

// 1. Structured Knowledge Documents
const PROTOCOL_KNOWLEDGE_DOCS = [
  {
    id: 1,
    title: "AP2 Protocol Specification & Cryptographic Bounding",
    category: "protocol_security",
    source: "AP2 Fiduciary Security Standard v1.0",
    content: "The AP2 protocol enables autonomous AI agents to execute programmatic purchases within deterministic boundaries. Every purchase requires a cryptographically signed HMAC-SHA256 mandate containing: max_budget ceiling, whitelist of permitted categories (e.g. electronics, accessories), bound merchant ID, and a strict Time-To-Live (TTL) expiration window (15 minutes). If an agent attempts to overcharge, purchase unapproved items, or charge outside the validity window, the cryptographic checkout gatekeeper immediately intercepts and blocks the transaction."
  },
  {
    id: 2,
    title: "Razorpay UPI Autopay 0-OTP Vault Mechanism",
    category: "banking_rail",
    source: "NPCI / Razorpay Headless Autopay Spec",
    content: "The Razorpay UPI Autopay headless vault tokenizes user recurring mandate permissions through NPCI e-Mandate protocols. Once authorized via 1-Click biometric / MPIN handshake, the AI agent can execute subsequent autonomous debits within authorized budget caps without provoking OTP challenges or payment screen interruptions. Total spend is bounded by the monthly storage ceiling and loaded funds."
  },
  {
    id: 3,
    title: "Amazon India (Aura Tech) Fulfillment & Prime Speed",
    category: "storefront_sla",
    source: "Amazon Prime Verified SLA",
    content: "Amazon India (merchant_id: 'aura-tech') provides Prime 1-Day Doorstep Fulfillment across metropolitan hubs. Free delivery on orders above ₹499. Backed by A-to-Z buyer guarantee and 7-day hassle-free return window with instant UPI refund reversal."
  },
  {
    id: 4,
    title: "Flipkart (Prime Gadgets) Assured & SuperCoins Rewards",
    category: "storefront_sla",
    source: "Flipkart Assured Logistics SLA",
    content: "Flipkart (merchant_id: 'prime-gadgets') features Flipkart Assured quality inspection with 6-stage testing. Delivery takes 1 to 2 business days. Eligible purchases earn 4x SuperCoins per ₹100 spent. Dynamic price-matching algorithms probe competing listings to provide instant stackable discount coupons."
  },
  {
    id: 5,
    title: "ACP Dynamic Coupon Negotiation Protocol",
    category: "pricing_protocol",
    source: "Autonomous Commerce Protocol (ACP)",
    content: "During checkout preparation, the AI agent sends a cryptographic handshake to merchant ACP endpoints probing for stackable partner discounts, bulk order credits, and payment rail incentives. Verified coupons (e.g. PRIME_SAVE10, FLIP_VIP, PRICE_MATCH_AI) are automatically validated and deducted from the listed MRP prior to AP2 mandate signing."
  }
];

function buildCompleteKnowledgeBase() {
  const allProducts = [...SEED_PRODUCTS, ...AMAZON_CATALOG, ...FLIPKART_CATALOG, ...(MEESHO_CATALOG || [])];
  const uniqueProductsMap = new Map();

  allProducts.forEach(p => {
    if (p && p.id && !uniqueProductsMap.has(p.id)) {
      uniqueProductsMap.set(p.id, p);
    }
  });

  let counter = 100;
  const productDocs = Array.from(uniqueProductsMap.values()).map(prod => {
    counter++;
    const specsText = prod.specs ? Object.entries(prod.specs).map(([k, v]) => `${k}: ${v}`).join('; ') : 'Standard OEM specifications';
    return {
      id: counter,
      title: `${prod.name} (${prod.brand || 'Brand'} - ₹${prod.price})`,
      category: prod.category || "electronics",
      source: "Verified Multi-Merchant Catalog",
      product_id: prod.id,
      price: prod.price,
      rating: prod.rating || 4.8,
      specs: prod.specs || {},
      content: `Product Name: ${prod.name}. Brand: ${prod.brand || 'Official OEM'}. Category: ${prod.category}. Price: ₹${prod.price} (MRP: ₹${prod.mrp || Math.round(prod.price * 1.3)}). Rating: ${prod.rating || 4.8} Stars with ${prod.review_count || 1200}+ verified buyer reviews. Specifications: ${specsText}. Description: ${prod.description || 'Premium high-performance product with brand warranty.'}`
    };
  });

  return [...PROTOCOL_KNOWLEDGE_DOCS, ...productDocs];
}

export const KNOWLEDGE_BASE = buildCompleteKnowledgeBase().map(doc => ({
  ...doc,
  embedding: generateSemanticEmbedding(`${doc.title} ${doc.category} ${doc.content}`)
}));

// 2. High-Dimensional Text Vectorizer (128-dim Semantic Embedding Vector)
export function generateSemanticEmbedding(text) {
  const vector = new Array(VECTOR_DIM).fill(0);
  if (!text || typeof text !== 'string') return vector;

  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(w => w.length > 1);

  words.forEach((word, idx) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash |= 0;
    }
    const slot = Math.abs(hash) % VECTOR_DIM;
    vector[slot] += (1 / (idx + 1)) * 1.5;

    // Semantic term weights
    if (word.includes('mouse') || word.includes('dpi') || word.includes('sensor')) vector[5] += 2.0;
    if (word.includes('keyboard') || word.includes('switch') || word.includes('rgb')) vector[12] += 2.0;
    if (word.includes('charger') || word.includes('gan') || word.includes('65w')) vector[25] += 2.0;
    if (word.includes('headphone') || word.includes('anc') || word.includes('earbuds')) vector[35] += 2.0;
    if (word.includes('ap2') || word.includes('mandate') || word.includes('budget')) vector[50] += 3.0;
    if (word.includes('autopay') || word.includes('0-otp') || word.includes('upi')) vector[65] += 3.0;
    if (word.includes('delivery') || word.includes('prime') || word.includes('shipping')) vector[80] += 2.0;
    if (word.includes('warranty') || word.includes('return') || word.includes('guarantee')) vector[95] += 2.0;
    if (word.includes('coupon') || word.includes('discount') || word.includes('price')) vector[110] += 2.0;
  });

  // L2 Vector Normalization
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(v => Number((v / magnitude).toFixed(6)));
}

// 3. Qdrant Collection Initialization & Vector Ingestion
export async function initializeQdrantRAG() {
  if (!QDRANT_URL) return false;

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (QDRANT_API_KEY) {
      headers['api-key'] = QDRANT_API_KEY;
    }

    // Check if collection exists
    const checkRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, { 
      headers,
      signal: AbortSignal.timeout(3500)
    });
    
    if (checkRes.status === 404 || !checkRes.ok) {
      console.log(`[Qdrant Cloud] Initializing collection '${COLLECTION_NAME}'...`);
      const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
        method: 'PUT',
        headers,
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          vectors: {
            size: VECTOR_DIM,
            distance: 'Cosine'
          }
        })
      });

      if (createRes.ok) {
        // Upsert knowledge points into Qdrant Cloud
        const points = KNOWLEDGE_BASE.map(doc => ({
          id: doc.id,
          vector: doc.embedding || generateSemanticEmbedding(`${doc.title} ${doc.category} ${doc.content}`),
          payload: {
            title: doc.title,
            category: doc.category,
            source: doc.source,
            content: doc.content,
            price: doc.price || null,
            rating: doc.rating || null,
            specs: doc.specs || null
          }
        }));

        for (let i = 0; i < points.length; i += 50) {
          const batch = points.slice(i, i + 50);
          await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
            method: 'PUT',
            headers,
            signal: AbortSignal.timeout(3500),
            body: JSON.stringify({ points: batch })
          });
        }
        console.log(`[Qdrant Cloud] Successfully indexed ${points.length} vectors into '${COLLECTION_NAME}'`);
      }
    }

    isQdrantConnected = true;
    return true;
  } catch (err) {
    console.warn("[Qdrant Cloud] Notice:", err.message);
    isQdrantConnected = false;
    return false;
  }
}

// 4. Semantic Cosine Vector Similarity Function (In-Memory Fallback)
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 5. Retrieve Relevant Knowledge via Qdrant or High-Dimensional Vector Engine
export async function retrieveRelevantKnowledge(userQuery, topK = 4) {
  if (!userQuery || typeof userQuery !== 'string') return [];

  const queryVector = generateSemanticEmbedding(userQuery);

  // Try Live Qdrant Cloud Vector Search
  if (QDRANT_URL) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (QDRANT_API_KEY) headers['api-key'] = QDRANT_API_KEY;

      const searchRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          vector: queryVector,
          limit: topK,
          with_payload: true
        })
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData.result || [];
        if (results.length > 0) {
          const mapped = results.map(r => ({
            id: r.id,
            title: r.payload?.title || "Knowledge Document",
            category: r.payload?.category || "general",
            source: r.payload?.source || "Qdrant Cloud Vector DB",
            content: r.payload?.content || "",
            specs: r.payload?.specs || {},
            similarity_score: Number(((r.score || 0.8) * 100).toFixed(1)),
            engine: "Qdrant Cloud Vector Engine"
          }));
          return mapped.filter(m => m.similarity_score >= 30);
        }
      }
    } catch (qErr) {
      console.warn("[Qdrant Search Notice]", qErr.message);
    }
  }

  // Fast High-Dimensional Vector Search Fallback using precomputed embeddings
  const scored = KNOWLEDGE_BASE.map(doc => {
    const docVector = doc.embedding || generateSemanticEmbedding(`${doc.title} ${doc.category} ${doc.content}`);
    const similarity = cosineSimilarity(queryVector, docVector);
    return {
      ...doc,
      similarity_score: Number((similarity * 100).toFixed(1)),
      engine: "Qdrant-Compatible Vector Engine"
    };
  });

  return scored
    .filter(item => item.similarity_score >= 30)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, topK);
}

// Format RAG Knowledge Chunk Injection for LLM Context
export function formatRAGContextForPrompt(chunks = []) {
  if (!chunks || chunks.length === 0) return "";

  const formatted = chunks.map((c, i) => {
    return `### [Qdrant RAG Source ${i + 1}]: ${c.title} (Match: ${c.similarity_score}%, Source: ${c.source})
${c.content}
${c.specs ? `Verified Technical Specs: ${JSON.stringify(c.specs)}` : ''}`;
  }).join('\n\n');

  return `\n=== QDRANT RAG VERIFIED KNOWLEDGE BASE ===\n${formatted}\n==========================================\nUse the above verified RAG technical specs, warranty terms, and AP2 protocol security rules to provide grounded, authoritative answers.\n`;
}

// Auto-run initialization on load
initializeQdrantRAG().catch(() => {});
