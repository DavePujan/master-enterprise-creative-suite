# WRITOPEDIA PRODUCTION DEPLOYMENT GUIDE
**Application Domain:** `https://ai.writopedia.com`  
**Corporate Domain:** `https://writopedia.com` *(Separate public website — DO NOT modify, route, or deploy here)*  
**Source of Truth Repository:** Current Git repository  
**Target Architecture:** Vercel (Frontend SPA + Serverless API) + Railway (Persistent Background Worker) + Supabase (Auth/DB/Storage)

---

## 1. Production Architecture Overview

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

- **Frontend & API:** Hosted on **Vercel** under domain `ai.writopedia.com`. The frontend is a client-side React SPA built with Vite. The API runs via Vercel Serverless Functions (`@vercel/node`) using `api/index.ts`.
- **Durable Background Worker:** Hosted on **Railway** using `Dockerfile.worker`. It continuously processes asynchronous AI video polling, Supabase Storage streaming, and PPTX/PDF rendering.
- **Database & Storage:** Hosted on **Supabase** (PostgreSQL, GoTrue Auth, Storage buckets `user-assets`, `brand-assets`, `exports`, and Realtime channels).
- **Payment Webhooks:** Razorpay webhooks arrive at `https://ai.writopedia.com/api/billing/webhook`.

---

## 2. Local Development

```bash
# Install dependencies (use npm ci for deterministic production / CI builds)
npm ci

# Run local development server (Vite + Express + In-Process Worker)
npm run dev

# Run TypeScript typecheck
npm run lint

# Run Architectural Boundary verification
npm run check:boundaries

# Run Billing Security regression tests
npm run test:billing

# Build all production targets locally (Web + Server + Worker)
npm run build
```

---

## 3. Preview Environment

1. **Vercel Preview:**
   - Every pull request or non-production Git branch triggers a Vercel Preview deployment.
   - Preview uses preview/staging environment variables (e.g., `rzp_test_...` Razorpay keys, test Supabase project or staging schemas).
2. **Preview Worker:**
   - A staging Railway worker instance connected to the preview database ensures video generation and presentation export workflows can be tested before merging.

---

## 4. Production Environment Specifications

- **Node.js Version:** `22.x` (LTS) enforced via `.nvmrc` and `package.json` (`"engines": { "node": ">=22.0.0" }`).
- **Target Application Origin:** `https://ai.writopedia.com`
- **Client Cache Strategy:**
  - `dist/index.html`: `Cache-Control: s-maxage=0, no-cache`
  - `dist/static/*`: `Cache-Control: public, max-age=31536000, immutable`

---

## 5. Vercel Deployment Configuration

Configured in `vercel.json`:

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

### Vercel Project Settings:
- **Project Name:** `writopedia-ai` (or existing project mapped to `ai.writopedia.com`)
- **Root Directory:** `.` (Repository root)
- **Framework Preset:** `Vite`
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** `22.x`

---

## 6. Railway Worker Deployment

The persistent worker runs from `apps/worker/src/index.ts` using `Dockerfile.worker`.

### Railway Project Configuration:
- **Service Name:** `writopedia-worker`
- **Builder:** Dockerfile (`Dockerfile.worker`)
- **Public Domain:** **None needed.** (Worker is private; not exposed to the public internet)
- **Healthcheck Path:** `/health` (Internal container liveness probe on `$PORT`, default 8080)
- **Healthcheck Timeout:** `100` seconds
- **Restart Policy:** `ON_FAILURE` (Max retries: 10)
- **Required Variables:**
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `FAL_KEY`
  - `NODE_ENV=production`

---

## 7. Supabase Production Requirements

1. **Authentication (GoTrue):**
   - **Site URL:** `https://ai.writopedia.com`
   - **Redirect URLs:**
     - `https://ai.writopedia.com/*`
     - `https://ai.writopedia.com/auth/callback`
2. **Database Migrations:**
   - Canonical migration directory: `supabase/migrations/`
   - All migrations are strictly additive.
3. **Storage Buckets:**
   - `user-assets`: Main bucket for user uploads, processed videos, and presentation exports.
   - `brand-assets`: Brand collateral and logo assets.
   - `exports`: Presentation document snapshots.

---

## 8. Razorpay Payment Gateway Configuration

1. **Mode:** Live mode in Production (`RAZORPAY_MODE=live`).
2. **Webhook Endpoint:** `https://ai.writopedia.com/api/billing/webhook`
3. **Webhook Secret:** Set to `RAZORPAY_WEBHOOK_SECRET`.
4. **Active Events:**
   - `payment.captured`
   - `order.paid`
   - `payment.failed`

---

## 9. Transactional Email Configuration (Resend)

1. **Verified Domain:** `writopedia.com` must be verified in Resend with MX/SPF/DKIM records.
2. **From Address:** `RESEND_FROM_EMAIL="Writopedia <notifications@writopedia.com>"`
3. **Alert Address:** `BILLING_ALERT_EMAIL="support@writopedia.com"`
4. **Durable Links:** All email links point to `https://ai.writopedia.com/workspace` or `https://ai.writopedia.com/assets`.

---

## 10. AI Provider Configuration

1. **Google Gemini:** `GEMINI_API_KEY` configured in Vercel Server and Railway Worker.
2. **fal.ai:** `FAL_KEY` configured in Vercel Server and Railway Worker for Kling / Seedance video engines.

---

## 11. Environment Variable Matrix

| Variable | Target Environment | Secret? | Required for Prod? | Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Vercel Client | No | **YES** | Supabase HTTPS URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel Client | No | **YES** | Supabase public anon key |
| `VITE_RAZORPAY_KEY_ID` | Vercel Client | No | **YES** | Razorpay public Key ID |
| `SUPABASE_URL` | Vercel Server & Railway | No | **YES** | Server-side Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Server & Railway | **YES** | **YES** | Service role key for admin operations |
| `GEMINI_API_KEY` | Vercel Server & Railway | **YES** | **YES** | Google AI Gemini API key |
| `FAL_KEY` | Vercel Server & Railway | **YES** | Optional | fal.ai API key |
| `RAZORPAY_KEY_ID` | Vercel Server | No | **YES** | Server-side Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Vercel Server | **YES** | **YES** | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | Vercel Server | **YES** | **YES** | Webhook verification secret |
| `RESEND_API_KEY` | Vercel Server | **YES** | **YES** | Resend email API key |
| `RESEND_FROM_EMAIL` | Vercel Server | No | **YES** | Verified sender email |
| `ADMIN_ACCESS_TOKEN` | Vercel Server | **YES** | **YES** | Token guarding admin endpoints |

---

## 12. Health Checks & Monitoring

- **Vercel API Health:** `GET https://ai.writopedia.com/api/health` -> `{ status: "ok", service: "writopedia-api" }`
- **Railway Worker Internal Health:** Checked internally by Railway orchestrator (`http://127.0.0.1:$PORT/health` -> `{ status: "ok", service: "writopedia-worker" }`)
- Note: Health checks are lightweight and do not trigger paid AI or billing APIs.

---

## 13. Rollback Strategy

- **Vercel:** In the Vercel Dashboard, select **Deployments** -> find prior stable deployment -> click **Instant Rollback**.
- **Railway:** In Railway Dashboard, select the previous successful deployment and redeploy.
- **Database:** Migrations are non-destructive; older application code remains backward-compatible with database tables.
