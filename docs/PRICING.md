# Enterprise Plans, Credit Top-Ups & Payment Gateway Architecture

> 📌 **Technical Reference Specification**  
> This document details the commercial pricing tiers, on-demand credit booster packs, payment gateway integration mechanics (Razorpay / Stripe), and identified integration defects across the **Writopedia Creative Suite**.

---

## 1. 🌐 Commercial Model & Currency Standard

Writopedia operates on a dual-currency financial standard backed by automated geolocation detection and Razorpay checkout:
- **Baseline Exchange Standard**: **$1.00 USD = ₹93.00 INR**
- **Effective Credit Rates**:
  - **Starter / Pilot Tier**: **₹15.00 / $0.17 per Credit**
  - **Growth / Plus Tier**: **₹12.50 / $0.13 per Credit**
  - **Best Value / Pro Tier**: **₹10.00 / $0.10 per Credit**
- **Profit Target**: High-margin generative AI operations maintaining **65% to 85%+ gross margin** after third-party compute (Google Gemini, Fal AI, OpenAI) and payment gateway processing fees.

---

## 2. 🏢 Enterprise Subscription Plans

Subscriptions grant monthly recurring credit allocations, team workspace seats, and cloud asset storage. All paid plans offer an annual billing option with a **10% discount**.

| Tier | Monthly Price | Annual Price (Billed Monthly) | Total Annual Billed | Monthly Credits | Total Annual Credits | Unit Cost / Credit | Team Seats | Storage & Retention | Support Level |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Free Starter** | ₹0 / $0 | ₹0 / $0 | ₹0 | 50 *(one-time)* | — | Free | 1 User | 250 MB / 7 Days | Community |
| **Pilot Tier** | ₹1,950 / $22 | ₹1,755 / $19.80 | ₹21,060 / $237.60 | **130 Credits** | **1,560 Credits** | ₹15.00 / $0.17 | 1 User | 1 GB / 1 Month | Standard Email |
| **Plus Tier** | ₹10,000 / $106 | ₹9,000 / $95.40 | ₹108,000 / $1,144.80 | **800 Credits** | **9,600 Credits** | ₹12.50 / $0.13 | 3 Users | 5 GB / 3 Months | Priority Queue |
| **Pro Tier** | ₹25,000 / $265 | ₹22,500 / $238.50 | ₹270,000 / $2,862.00 | **2,500 Credits** | **30,000 Credits** | ₹10.00 / $0.10 | 5 Users | 100 GB / 6 Months | Dedicated Account Mgr |
| **Enterprise** | Custom Quote | Custom Quote | Custom Quote | **Unlimited / Custom** | Negotiated | Negotiated | Unlimited | Unlimited / Permanent | 24/7 Dedicated + Team SLA |

