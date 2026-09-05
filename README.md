# Agent-Ready Storefront: Multi-Merchant Autonomous Network with Amazon & Flipkart Storefronts (2,100+ Live Items)
**Razorpay Buildathon — Track 01: AI Growth & Agentic Commerce**

> An autonomous AI agent shops across authentic **Amazon India** (1,050+ items) and **Flipkart Assured** (1,050+ items) storefronts, compares prices/ratings, dynamically negotiates discounts, applies merchant promo coupons, acquires a bounded AP2 permission slip, safely executes checkout on Razorpay test mode, and updates the merchant's live dashboard in real time!

---

## 🏬 Store A: Amazon India Storefront (1,050+ Items)
* **URL:** [http://localhost:3000/merchants/aura-tech](http://localhost:3000/merchants/aura-tech)
* **Design:** Authentic Amazon Dark Navy (`#131921`) Header, Deliver to Bengaluru pin, Prime badge, Star ratings, #1 Best Seller tags, and 1-Click AI Agent Buy via AP2 Mandates.
* **Inventory:** 1,050+ products across Computers, Audio, Laptops, Keyboards, Mice, Cables, Power Banks, Smart Home, and Storage.

---

## ⚡ Store B: Flipkart Assured Storefront (1,050+ Items)
* **URL:** [http://localhost:3000/merchants/prime-gadgets](http://localhost:3000/merchants/prime-gadgets)
* **Design:** Iconic Flipkart Blue (`#2874F0`) Header, `Explore Plus ✦` branding, `Flipkart Assured ✦` quality badges, Green customer rating chips, Bank Offer tags, and Buy via AI Agent buttons.
* **Inventory:** 1,050+ products across Mobiles, TWS Earbuds, Smartwatches, Computer Accessories, Storage, and Gaming.

---

## 🔍 Multi-Store Dynamic Price Negotiation & Coupon Hunter

- **Dynamic Price Matcher:** When Amazon (₹799) competes with Flipkart (₹849), the AI Agent invokes `POST /network/negotiate` to request an automated price match.
- **Autonomous Coupon Application:** Discovers and applies promo codes (`PRICE_MATCH_AI`, `AGENTIC_FIRST10`, `EXPRESS_FREE`) to drop checkout prices automatically.
- **Explainable Savings:** Displays strike-through original pricing (~~₹849~~ $\rightarrow$ **₹719**) with total savings breakdown in the Forensic Audit Ledger.

---

## ⚡ Cryptographic Razorpay Webhook Handler (`POST /webhooks/razorpay`)

- **Security Verification:** Validates the `X-Razorpay-Signature` header using `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` via `crypto.timingSafeEqual`.
- **Asynchronous Settlement:** When bank confirmation arrives (`payment.captured` / `order.paid`), the order is marked as **`OFFICIALLY_SETTLED`** in MongoDB.
- **Tamper-Evident Ledger:** Captures full payload diffs with immutable timestamps in the Forensic Audit Ledger.

---

## 🤖 Real Telegram Bot: `@AgentPayyBot`

Message **[@AgentPayyBot](https://t.me/AgentPayyBot)** on Telegram from your phone:
- Text: *"Buy me a wireless mouse under ₹800"*
- The bot searches across Amazon and Flipkart (2,100+ items), negotiates best coupons, executes 0-OTP Razorpay checkout, and sends you back a formatted receipt message.
- The order automatically appears live in real time on the **Merchant Orders Portal** (`/merchant-portal`)!

---

## 💳 True Headless Payments: Razorpay UPI Autopay (e-Mandate)

1. **One-Time Setup:** The user authorizes a monthly spending cap (e.g. ₹5,000) once via Razorpay Checkout.
2. **Persistent Bank Token Vault:** Razorpay issues a recurring token (`tok_rzp_autopay_xxx`) bound to the user's UPI handle.
3. **100% Autonomous 0-OTP Shopping:** The AI Agent holds this tokenized permission and executes purchases across merchant stores with zero OTP prompts or human interruptions.

---

## 🌐 NPCI UAP, AP2 & x402 Protocol Architecture

* **Discovery Manifest:** `GET /.well-known/agent-commerce.json` (RFC-standard machine-to-machine capabilities manifest).
* **UAP JSON-LD Catalog:** `GET /api/catalog/uap` (Schema.org Product ItemList for autonomous agents).
* **Machine-to-Machine x402 Handshake:** `POST /acp/v1/checkout`
  * When called without an AP2 signature, returns `HTTP 402 Payment Required` + `WWW-Authenticate: AP2-Token` challenge header.
  * When called with an AP2 token (`Authorization: AP2-Token <id>:<sig>`), verifies cryptographic boundaries and settles on Razorpay test mode.

---

## 📈 Merchant Growth: Campaign Orchestrator

* **AI-Targeted Campaigns:** Merchants configure autonomous discount and shipping waiver rules in `/merchant-portal`.
* **Autonomous Discovery:** AI buyer agents automatically detect and apply active merchant campaigns during checkout.
* **Growth Analytics:** Tracks real-time revenue unlocked by AI buyers vs conventional visitors.

---

## 🌐 Real Storefront & Portal URLs

| Window / Role | URL | What It Demonstrates |
|---|---|---|
| **AI Command Studio** | [http://localhost:3000](http://localhost:3000) | Headless UPI Autopay vault, multi-store comparison matrix, coupon hunter, AP2 token inspector, and upsell drawer. |
| **Merchant Growth Portal** | [http://localhost:3000/merchant-portal](http://localhost:3000/merchant-portal) | **Campaign Orchestrator**, Live Orders feed, and **Cryptographic Webhook Settlement** verification! |
| **Amazon India Storefront** | [http://localhost:3000/merchants/aura-tech](http://localhost:3000/merchants/aura-tech) | **1,050+ Products** with authentic Amazon UI, Prime badges, and search. |
| **Flipkart Assured Storefront**| [http://localhost:3000/merchants/prime-gadgets](http://localhost:3000/merchants/prime-gadgets) | **1,050+ Products** with authentic Flipkart UI, Assured badges, and bank offers. |
| **Protocol Manifest (RFC)** | [http://localhost:5000/.well-known/agent-commerce.json](http://localhost:5000/.well-known/agent-commerce.json) | Real machine discovery manifest for AI buyers. |
| **Real Telegram Bot** | [https://t.me/AgentPayyBot](https://t.me/AgentPayyBot) | Real Telegram bot running directly on your phone. |

---

## ⚡ Quick Start Commands

```powershell
# Terminal 1: Backend Server (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend Dashboard (Port 3000)
cd frontend
npm run dev
```
