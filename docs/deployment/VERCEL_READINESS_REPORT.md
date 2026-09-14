# VERCEL PRODUCTION READINESS & CUTOVER HANDOFF REPORT
**Target Application Domain:** `https://ai.writopedia.com`  
**Corporate Landing Domain:** `https://writopedia.com` *(Separate public website — DO NOT touch, redirect, or deploy application code here)*  
**Source of Truth Repository:** Current Git repository (`DavePujan/master-enterprise-creative-suite`)  
**Status:** **RELEASE CANDIDATE 1 (RC-1)** — Codebase verified, worker decoupled, builds validated. Infrastructure cutover pending external operator actions.

---

## 1. Production Architecture Summary

```
                         GitHub
                            │
                            ▼
                        Vercel
             ┌─────────────────────────┐
             │ React 18 + Vite SPA     │
             │ Express API (/api/*)    │
             │ SPA Route Rewrites      │
             └────────────┬────────────┘
                          │
              https://ai.writopedia.com
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
     Supabase         Gemini/Fal         Resend
     Auth/DB          AI Providers       Email
     Storage
     Realtime
         │
         ▼
   Persistent Worker
      Railway
         │
      ┌──┴───────────────┐
      ▼                  ▼
  Video Jobs        Presentation Jobs
 (ai_generation_jobs) (presentation_exports)
      │                  │
      └────────┬─────────┘
               ▼
           Supabase
     authoritative state
```

### 1.1 Decoupled Components
1. **Frontend & Serverless API (Vercel):**
   - Serves the compiled Vite SPA (`dist/index.html` + `dist/static/*`).
   - Handles REST API endpoints at `/api/*` via the lightweight Express handler in `api/index.ts`.
   - Enforces strict SPA rewrites (`/(.*)` -> `/index.html`) while preserving `/api/*` pass-through.
2. **Persistent Background Worker (Railway):**
   - Runs independently via `apps/worker/src/index.ts` packaged in `Dockerfile.worker`.
   - Polls and claims asynchronous Video Generation jobs from Supabase `ai_generation_jobs`.
   - Polls and claims Presentation Export jobs (PPTX/PDF) from Supabase `presentation_exports`.
   - Uses PostgreSQL atomic row-level leasing (`started_at`, conditional updates) for restart and concurrency safety.
   - Listens on internal port (dynamic `$PORT`, default 8080) with a `/health` endpoint for Railway container uptime monitoring (no public domain needed).
3. **Database & Storage (Supabase):**
   - PostgREST over HTTPS for all database operations (zero TCP connection pool exhaustion risks).
   - GoTrue Auth with token refresh in browser `localStorage`.
   - Storage buckets: `user-assets` (direct uploads, video assets, presentation binaries), `brand-assets`, `exports`.
4. **Payment Gateway (Razorpay):**
   - Server-side order creation and HMAC-SHA256 signature verification.
   - Webhooks ingested at `https://ai.writopedia.com/api/billing/webhook`.
5. **Transactional Email (Resend):**
   - Verified sender domain on `writopedia.com` (`notifications@writopedia.com`).
   - Human Touch completion notifications routed strictly to the requesting user with durable links.

---

## 2. Closure of Architectural Gaps

| Architectural Item | Previous State (Audit) | Resolved State (Production Candidate) |
| :--- | :--- | :--- |
| **Video Generation Poller** | In-memory `setInterval` + `Map<string, VideoJob>` | **PostgreSQL-backed:** Authoritative state in `ai_generation_jobs`. Worker atomically claims jobs via row leases. Zero credit leakage on crashes. |
| **Presentation Export** | Unawaited `setImmediate(...)` inside API process | **Durable Queue:** `POST /api/presentation/:id/export` inserts into `presentation_exports`. Dedicated `PresentationExportWorker` renders PPTX/PDF and uploads to Storage. |
| **Worker Independence** | Mixed into `server.ts` HTTP process | **Standalone Worker Entrypoint:** `apps/worker/src/index.ts` compiled via `esbuild` into `dist/worker.cjs` with dedicated `Dockerfile.worker` & `railway.json`. |
| **Node.js Standardization** | Inconsistent references (Node 20 vs 22) | **Node 22 LTS Standardized:** Enforced across `.nvmrc`, `package.json` (`>=22.0.0`), and Vercel/Railway specifications. |
| **Static Asset Routing** | Vite default `assets/` conflicted with `/assets` route | **Isolated Static Directory:** Configured `build.assetsDir: 'static'` in `vite.config.ts`. SPA route `/assets` never conflicts with CSS/JS chunks. |
| **Human Touch Email** | Fallback sent email to admin user | **Requester Lookup:** Automatically resolves requesting user profile. Directs user to durable link (`https://ai.writopedia.com/assets`). Idempotent on double-click. |

---

