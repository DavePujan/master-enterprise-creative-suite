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

### Invariant 13: Centralized Security-Event Audit Telemetry
Authentication failures, admin access rejections, cross-tenant boundary violations, blocked SSRF requests, and unauthorized CORS origins are captured via `securityAuditService`. Telemetry is strictly best-effort and decoupled from authorization decisions (logging outages cannot bypass security controls). All credentials, tokens, cookies, and user prompts are deeply redacted prior to persistence in `public.security_audit_logs` with admin-only RLS.

### Invariant 14: Client-Side LocalStorage Trust Boundary
Browser `localStorage` and `sessionStorage` are treated as untrusted inputs. Structured persisted state must be validated against runtime Zod schemas (`safeGetValidatedItem`) before entering application memory. Corrupt or unvalidated browser state cannot crash the UI and cannot grant server-side roles, workspace access, or generation credits.

---

## 3. Security Remediation Audit History (OWASP Top 10:2025)

### Phase 1: High-Exploitability Access Control & Tenant Boundaries
- **Tenant Isolation (BOLA / IDOR)**: Enforced server-authoritative workspace membership verification on `/api/video` routes, preventing cross-tenant job creation or credit drainage.
- **Presentation Export IDOR**: Added creator and workspace authorization checks on `/api/presentation/export/:exportId` before issuing signed asset URLs.
- **CORS Allowlist Lockdown**: Removed wildcard `*.vercel.app` pattern; restricted credentialed CORS strictly to canonical domains, authorized subdomains, and development loopbacks.
- **Database-Grounded RBAC**: Replaced static hardcoded admin email checks with authoritative database roles query (`public.user_roles`).

### Phase 2: Infrastructure & Input Hardening
- **SSRF DNS-Rebinding / TOCTOU Protection**: Implemented pre-flight multi-IP DNS resolution (`isPrivateOrReservedIPv4/v6`) and socket connection pinning via Undici `Agent` with manual redirect re-validation.
- **Secure Admin Setup Credentials**: Replaced command-line password arguments in `setup_admin_user.cjs` with mandatory `ADMIN_PASSWORD` environment variable extraction.
- **LLM Prompt-Injection Hardening**: Enforced architectural decoupling of system instructions and user data; enclosed untrusted inputs within explicit XML tags and JSON boundaries.
- **HTTP Security Headers**: Mounted `helmet` with fine-tuned CSP, HSTS, X-Content-Type-Options, and frame-ancestors restrictions.
- **Centralized Production Error Masking**: Masked internal errors, database exceptions, and credentials to generic messages in production via `errorHandler.ts`.

### Phase 3: Maintenance, Observability & Trust-Boundary Hardening
- **Dependency Remediation**:
  - `undici`: Overridden to `^6.28.1` to eliminate all known moderate and high severity CVEs while maintaining full Node 22 and Vercel serverless compatibility.
  - `uuid`: Removed obsolete `"ngrok": "^5.0.0-beta.2"` package (superseded by official `@ngrok/ngrok`), completely eliminating `uuid@8.3.2` from the resolved dependency tree.
  - `zod`: Added `zod@^3.24.2` as a direct dependency for runtime validation.
- **Centralized Security-Event Audit Logging**:
  - Established `securityAuditService.ts` and `public.security_audit_logs` table (`20260907000001_security_audit_logs.sql`).
  - Integrated into `authMiddleware.ts` (`AUTH_TOKEN_INVALID`, `FORBIDDEN_ADMIN_REQUIRED`), `videoRoutes.ts` (`WORKSPACE_ACCESS_DENIED`), `presentationRepository.ts` (`EXPORT_ACCESS_DENIED`), `proxyRoutes.ts` (`SSRF_BLOCKED`), and `app.ts` (`CORS_ORIGIN_BLOCKED`).
  - Implemented automatic privacy redaction (`sanitizeMetadata`) and safe IP extraction (`extractClientIp`).
  - Telemetry is non-blocking (best-effort); logging errors never bypass or affect authorization controls.
- **LocalStorage Runtime Schema Validation**:
  - Replaced unsafe `JSON.parse(raw) as T` with `safeGetValidatedItem<T>` using runtime Zod schemas.
  - Hardened staged briefs in `CreativeWorkspace.tsx` (`TextBriefSchema`, `ImageBriefSchema`, `VideoBriefSchema`, `AudioBriefSchema`, `DeckBriefSchema`).
  - Hardened preferences in `preferences.ts` (`UserPreferencesSchema`) and pending pricing plans in `PricingPage.tsx` (`PendingPricingPlanSchema`).
  - Corrupted or invalid browser state is quarantined or discarded safely without crashing the UI.

---

## 4. Automated Security Verification

```powershell
# 1. Architecture boundary check
node scripts/check-boundaries.cjs

# 2. Billing security & commercial invariant suite
npx tsx scripts/test-billing-security.ts

# 3. Security Remediation Phase 1 Verification Suite (42 tests)
npx tsx scripts/test-security-phase1.ts

# 4. Security Remediation Phase 2 Verification Suite (79 tests)
npx tsx scripts/test-security-phase2.ts

# 5. Security Remediation Phase 3 Verification Suite (38 tests)
npx tsx scripts/test-security-phase3.ts

# 6. Production build verification
npm run build:server
npm run build:worker
npm run build:web
```
