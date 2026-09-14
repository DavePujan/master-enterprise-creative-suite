# Security Architecture & Trust Boundaries

This document specifies the security policies, trust boundaries, threat models, and architectural invariants implemented in the Writopedia Creative Suite platform.

---

## 1. Threat Model (Actors T1–T7)

| Threat Actor | Description | Primary Risk Vectors | Architectural Defense |
| :--- | :--- | :--- | :--- |
| **T1: Unauthenticated Attacker** | Anonymous external internet actor | SSRF scanning, sales spamming, scraping protected AI endpoints | Default-deny auth middleware, hardened multi-IP SSRF checks, route-specific rate limits |
| **T2: Authenticated Normal User** | Valid standard account | Privilege escalation to admin settings or reading other users' assets | Supabase Row-Level Security (RLS), JWT verification, strict user_id ownership checks |
| **T3: Malicious Authenticated User** | Account attempting financial exploitation | Tampering with payment amounts, directly setting numeric credit balance | Server pricing catalog (`PLAN_PRICING_CATALOG`), server-authoritative credit grants, PostgreSQL RLS balance write restriction |
| **T4: Reverse-Engineered Client** | Browser JS bundle inspection / tampering | Inspecting client bundle for provider API keys, modifying client-side memory state | Complete removal of `GEMINI_API_KEY` from Vite/client; server-side execution only |
| **T5: Payment Replay Attacker** | Captures and replays valid payment signatures | Double-crediting balance by re-submitting valid Razorpay verification payloads | Idempotent payment fulfillment ledger (`payment_transactions`) |
| **T6: SSRF / Cloud Infrastructure Attacker** | Submits URLs targeting internal cloud services | Exploiting proxy to reach `169.254.169.254`, `localhost`, VPC services, or DNS rebinding | Multi-IP resolution (`all: true`), blocking private/loopback/link-local/CGNAT, manual redirect re-validation |
| **T7: Compromised Admin Account** | Hijacked administrative identity | Writing arbitrary `adminSettings` or deleting database records | Restricting administrative functions to verified admin roles and hardened RLS policies |

---

## 2. Core Security Invariants

### Invariant 0: Single Authoritative API Deployment Path
There is exactly one execution path for every `/api/*` endpoint. In serverless deployments (Vercel), `api/index.ts` delegates directly to the modular Express application (`apps/api/src/server.ts`), eliminating shadow endpoints.

### Invariant 1: Server-Authoritative Identity
User identity and authorization are derived exclusively from verified Supabase JWTs passed in `Authorization: Bearer <token>`. The server never trusts client-supplied `userId`, `email`, or role flags in request bodies.

### Invariant 2: Server-Authoritative Billing
Client checkout requests cannot supply arbitrary amounts or currencies. All orders are validated against the server-side pricing catalog (`packages/types/billing.ts`).

### Invariant 3: Server-Authoritative Credit Mutation
Credit balance mutations occur exclusively via trusted server transactions upon verified payment. The client only refreshes the resulting balance from the server.

### Invariant 4: Strict Payment Idempotency
Payment verification is strictly idempotent. A Razorpay payment ID can trigger credit fulfillment exactly once.

### Invariant 5: Zero Browser Secrets
`GEMINI_API_KEY` is never defined or injected into Vite client bundles. All AI generation requiring secret keys executes server-side.

### Invariant 6: Zero Client-Supplied Provider Credentials
Client payloads cannot supply `falKey` or AI provider keys. The server exclusively resolves provider credentials from its environment.

### Invariant 7: Prohibited Client Balance Writes
PostgreSQL Row-Level Security (RLS) prohibits direct client updates to `credit_balance` and `created_at` on user profiles.

### Invariant 8: Default-Deny API Authentication
Every API route requires a valid authentication token by default. Only explicitly allowlisted public routes (e.g. `POST /api/sales/inquiry`) bypass token validation.

### Invariant 9: Multi-IP SSRF & DNS Rebinding Defense
The proxy resolves all DNS records (`all: true`) and validates every returned IP (IPv4 and IPv6). Outbound fetches use `redirect: 'manual'` with recursive validation of redirect `Location` headers.

### Invariant 10: Admin-Only Administrative Configuration
Mutations to administrative settings strictly require `isAdmin()` verification.

### Invariant 11: Explicit CORS & Route-Specific Rate Limiting
CORS is restricted to approved origin patterns (never `*` with credentials). Adaptive rate limiters protect expensive AI, payment, and proxy endpoints.

### Invariant 12: Enforced Repository Boundaries
UI components interact with data strictly through typed repository interfaces and Supabase client abstractions.

---

## 3. Automated Security Verification

```powershell
# 1. Typecheck and linting
npm run typecheck

# 2. Production build verification
npm run build

# 3. Secret leak scan
git grep "GEMINI_API_KEY" dist/
git grep "VITE_GEMINI_API_KEY" dist/

# 4. Architecture boundary check
npm run check:boundaries
```