## 3. Vercel Configuration (`vercel.json`)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin-allow-popups" }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Root / Build / Output Settings

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Root Directory** | `.` | Root directory of the repository. |
| **Framework Preset** | `Vite` | Native Vite bundling. |
| **Node.js Version** | `22.x` | Active LTS standardized. |
| **Install Command** | `npm ci` | Deterministic lockfile resolution from `package-lock.json`. |
| **Build Command** | `npm run build` | Builds Vite frontend, server bundle, and worker bundle. |
| **Output Directory** | `dist` | Generated build directory containing `index.html` and `static/`. |

---

## 5. Environment Variable Matrix

| Variable Name | Environment Group | Secret? | Production Required? | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Vercel Client | No | **YES** | Public Supabase HTTPS endpoint |
| `VITE_SUPABASE_ANON_KEY` | Vercel Client | No | **YES** | Public anon API key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel Client | No | Optional | Modern alias for anon key |
| `VITE_RAZORPAY_KEY_ID` | Vercel Client | No | **YES** | Razorpay public Key ID (`rzp_live_...`) |
| `VITE_API_URL` | Vercel Client | No | Optional | API URL override (blank = same-origin `/api`) |
| `SUPABASE_URL` | Vercel Server & Railway | No | **YES** | Server-side Supabase project endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Server & Railway | **YES** | **YES** | Admin service role key (RLS bypass) |
| `GEMINI_API_KEY` | Vercel Server & Railway | **YES** | **YES** | Google Gemini API key |
| `FAL_KEY` | Vercel Server & Railway | **YES** | Optional | fal.ai API key (Kling / Seedance) |
| `RAZORPAY_KEY_ID` | Vercel Server | No | **YES** | Server-side Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Vercel Server | **YES** | **YES** | Razorpay secret key (HMAC verification) |
| `RAZORPAY_WEBHOOK_SECRET` | Vercel Server | **YES** | **YES** | Razorpay webhook verification secret |
| `RESEND_API_KEY` | Vercel Server | **YES** | **YES** | Resend email API key |
| `RESEND_FROM_EMAIL` | Vercel Server | No | **YES** | Verified sender: `"Writopedia <notifications@writopedia.com>"` |
| `ADMIN_ACCESS_TOKEN` | Vercel Server | **YES** | **YES** | Bearer secret for `/api/admin/*` routes |

---

## 6. Supabase Configuration Requirements

1. **Authentication (GoTrue):**
   - **Site URL:** `https://ai.writopedia.com`
   - **Redirect URLs:**
     - `https://ai.writopedia.com/*`
     - `https://ai.writopedia.com/auth/callback`
2. **Storage Buckets:**
   - `user-assets`: Public/authenticated read; direct multipart uploads from browser.
   - `brand-assets`: Brand logos and guideline collateral.
   - `exports`: Presentation document snapshots and exported slide decks.
3. **Database Schema & RPCs:**
   - Canonical folder: `supabase/migrations/` (all additive migrations).
   - Functions: `charge_brand_intelligence_credits`, `grant_user_credits`, `reserve_credits_for_ai`, `capture_credit_hold`, `release_credit_hold`.

---

## 7. Payments (Razorpay Live Mode)

1. Set `RAZORPAY_MODE=live` in Vercel Production environment variables.
2. Webhook URL: `https://ai.writopedia.com/api/billing/webhook`.
3. Ingested Events: `payment.captured`, `order.paid`, `payment.failed`.
4. Automated tests: **63 of 63 security tests passed** verifying HMAC verification, replay defense, and idempotency.

---

## 8. Transactional Email (Resend)

1. Domain `writopedia.com` verified with MX/SPF/DKIM records.
2. Sender: `Writopedia <notifications@writopedia.com>`.
3. Human Touch completion notifications automatically lookup requester and link to `https://ai.writopedia.com/assets`.

---

## 9. Domain & DNS Requirements

1. **Application Domain:** `https://ai.writopedia.com`
   - `CNAME` for `ai` pointing to `cname.vercel-dns.com`.
2. **Corporate Domain:** `https://writopedia.com`
   - Completely independent public marketing website.
   - **DO NOT point, redirect, or alter apex DNS during application cutover.**

---

## 10. Complete API Route Inventory (28 Endpoints)

