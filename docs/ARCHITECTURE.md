# System Architecture & Layering Model

This document describes the modular architectural design, layer boundaries, and data flow patterns of the Writopedia Creative Suite platform.

---

## 1. Architectural Layers & Dependency Rules

```text
                  ┌─────────────────────────────────┐
                  │          Shared Domain          │
                  │        (src/shared/**)          │
                  └──────▲───────────────────▲──────┘
                         │                   │
                         │                   │
         ┌───────────────┴──────┐     ┌──────┴────────────────┐
         │     Server Layer     │     │      Client Layer     │
         │    (src/server/**)   │     │    (src/client/**)    │
         └──────────────────────┘     └───────────────────────┘
```

### Dependency Rules:
1. **Shared Core (`src/shared/`)**:
   - Contains pure TypeScript domain types, DTO contracts, error classes, and utilities.
   - **MUST NOT** import React, Express, Firebase, browser APIs, or vendor SDKs.
   - Independent of all other layers.

2. **Server Layer (`src/server/`)**:
   - Contains Express application setup, security middleware, routing modules, and infrastructure adapters.
   - **MUST NOT** import React or client feature code.
   - Owns provider secrets (`GEMINI_API_KEY`, `FAL_API_KEY`, `RAZORPAY_KEY_SECRET`).

3. **Client Layer (`src/client/`)**:
   - Organized into **Infrastructure** (`src/client/infrastructure/`) and **Features** (`src/client/features/`).
   - Feature components **MUST NOT** import `firebase/*` SDK directly.
   - Feature components communicate with repositories (`src/client/infrastructure/firebase/repositories/`) and the API gateway (`/api/*`).

---

## 2. Data Flow Architecture

### AI Generation Flow:
```text
User Action in UI
       ↓
geminiService / promptBuilders
       ↓
geminiClient.getAI()
       ↓
POST /api/ai/generate-content (Bearer Token)
       ↓
Server authMiddleware & rateLimiter
       ↓
aiRoutes.ts
       ↓
serverGeminiClient (Server-Side GEMINI_API_KEY)
       ↓
Google GenAI Cloud API
```

### Server-Authoritative Billing Flow:
```text
User selects Plan in Pricing / Top-Up UI
       ↓
POST /api/payment/razorpay-order { planId }
       ↓
Server validates planId against PLAN_PRICING_CATALOG
       ↓
Razorpay Order created on backend
       ↓
Client opens Razorpay Modal & processes payment
       ↓
POST /api/payment/razorpay-verify { order_id, payment_id, signature, planId }
       ↓
Server verifies HMAC SHA256 signature
       ↓
Server checks payment transaction idempotency
       ↓
Server authoritatively awards credits to user document
       ↓
Client refreshes and displays updated balance
```

### Hardened Proxy Flow:
```text
Client requests external asset via /api/proxy?url=<url>
       ↓
validateDestinationUrl (Checks scheme, userinfo, hostname)
       ↓
dns.lookup(hostname, { all: true })
       ↓
Validates EVERY resolved IPv4 and IPv6 address (blocks private/loopback/link-local/CGNAT)
       ↓
Outbound fetch with redirect: 'manual'
       ↓
If redirect (301/302/307/308): recursively re-validate Location header
       ↓
Streams verified content (enforces 25MB max size & 10s timeout)
```

---

## 3. Directory Layout

```text
src/
├── shared/
│   ├── contracts/api.ts
│   ├── errors/AppError.ts
│   ├── types/
│   │   ├── billing.ts
│   │   ├── brand.ts
│   │   ├── creative.ts
│   │   └── user.ts
│   └── utils/
│       ├── audio.ts
│       └── image.ts
│
├── server/
│   ├── config/env.ts
│   ├── http/app.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts
│   │   └── rateLimiter.ts
│   ├── modules/
│   │   ├── ai/aiRoutes.ts
│   │   ├── billing/billingRoutes.ts
│   │   ├── campaigns/campaignRoutes.ts
│   │   ├── humanTouch/humanTouchRoutes.ts
│   │   ├── proxy/proxyRoutes.ts
│   │   └── sales/salesRoutes.ts
│   ├── infrastructure/
│   │   ├── fal/falClient.ts
│   │   ├── fallback/pollinationsFallback.ts
│   │   ├── firebase/serverAuth.ts
│   │   ├── gemini/serverGeminiClient.ts
│   │   └── payment/razorpayClient.ts
│   └── utils/logger.ts
│
└── client/
    ├── infrastructure/
    │   ├── ai/
    │   │   ├── geminiClient.ts
    │   │   ├── geminiService.ts
    │   │   ├── modelRegistry.ts
    │   │   └── promptBuilders.ts
    │   └── firebase/
    │       ├── auth.ts
    │       ├── firebaseApp.ts
    │       ├── firestore.ts
    │       ├── storage.ts
    │       └── repositories/
    │           ├── adminRepository.ts
    │           ├── assetRepository.ts
    │           ├── brandRepository.ts
    │           ├── historyRepository.ts
    │           ├── humanTouchRepository.ts
    │           ├── salesRepository.ts
    │           └── userRepository.ts
    └── features/
        ├── admin/
        ├── assets/
        ├── auth/
        ├── billing/
        ├── brand/
        ├── campaigns/
        ├── marketing/
        └── slideshow/
```
