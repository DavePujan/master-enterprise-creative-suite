# Enterprise Plans, Credit Top-Ups & Payment Gateway Architecture

> 📌 **Technical Reference Specification (LOCKED)**  
> This document details the commercial pricing tiers, on-demand credit booster packs, payment gateway integration mechanics (Razorpay / Stripe), and operational security requirements across the **Writopedia Creative Suite**.

---

## 1. 🛡️ Razorpay Environment & Operational Safety Invariants

### A. Current Environment: TEST MODE ONLY
Implementation, integration testing, and local/staging verification **MUST use Razorpay Test Mode only**.
- Do **NOT** switch the Razorpay Dashboard to Live Mode during development or testing.
- Test Mode operates against real Razorpay API endpoints with test credentials (`rzp_test_...`) and moves zero real funds.
- Live Mode is activated only through a human-controlled production release procedure after all automated tests pass.

### B. Strict Account Safety Prohibitions
The AI coding agent is **strictly prohibited** from performing unauthorized account or merchant operations:
- No switching Test / Live mode on the Razorpay Dashboard.
- No regenerating API keys or rotating webhook secrets.
- No modifying KYC, banking, settlement, or business configuration.
- No altering auto-capture settings.
- No creating recurring Razorpay subscription objects (Writopedia uses fixed-term orders).
- No real-money transactions during testing.
- No silent fallbacks to fake payment success upon gateway error.

### C. Mode & Credential Consistency
- `RAZORPAY_MODE` must be explicitly declared as `"test"` or `"live"`.
- Server startup validates key prefix consistency (`rzp_test_` vs `rzp_live_`).
- **Production Fatal Crash**: If `NODE_ENV === "production"` and `ENABLE_PAYMENT_SIMULATION === "true"`, the server immediately throws a fatal exception and halts.

---

## 2. 🌐 Commercial Model & Currency Standard

Writopedia operates on a dual-currency financial standard backed by automated geolocation detection and Razorpay checkout:
- **Baseline Exchange Standard**: **$1.00 USD = ₹93.00 INR**
- **Effective Credit Rates**:
  - **Starter / Pilot Tier**: **₹15.00 / $0.17 per Credit**
  - **Growth / Plus Tier**: **₹12.50 / $0.13 per Credit**
  - **Best Value / Pro Tier**: **₹10.00 / $0.10 per Credit**
- **Profit Target**: High-margin generative AI operations maintaining **65% to 85%+ gross margin** after third-party compute (Google Gemini, Fal AI, OpenAI) and payment gateway processing fees.

---

## 3. 🏢 Enterprise Subscription Plans

Subscriptions grant monthly recurring credit allocations, team workspace seats, and cloud asset storage. All paid plans offer an annual billing option with a **10% discount**.

> **Data Model Distinction**: Transaction amounts (`inrSubunits`, `usdSubunits`) are strictly separated from customer-facing display copy (`advertisedMonthlyEquivalentInr`, `advertisedMonthlyEquivalentUsd`) to avoid rounding drift.

| Tier | Monthly Price | Annual Total Billed | Advertised Monthly Equivalent | Monthly Credits | Total Annual Credits | Unit Cost / Credit | Team Seats | Storage & Retention | Support Level |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Free Starter** | ₹0 / $0 | ₹0 / $0 | ₹0 / $0 | 50 *(one-time)* | — | Free | 1 User | 250 MB / 7 Days | Community |
| **Pilot Tier** | ₹1,950 / $22 | ₹21,060 / $237.60 | **₹1,755 / $19** | **130 Credits** | **1,560 Credits** | ₹15.00 / $0.17 | 1 User | 1 GB / 1 Month | Standard Email |
| **Plus Tier** | ₹10,000 / $106 | ₹108,000 / $1,144.80 | **₹9,000 / $96** | **800 Credits** | **9,600 Credits** | ₹12.50 / $0.13 | 3 Users | 5 GB / 3 Months | Priority Queue |
| **Pro Tier** | ₹25,000 / $265 | ₹270,000 / $2,862.00 | **₹22,500 / $239** | **2,500 Credits** | **30,000 Credits** | ₹10.00 / $0.10 | 5 Users | 100 GB / 6 Months | Dedicated Account Mgr |
| **Enterprise** | Custom Quote | Custom Quote | Custom Quote | **Unlimited / Custom** | Negotiated | Negotiated | Unlimited | Unlimited / Permanent | 24/7 Dedicated + Team SLA |

