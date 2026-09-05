# AgentPay — Autonomous Commerce Platform

> **Razorpay Buildathon · Track 01: AI Growth & Agentic Commerce**

An end-to-end autonomous shopping network where AI agents discover products across live **Amazon India** and **Flipkart Assured** storefronts (2,100+ items), negotiate real discounts, apply merchant coupons, settle via cryptographic **AP2 mandate tokens**, execute headless **Razorpay UPI Autopay** checkouts with zero OTP prompts, and report in real time to a live Merchant Growth Portal — all secured with JWT authentication and HMAC-SHA256 mandate signatures.

---

## ✨ Feature Highlights

| Capability | Details |
|---|---|
| 🤖 **AI Shopping Agent** | Groq-powered (LLaMA 3.3 70B) multi-turn conversation with full tool use: search, negotiate, checkout |
| 🏬 **Multi-Merchant Network** | Amazon India (aura-tech) + Flipkart Assured (prime-gadgets) + Meesho Direct — 2,100+ live items |
| 💳 **0-OTP Headless Checkout** | AP2 cryptographic mandate tokens + Razorpay UPI Autopay e-Mandate vault |
| 🔐 **AP2 Permission Slip** | HMAC-SHA256 signed mandate with per-category allow-list, budget cap, and expiry |
| 💰 **Dynamic Price Negotiation** | Cross-merchant price matching + coupon discovery (PRICE_MATCH_AI, AGENTIC_FIRST10, EXPRESS_FREE) |
| 📱 **Telegram Bot** | [@AgentPayyBot](https://t.me/AgentPayyBot) — real phone-to-checkout in seconds |
| 📊 **Merchant Portal** | Live order feed, campaign orchestrator, real-time revenue analytics, webhook settlement proof |
| 🔔 **Watchlist Engine** | Price-drop monitors + scheduled auto-buy with mandate validation |
| 🌐 **NPCI UAP / x402 Protocol** | RFC-standard `.well-known/agent-commerce.json` + JSON-LD UAP catalog for AI buyer discovery |
| 🔒 **JWT Auth** | Cryptographic multi-user sessions with HMAC-SHA256 tokens and strict profile isolation |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│  AI Command Studio · Merchant Portal · 3 Storefronts         │
│  Auth · UPI Autopay Dashboard · Watchlist · Insights         │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST + Streaming
┌───────────────────────▼─────────────────────────────────────┐
│                   Backend (Node.js ESM)                      │
│                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  Auth Engine  │  │  AP2 Mandate │  │  Shopping Agent  │  │
│   │  JWT HS256    │  │  HMAC-SHA256 │  │  Groq LLaMA 3.3  │  │
│   └──────────────┘  └──────────────┘  └──────────────────┘  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  Merchant DB  │  │  Razorpay    │  │  Telegram Bot    │  │
│   │  2,100+ SKUs  │  │  Webhook     │  │  @AgentPayyBot   │  │
│   └──────────────┘  └──────────────┘  └──────────────────┘  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│   │  Watchlist   │  │  Autopay     │  │  RAG (Qdrant)    │  │
│   │  Price Drops │  │  UPI Vault   │  │  Vector Search   │  │
│   └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                        │
           ┌────────────▼───────────┐
           │       Razorpay         │
           │  Orders · Payments ·   │
           │  Webhooks · Autopay    │
           └────────────────────────┘
```

---

## 🔐 Security Model

| Layer | Mechanism |
|---|---|
| **JWT Sessions** | HMAC-SHA256 signed tokens; `JWT_SECRET` required at startup (throws if unset) |
| **OTP** | `crypto.randomInt(1000, 10000)` — cryptographically secure; `'1234'` bypass only when `ENABLE_OTP_SANDBOX=true` |
| **AP2 Mandates** | Per-order HMAC-SHA256 signatures with category allow-list, budget cap, and 15-min expiry |
| **CORS** | Origin whitelist — only reflects allowed origins; no wildcard reflection |
| **Razorpay Webhooks** | `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` via `crypto.timingSafeEqual` |
| **Telegram Webhooks** | `x-telegram-bot-api-secret-token` header validation |
| **User Isolation** | Per-user profiles stored in `users` map; guest `store.profile` never polluted by authenticated sessions |

---

## 🏬 Storefronts

### Amazon India (1,050+ Items)
- **URL:** `http://localhost:3000/merchants/aura-tech`
- Authentic Amazon dark-navy UI — Prime badges, Best Seller tags, 1-Day delivery, star ratings
- Inventory: Computers, Audio, Laptops, Keyboards, Mice, Cables, Power Banks, Smart Home, Storage

### Flipkart Assured (1,050+ Items)
- **URL:** `http://localhost:3000/merchants/prime-gadgets`
- Iconic Flipkart blue UI — Assured badges, SuperCoins, Bank Offers, green rating chips
- Inventory: Mobiles, TWS Earbuds, Smartwatches, Accessories, Storage, Gaming

### Meesho Direct Wholesale
- Factory-direct pricing — 20% off cables & accessories for AI buyers

---

## ⚡ How a Purchase Works

```
User: "Buy me a wireless mouse under ₹800"
  │
  ▼
Agent searches 2,100+ items across Amazon + Flipkart
  │
  ▼
Negotiation engine requests price match — applies best coupon
  (AGENTIC_FIRST10: -10% → ₹719)
  │
  ▼
AP2 mandate acquired: {max_budget: ₹800, categories: ["accessories"], exp: 15min}
Signed: HMAC-SHA256(mandate_id|budget|categories|expiry|merchant)
  │
  ▼
ACP checkout: POST /acp/v1/checkout  →  Razorpay test order created
  │
  ▼
UPI Autopay vault deducted (0-OTP, no interruption)
  │
  ▼
Razorpay webhook → POST /webhooks/razorpay  →  OFFICIALLY_SETTLED
  │
  ▼
Receipt sent to Telegram @AgentPayyBot + live on Merchant Portal
```

---

## 📡 Key API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/send-otp` | Send OTP to identifier |
| `POST` | `/api/auth/login` | Validate OTP → issue JWT |
| `GET` | `/api/auth/me` | Verify JWT → return user profile |
| `GET` | `/.well-known/agent-commerce.json` | RFC machine discovery manifest |
| `GET` | `/api/catalog/uap` | JSON-LD Schema.org UAP product catalog |
| `POST` | `/acp/v1/checkout` | AP2 gated headless checkout (402 → 200) |
| `POST` | `/autopay/authorize` | Authorize UPI Autopay vault |
| `POST` | `/autopay/revoke` | Revoke vault + sweep funds to bank |
| `GET` | `/api/watchlist` | Authenticated watchlist items |
| `POST` | `/api/watchlist` | Add item to price-drop monitor |
| `POST` | `/api/campaigns` | Create merchant campaign |
| `POST` | `/webhooks/razorpay` | HMAC-verified payment settlement |
| `POST` | `/channels/telegram/chat` | Telegram bot message handler |

---

## 💳 UPI Autopay Vault

1. **One-Time Setup** — User authorizes a monthly cap (e.g. ₹10,000) once via Razorpay Checkout UI
2. **Persistent Token** — Razorpay issues a recurring UPI token bound to the user's VPA
3. **Autonomous Spending** — Agent deducts per-purchase within the cap; zero OTP prompts
4. **Vault Dashboard** — Live balance, settlement history, top-up, and one-click revoke with 100% fund sweep back to bank

---

## 📈 Merchant Growth Portal

- **Campaign Orchestrator** — Configure AI-targeted discount rules (percentage, fixed, shipping waiver)
- **Live Orders Feed** — Real-time table of every autonomous and manual order
- **Revenue Analytics** — AI buyer revenue vs conventional visitor revenue
- **Webhook Settlement Proof** — Cryptographic HMAC verification status for each Razorpay payment

---

## 📱 Telegram Bot: @AgentPayyBot

Message **[@AgentPayyBot](https://t.me/AgentPayyBot)** from your phone:

```
You:   Buy me a Sony headphone under ₹3000
Bot:   ✅ Purchased Sony WH-CH520 at ₹2,199
       Order #ord_xyz · Amazon India
       Saved ₹300 via PRICE_MATCH_AI coupon
       Receipt ID: rzp_abc123
```

Supports: `orders`, `status`, `balance`, `watchlist add <item>`, and full natural-language shopping commands.

---

## 🌐 URLs

| Role | URL |
|---|---|
| **AI Command Studio** | [http://localhost:3000](http://localhost:3000) |
| **Merchant Portal** | [http://localhost:3000/merchant-portal](http://localhost:3000/merchant-portal) |
| **Amazon India Store** | [http://localhost:3000/merchants/aura-tech](http://localhost:3000/merchants/aura-tech) |
| **Flipkart Store** | [http://localhost:3000/merchants/prime-gadgets](http://localhost:3000/merchants/prime-gadgets) |
| **Meesho Store** | [http://localhost:3000/merchants/meesho-direct](http://localhost:3000/merchants/meesho-direct) |
| **Agent Discovery Manifest** | [http://localhost:5000/.well-known/agent-commerce.json](http://localhost:5000/.well-known/agent-commerce.json) |
| **Telegram Bot** | [https://t.me/AgentPayyBot](https://t.me/AgentPayyBot) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Razorpay test account](https://dashboard.razorpay.com/) (for key + webhook secret)
- A [Groq API key](https://console.groq.com/) (free tier works)

### 1 — Clone & Configure

```bash
git clone https://github.com/SHXZ7/agentpay.git
cd agentpay
```

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

```env
# Required — generate a strong random string (≥ 32 chars)
JWT_SECRET=your_strong_jwt_secret_here

# Razorpay (get from dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Groq (console.groq.com)
GROQ_API_KEY=gsk_your_groq_api_key

# OTP — set to 'true' in dev/test to use '1234' as OTP
ENABLE_OTP_SANDBOX=true
```

### 2 — Install & Run

```bash
# Terminal 1 — Backend (Port 5000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (Port 3000)
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** to launch the AI Command Studio.

### 3 — Try It

```
1. Click "Demo Login" (sandbox OTP: 1234)
2. Type: "Find me a wireless mouse under ₹800 on Amazon"
3. Watch the agent search, negotiate, and execute autonomous checkout
4. Check /merchant-portal to see the live order appear
```

---

## 🧪 Tests

```bash
# End-to-end JWT authentication & multi-user isolation (requires server on :5000)
node backend/test_jwt_auth.js

# Multi-turn option selection & anti-substitution verification
node backend/test_option_selection.js

# Full scenario suite
node backend/test_all_scenarios.js
```

All tests exit with code 0 on a clean install.

---

## 📁 Project Structure

```
agentpay/
├── backend/
│   ├── src/
│   │   ├── server.js          # HTTP server, all routes, CORS, auth
│   │   ├── agent.js           # Groq shopping agent + tool execution
│   │   ├── auth.js            # JWT signing/verification, OTP engine
│   │   ├── db.js              # In-memory store + MongoDB sync
│   │   ├── mandates.js        # AP2 HMAC mandate engine
│   │   ├── autopay.js         # UPI Autopay vault logic
│   │   ├── watchlist.js       # Price-drop monitor + auto-buy
│   │   ├── merchants.js       # 2,100+ item catalog generator
│   │   ├── catalogGenerator.js# UAP JSON-LD catalog
│   │   ├── negotiation.js     # Dynamic price matching + coupons
│   │   ├── webhooks.js        # Razorpay webhook verification
│   │   ├── rag.js             # Qdrant vector RAG integration
│   │   └── channels/
│   │       ├── telegram.js    # @AgentPayyBot handler
│   │       └── whatsapp.js    # WhatsApp channel handler
│   ├── data/store.json        # Persistent runtime state (gitignored)
│   ├── .env.example           # Environment template
│   └── test_*.js              # Test suites
└── frontend/
    ├── app/                   # Next.js 14 App Router pages
    ├── components/            # React component library
    │   ├── AgentConsole.jsx   # Main AI chat interface
    │   ├── UPIAutopayDashboard.jsx
    │   ├── WatchlistDashboard.jsx
    │   ├── InsightsDashboard.jsx
    │   ├── MerchantPortalDashboard.jsx
    │   └── ...
    └── lib/api.js             # Typed API client with auth headers
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **AI Model** | Groq · LLaMA 3.3 70B Versatile |
| **Frontend** | Next.js 14 · React 18 · Tailwind CSS |
| **Backend** | Node.js · ESM · Native `http` |
| **Auth** | Custom HMAC-SHA256 JWT (no external lib) |
| **Payments** | Razorpay Orders API · UPI Autopay |
| **Database** | In-memory Map + MongoDB Atlas (optional) |
| **Vector RAG** | Qdrant Cloud |
| **Messaging** | Telegram Bot API · Long polling |
| **Security** | `crypto.randomInt` OTP · `timingSafeEqual` HMAC |

---

*Built for the Razorpay Buildathon 2025 · Track 01: AI Growth & Agentic Commerce*