| Method | Route Path | Target Runtime | Auth Required | Expected Latency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/brand/analyze-guidelines` | Vercel Serverless | User Session | Medium (5-15s) | Gemini multimodal brand analysis |
| `POST` | `/api/brand/website-extract` | Vercel Serverless | User Session | Medium (5-10s) | Scrapes URL with SSRF protection |
| `POST` | `/api/brand/social-extract` | Vercel Serverless | User Session | Short (2-5s) | Public social metadata |
| `POST` | `/api/brand/competitive-intel` | Vercel Serverless | User Session | Medium (5-12s) | Market landscape synthesis |
| `POST` | `/api/brand/social-audit` | Vercel Serverless | User Session | Medium (5-12s) | Social tone & visual audit |
| `POST` | `/api/brand/campaign-intel` | Vercel Serverless | User Session | Medium (5-15s) | Campaign strategy generation |
| `POST` | `/api/brand/video-analysis` | Vercel Serverless | User Session | Medium (10-25s) | Video breakdown |
| `POST` | `/api/brand/voice-analysis` | Vercel Serverless | User Session | Medium (5-10s) | Voice & tone vector extraction |
| `POST` | `/api/brand/voice-match` | Vercel Serverless | User Session | Short (3-8s) | Copy compliance score |
| `POST` | `/api/brand/persona-simulate` | Vercel Serverless | User Session | Medium (5-15s) | Audience simulation |
| `POST` | `/api/brand/culture-trend-align`| Vercel Serverless | User Session | Medium (5-12s) | Real-time trend alignment |
| `POST` | `/api/brand/creative-intel-sync`| Vercel Serverless | User Session | Short (2-5s) | Syncs brand profile to DB |
| `POST` | `/api/proxy` | Vercel Serverless | User Session | Short (<5s) | Single URL proxy (SSRF guarded) |
| `POST` | `/api/proxy/batch` | Vercel Serverless | User Session | Medium (5-15s) | Batch URL proxy |
| `POST` | `/api/video/jobs` | Vercel Serverless | User Session | Short (1-2s) | Inserts job & reserves credits |
| `GET` | `/api/video/jobs/:jobId` | Vercel Serverless | User Session | Short (<1s) | Reads authoritative state from DB |
| `POST` | `/api/presentation/:id/export` | Vercel Serverless | User Session | Short (1-2s) | Inserts export job in DB queue |
| `GET` | `/api/presentation/export/:exportId` | Vercel Serverless | User Session | Short (<1s) | Returns signed download URL |
| `GET` | `/api/presentation/export/status/:exportId` | Vercel Serverless | User Session | Short (<1s) | Alias endpoint for status polling |
| `POST` | `/api/billing/create-order` | Vercel Serverless | User Session | Short (1-3s) | Razorpay order creation |
| `POST` | `/api/billing/verify-payment` | Vercel Serverless | User Session | Short (1-2s) | HMAC verification & credit grant |
| `POST` | `/api/billing/webhook` | Vercel Serverless | Webhook HMAC | Short (1-2s) | Razorpay webhook event processing |
| `POST` | `/api/support/ticket` | Vercel Serverless | Public / User | Short (2-4s) | Resend email dispatch + DB log |
| `POST` | `/api/human-touch` | Vercel Serverless | User Session | Short (1-2s) | Inserts curation request |
| `POST` | `/api/admin/impersonate` | Vercel Serverless | Admin Token | Short (<1s) | Admin session impersonation |
| `POST` | `/api/admin/revert-impersonate`| Vercel Serverless | Admin Token | Short (<1s) | Clears impersonation state |
| `GET` | `/api/admin/audit-logs` | Vercel Serverless | Admin Token | Short (<1s) | Audit log queries |
| `GET` | `/api/health` | Vercel Serverless | Public | Short (<100ms) | Lightweight uptime status |

---

## 11. CI & Build Verification Results

- **Boundary Enforcement:** `npm run check:boundaries` -> **270 files passed** (zero leaks between web, api, worker, packages).
- **TypeScript Typecheck:** `npx tsc --noEmit` -> **0 errors**.
- **Billing Security Suite:** `npm run test:billing` -> **63 of 63 passed**.
- **Production Build:** `npm run build` -> **Compiled cleanly in ~17s**:
  - `dist/index.html` (1.65 kB)
  - `dist/static/*` (content-hashed chunks, 604 kB gzip total)
  - `dist/server.cjs` (663 kB)
  - `dist/worker.cjs` (99.8 kB)

---

## 12. Deployment Hand-off Checklist

- [x] All background jobs backed by PostgreSQL and atomic row-level leasing.
- [x] Dedicated Railway worker packaged in `Dockerfile.worker` with `/health` monitor.
- [x] SPA rewrites and API passthrough configured in `vercel.json`.
- [x] Static assets isolated to `/static/` to avoid collision with `/assets` route.
- [x] Node engine standardized on `>=22.0.0` with `.nvmrc`.
- [x] Zero secret credentials exposed to client bundle.
- [x] Complete deployment guide: [DEPLOYMENT.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/DEPLOYMENT.md).
- [x] Complete smoke test guide: [PRODUCTION_SMOKE_TEST.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/PRODUCTION_SMOKE_TEST.md).
- [x] Step-by-step cutover guide: [PRODUCTION_CUTOVER.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/PRODUCTION_CUTOVER.md).
- [x] Instant rollback procedure: [ROLLBACK.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/ROLLBACK.md).