### Enterprise Sales Inquiry Pipeline
For organizations requiring custom model fine-tuning, HIPAA/SOC-2 BAA, or invoice-based wire transfer:
- **Component**: [EnterprisePlan.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/EnterprisePlan.tsx) (`showSalesForm` modal)
- **Endpoint**: `POST /api/contact-sales`
- **Controller**: [salesRoutes.ts](file:///e:/A_Writopedia/apps/api/src/modules/sales/salesRoutes.ts)
- **Repository**: [salesRepository.ts](file:///e:/A_Writopedia/apps/web/src/infrastructure/repositories/salesRepository.ts)

---

## 3. 💳 On-Demand Credit Top-Up Booster Packs

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

## 4. ⚡ Generation Credit Consumption Matrix

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

## 5. 🛠️ Payment Gateway Architecture & Execution Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT BROWSER (Vite React)                          │
│                                                                                  │
│  1. User selects Plan / Booster                                                  │
│  2. apiClient.post('/api/payment/razorpay-order', { planId, currency })          │
│                                                                                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │  (Bearer Token attached)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            API SERVER (Express + Node.js)                        │
│                                                                                  │
│  3. authMiddleware validates Supabase JWT                                        │
│  4. billingRoutes resolves planId in server-authoritative PLAN_PRICING_CATALOG   │
│  5. createRazorpayOrder calls https://api.razorpay.com/v1/orders                 │
│  6. paymentRepository inserts row into public.payments (status = 'created')     │
│  7. Returns { id: 'order_xxx', amount: 150000, currency: 'INR' }                 │
│                                                                                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT BROWSER (Vite React)                          │
│                                                                                  │
│  8. Opens window.Razorpay checkout modal (UPI, Netbanking, Cards, Wallets)       │
│  9. User completes transaction & 3DS authorization                               │
│ 10. Razorpay handler callback receives:                                          │
│     { razorpay_order_id, razorpay_payment_id, razorpay_signature }               │
│ 11. apiClient.post('/api/payment/razorpay-verify', payload)                      │
│                                                                                  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │  (Bearer Token attached)
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            API SERVER (Express + Node.js)                        │
│                                                                                  │
│ 12. verifyRazorpaySignature computes HMAC-SHA256(order_id + '|' + payment_id)   │
│ 13. paymentRepository updates public.payments (status = 'captured')              │
│ 14. creditService.grantCredits() atomically credits workspace in PostgreSQL      │
│ 15. Returns { verified: true, creditsGranted: 100, newBalance: 153 }             │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### PostgreSQL Audit Schema
- `public.payments`: Full transaction log recording `order_id`, `payment_id`, `signature`, `amount_subunits`, `currency`, `status` (`created` $\rightarrow$ `captured` or `failed`), `is_simulated`, and `idempotency_key`.
- `public.credit_balances`: Authoritative balance record with row locks: `balance`, `held_balance`, `available_balance`, `lifetime_granted`, and `lifetime_spent`.
- `public.credit_ledger`: Double-entry append-only journal tracking every credit event (`topup_purchase`, `subscription_grant`, `ai_reservation`, `hold_release`).

---

## 6. 🚨 Critical Integration Defects & Resolution Roadmap

The following defects were discovered during technical review and must be resolved on branch `fix/payment-method-integration`:

### Defect 1: Unauthenticated API Requests via Raw `window.fetch`
- **Location**: [CreditTopUp.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/CreditTopUp.tsx#L226), [EnterprisePlan.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/EnterprisePlan.tsx#L316), [PricingPage.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/PricingPage.tsx#L142).
- **Issue**: Components invoke `fetch('/api/payment/razorpay-order')` without `Authorization: Bearer <token>`.
- **Impact**: `authMiddleware` rejects requests with `401 Unauthorized`. Frontend `catch` blocks silently fall back to `isSimulated: true` sandbox mode, preventing live gateway transactions.
- **Resolution**: Replace raw `window.fetch` with `apiClient.post()`.

### Defect 2: Missing `planId` in Subscription Checkout
- **Location**: [EnterprisePlan.tsx](file:///e:/A_Writopedia/apps/web/src/features/billing/components/EnterprisePlan.tsx#L321-L325).
- **Issue**: Submits `{ amount, currency }` without `planId`.
- **Impact**: Server rejects request with `400 Invalid or missing planId: "undefined"`.
- **Resolution**: Pass canonical plan identifiers (`plan-pilot-monthly`, `plan-plus-yearly`, etc.).

### Defect 3: Truthy Object Evaluation in HMAC Signature Verification
- **Location**: [billingService.ts](file:///e:/A_Writopedia/apps/api/src/services/billingService.ts#L68-L82).
- **Issue**: `verifyRazorpaySignature()` returns `{ verified: boolean }`. `billingService` checks `if (!isValidSignature)` which is always truthy.
- **Impact**: Signature mismatches or tampered requests would fail to be caught by the branch.
- **Resolution**: Change to `if (!isValidSignature.verified)`.

### Defect 4: Server-Side Catalog Desynchronization
- **Location**: [packages/types/billing.ts](file:///e:/A_Writopedia/packages/types/billing.ts#L53-L116) (`PLAN_PRICING_CATALOG`).
- **Issue**: Catalog contains legacy placeholder values (Pilot: ₹0 / 50c, Plus: ₹1,600 / 200c, Pro: ₹2,400 / 500c) that conflict with the production UI matrix (Pilot: ₹1,950 / 130c, Plus: ₹10,000 / 800c, Pro: ₹25,000 / 2,500c).
- **Impact**: Server charges lower rates and issues fewer credits than users expect.
- **Resolution**: Align `PLAN_PRICING_CATALOG` exactly with the production pricing schedule.