### Enterprise Sales Inquiry Pipeline
For organizations requiring custom model fine-tuning, HIPAA/SOC-2 BAA, or invoice-based wire transfer:
- **Component**: [EnterprisePlan.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/EnterprisePlan.tsx) (`showSalesForm` modal)
- **Endpoint**: `POST /api/contact-sales`
- **Controller**: [salesRoutes.ts](file:///e:/A_Writopedia/apps/api/src/modules/sales/salesRoutes.ts)
- **Repository**: [salesRepository.ts](file:///e:/A_Writopedia/apps/web/src/infrastructure/repositories/salesRepository.ts)

---

## 4. 💳 On-Demand Credit Top-Up Booster Packs

Users who deplete their monthly allowance or need immediate compute without altering their subscription tier can acquire one-off booster packs via [CreditTopUp.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/CreditTopUp.tsx).

| Booster Pack | Plan Identifier | Price (INR) | Price (USD) | Credits Granted | Unit Rate | Equivalent Output Power |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Starter Booster** | `booster-starter` | **₹1,500** | **$17** | **100** | ₹15.00 / $0.17 | 50 Fast Images or 10 Fast Videos or 20 Master Strategies |
| **Power Booster** *(Popular)* | `booster-power` | **₹6,250** | **$66** | **500** | ₹12.50 / $0.13 | 250 Fast Images or 50 Fast Videos or 20 Full 5-Asset Decks |
| **Super Booster** *(Saver)* | `booster-super` | **₹11,000** | **$115** | **1,100** | ₹10.00 / $0.10 | 550 Fast Images or 110 Fast Videos or 110 Master Strategies |

### Dynamic Recommendation Algorithm
When an AI generative action fails due to insufficient balance, the system computes the exact missing gap (`missingCredits = requiredCredits - availableCredits`) and maps it via `findRecommendedCreditPack()`:
```typescript
if (missingCredits <= 100) return 'booster-starter'; // 100 credits
if (missingCredits <= 500) return 'booster-power';   // 500 credits
return 'booster-super';                              // 1,100 credits
```

---

## 5. ⚡ Generation Credit Consumption Matrix

| Modality / Gem | Model / Provider | Standard AI Cost | Human-Touch Refinement | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Fast Image** | Imagen 3.0 / Nano Banana | **2 Credits** | 20 Credits | Rapid ideation, draft mockups |
| **Standard Image** | Imagen 3.0 Standard | **3 Credits** | 30 Credits | Standard social posts & assets |
| **Pro Image** | Flux Pro / Nano Banana Pro | **4 Credits** | 45 Credits | High-fidelity photorealistic visual |
| **Plus Image** | GPT Image 2 | **5 Credits** | 50 Credits | Complex brand-grounded composition |
| **Fast Video** | Google Veo 3.1 Lite | **10 Credits** | 100 Credits | 720p draft motion, fast turnaround |
| **Conversational Video**| Google Omni 1.1 Flash | **20 Credits** | 200 Credits | Multi-turn chat video editing |
| **Standard Video** | Google Veo 3.1 Fast | **20 Credits** | 200 Credits | 1080p rapid preview |
| **Pro Video** | Google Veo 3.1 Pro | **40 Credits** | 400 Credits | 4K cinema quality, dual keyframes |
| **Motion Video** | Kling 3.0 Standard | **40 Credits** | 400 Credits | High-action continuity, multi-shot |
| **Cinematic Video** | Seedance 2.0 Cinematic | **80 Credits** | 800 Credits | Reference conditioning + audio sync |
| **Voiceover (TTS)** | Gemini Lyra / Google TTS | **2 Credits** | 20 Credits | Natural multilingual speech |
| **Music Clip (30s)** | Lyria 3.5 Clip | **5 Credits** | 50 Credits | Commercial background music |
| **Music Pro (Full)** | Lyria 3.5 Pro | **10 Credits** | 100 Credits | Full studio instrumental track |
| **Corporate PPT** | Gemini 2.5 Pro Presentation | **10 Credits** | 100 Credits | 5–12 slide structured pitch deck |
| **Campaign Strategy** | Gemini 2.5 Pro Strategist | **5 Credits** | 50 Credits | 16-dimension strategy playbook |
| **Campaign 5-Asset Deck**| Multi-model pipeline | **25 Credits** | 250 Credits | 5 cohesive visuals + headlines |

---

## 6. 🛠️ Payment Gateway Architecture & State Machine

### A. Explicit Payment State Machine
```
           ┌──────────────┐
           │   created    │
           └──────┬───────┘
     ┌────────────┼────────────┐
     ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│authorized│ │  failed  │ │ expired  │
└────┬─────┘ └──────────┘ └──────────┘
     ├────────────┐
     ▼            ▼
┌──────────┐ ┌──────────┐
│ captured │ │  failed  │
└────┬─────┘ └──────────┘
     ├──────────────────────┐
     ▼                      ▼
┌──────────┐      ┌──────────────────┐
│ refunded │      │partially_refunded│
└──────────┘      └──────────────────┘
```

### B. Unified Webhook Fulfillment Pipeline
Both `payment.captured` and `order.paid` funnel into a shared idempotent fulfillment path:
```
payment.captured ──┐
                   ├──> resolve payment/order ──> idempotency check ──> atomic fulfillment
order.paid ────────┘
```
- Raw byte buffer captured via `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })`.
- Cryptographic verification via `crypto.timingSafeEqual`.
- Idempotency deduplication using `x-razorpay-event-id`.

---

## 7. 🚀 Human-Controlled Go-Live Procedure

When all automated security tests pass and staging verification completes:
1. Human generates Live API Keys (`rzp_live_...`) in the Razorpay Dashboard.
2. Human configures Live Webhook URL (`https://yourdomain.com/api/payment/webhook`) with `payment.captured` and `order.paid`.
3. Human sets production environment variables:
   - `RAZORPAY_MODE=live`
   - `RAZORPAY_KEY_ID=rzp_live_...`
   - `RAZORPAY_KEY_SECRET=...`
   - `RAZORPAY_WEBHOOK_SECRET=...`
   - `ENABLE_PAYMENT_SIMULATION=false`
4. Deploy production build.

---

## 8. 🤖 Razorpay MCP Server Integration

Writopedia developers and AI agents have direct access to the official **Razorpay MCP Server** (`https://mcp.razorpay.com/mcp`) for automated payment verification, order inspection, and settlement reconciliation.

See the dedicated documentation:
- 📖 [Razorpay MCP Technical Specification](file:///e:/A_Writopedia/docs/RAZORPAY_MCP.md)
- 🤖 [Agent MCP Capabilities Reference](file:///e:/A_Writopedia/agent/RAZORPAY_MCP.md)

