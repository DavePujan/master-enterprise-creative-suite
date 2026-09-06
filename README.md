# Writopedia Enterprise Creative Suite: AI-Powered Brand & Campaign Engine

A production-grade, modular creative automation platform and enterprise brand engine. Powered by Google Gemini 2.5, Google Imagen, and Fal.ai (ByteDance/Kling/Flux), this suite enables enterprises and creators to initialize complete brand identities, generate high-impact marketing assets across text, image, audio, video, and multi-asset campaigns, with an end-to-end server-authoritative billing and credit fulfillment engine.

---

## 🚀 Key Platform Capabilities

- **Brand Initialization & Kit**: Define strategic briefs to auto-generate full brand identity systems (pillars, color palettes, tone, typography, and logo discovery/generation).
- **Campaign Deck & Strategist**: Synthesize 5-asset coordinated multi-channel campaigns (Hero banner, Macro Closeup, Lifestyle, Story, Showcase) with automated high-fashion prompts and visual renders.
- **Storyline Narratives**: Generate multi-scene progressive storylines with AI imagery, scripts, and synthesized voiceovers.
- **Interactive Slideshow Creator**: Build structured presentation decks with live fact-checking grounded by Google Search and export to PowerPoint (PPTX).
- **Cinematic Video Promos**: Generate dynamic video promos using Google Veo, ByteDance Seedance, and Kling Video.
- **Multi-Voice Studio Audio & TTS**: High-fidelity natural voiceovers with tone and accent control (`gemini-2.5-flash-preview-tts` and Fal.ai fallback).
- **Curated Asset Library**: Unified digital asset management with AI auto-tagging, aspect ratio conversion, and image analysis.
- **Human-in-the-Loop Curation Queue**: Administrative portal for reviewing, editing, and fulfilling human touch creative requests.
- **Server-Authoritative Billing & Credits**: Complete pricing catalog, Razorpay checkout gateway, atomic PostgreSQL ledger, idempotent signature verification, and automated webhook fulfillment.

---

## 🏛️ Architecture Overview

The codebase is organized into a clean monorepo architecture with strict layer separation, package isolation, and enforced architectural boundaries:

```text
Writopedia Platform
├── apps/
│   ├── web/                        # Feature-Sliced React 19 Frontend
│   │   └── src/
│   │       ├── features/           # Domain feature slices
│   │       │   ├── auth/           # AuthBox, useAuth hook
│   │       │   ├── billing/        # PricingPage, EnterprisePlan, CreditTopUp, PaymentStatusModal
│   │       │   ├── brand-guidelines/ # BrandSetup onboarding, BrandGuidelinesDrawer
│   │       │   ├── campaigns/      # Campaign strategist & deck workspace
│   │       │   ├── canvas/         # InteractiveLogoOverlay, InteractiveTextCanvas
│   │       │   ├── creative/       # CreativeWorkspace, OutputCanvas, CommandBar
│   │       │   ├── human-touch/    # HumanTouchRequestModal, CurationToasters
│   │       │   └── layout/         # AppHeader, AppSidebar, AppShell
│   │       ├── infrastructure/     # Repositories & API clients
│   │       └── shared/             # Shared UI primitives & design tokens
│   │
│   └── api/                        # Modular Express 4 Backend
│       └── src/
│           ├── config/             # env.ts (strict environment validation)
│           ├── http/               # app.ts (Express setup, CORS, route registry)
│           ├── middleware/         # authMiddleware.ts, rateLimiter.ts
│           ├── modules/            # Domain API routers
│           │   ├── ai/             # /api/ai (secure GenAI proxy)
│           │   ├── billing/        # /api/payment (Razorpay orders, verify, webhooks, balance)
│           │   ├── campaigns/      # /api/campaign (prompts, renders, videos)
│           │   ├── imageGeneration/# /api/images (text-to-image synthesis)
│           │   ├── textGeneration/ # /api/text (copywriting & captions)
│           │   ├── audioGeneration/# /api/audio (multi-speaker TTS & studio)
│           │   ├── videoGeneration/# /api/video (Veo & Kling generation)
│           │   ├── presentation/   # /api/presentation (deck generation & search grounding)
│           │   ├── brand/          # /api/brand-guidelines
│           │   ├── sales/          # /api/contact-sales (enterprise inquiries)
│           │   ├── humanTouch/     # /api/human-touch (curation queues)
│           │   └── proxy/          # /api/proxy (hardened SSRF-protected proxy)
│           ├── services/           # billingService, creditService, etc.
│           └── infrastructure/     # razorpayClient, supabaseClient, geminiClient
│
├── packages/                       # Shared Framework-Agnostic Libraries
│   ├── contracts/                  # API DTO contracts & request/response types
│   ├── errors/                     # Standardized AppError domain hierarchy
│   ├── presentation-engine/        # Slideshow formatting, themes, & PPTX export
│   ├── types/                      # Shared business domain models (billing, brand, user)
│   └── utils/                      # Pure image/audio utilities (pcmToWav, validation)
│
├── supabase/
│   └── migrations/                 # PostgreSQL schemas, RLS policies, & atomic RPC procedures
│
├── scripts/                        # Automation & Testing Tooling
│   ├── check-boundaries.cjs        # Architectural boundary linter
│   ├── test-billing-security.ts    # 63 deterministic security assertions
│   ├── test-razorpay-integration.ts# Real Razorpay gateway test suite
│   └── tunnel.cjs                  # Official @ngrok/ngrok local development tunnel
│
├── api/
│   └── index.ts                    # Unified Vercel serverless entry point
├── docs/                           # Comprehensive technical specifications
└── agent/                          # Local autonomous agent capabilities & memory
```

---

## 🔒 Security Architecture & Trust Boundaries

| Trust Boundary | Enforcement Mechanism |
| :--- | :--- |
| **Zero Browser Secrets** | `GEMINI_API_KEY`, `RAZORPAY_KEY_SECRET`, `FAL_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are strictly server-side and excluded from client bundles. |
| **Server Billing Authority** | Order amounts and credits are strictly validated against `PLAN_PRICING_CATALOG`; client cannot specify arbitrary amounts or currencies. |
| **Payment Idempotency** | Cryptographic HMAC-SHA256 signature verification (`verifyRazorpaySignature`) and atomic transaction ledger (`payment_transactions`) prevent double-credits and replay attacks. |
| **Server-to-Server Webhook Security** | Razorpay webhooks (`POST /api/payment/webhook`) validate timing-safe cryptographic signatures (`crypto.timingSafeEqual`) on the raw unparsed request buffer. |
| **Atomic Balance Mutations** | Credit balances mutate exclusively via PostgreSQL atomic RPC procedures (`grant_credits_atomic`, `deduct_credits_atomic`) guarded by Row Level Security (RLS). |
| **SSRF Multi-IP Protection** | Outbound proxy resolves all DNS records (`all: true`), blocks loopback/private/link-local/metadata/CGNAT ranges, and manually checks redirects. |
| **Default-Deny Authentication** | Server middleware enforces bearer token authentication across all `/api/*` routes; only explicitly allowlisted public routes (e.g. `/api/payment/webhook`) bypass it. |
| **Architectural Boundaries** | `npm run check:boundaries` enforces strict import directions: UI components cannot import server code or databases directly. |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion), Lucide React.
- **Backend**: Node.js, Express 4, tsx, esbuild.
- **Database & Auth**: Supabase (PostgreSQL 15, Row Level Security, RPC functions, Realtime).
- **AI Models**: Google Gemini 2.5 Flash, Gemini 3 Pro, Google Veo, Gemini TTS, Fal.ai (ByteDance Seedance / Kling / Flux).
- **Payments & Billing**: Razorpay API (INR & USD auto-detection, order creation, client checkout, HMAC verification, server webhooks).
- **Tunneling**: Official `@ngrok/ngrok` Node.js SDK.
- **Export Engines**: PptxGenJS (PowerPoint), JSZip, FileSaver, jsPDF, html2canvas.

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **NPM**: `v10+` or `v11+`
- **Git**

### 2. Clone & Install Dependencies
Clone the repository:
```bash
git clone https://github.com/hardeep-zw/master-enterprise-creative-suite.git
cd master-enterprise-creative-suite
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root based on `.env.example`:
```env
# =========================================================
# Core Server Configuration
# =========================================================
PORT=3000
NODE_ENV=development

# =========================================================
# AI Services
# =========================================================
GEMINI_API_KEY=AIzaSy...
FAL_API_KEY=fal_key_...

# =========================================================
# Razorpay Payment Gateway (Test or Live)
# =========================================================
RAZORPAY_MODE=test
VITE_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret...
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret...
ENABLE_PAYMENT_SIMULATION=false

# =========================================================
# Supabase Database & Auth (Free Tier)
# =========================================================
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

# =========================================================
# Optional: ngrok Tunneling Token
# =========================================================
NGROK_AUTHTOKEN=your_ngrok_token...
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Express backend with Vite in watch mode on port 3000 (`tsx watch server.ts`) |
| `npm run build` | Builds the client SPA bundle via Vite and compiles `server.ts` with esbuild to `dist/server.cjs` |
| `npm start` | Runs the compiled production Node server (`node dist/server.cjs`) |
| `npm run preview` | Previews the production Vite build locally |
| `npm run lint` | Runs TypeScript compiler checks without emitting files (`tsc --noEmit`) |
| `npm run check:boundaries` | Validates architectural boundary invariants and verifies zero leaked secrets |
| `npm run test:billing` | Runs 63 deterministic billing security test assertions (HMAC, catalog, state transitions) |
| `npm run test:razorpay:integration` | Executes end-to-end integration tests against the live Razorpay Test Gateway |
| `npm run tunnel` | Launches the authenticated `@ngrok/ngrok` HTTPS tunnel for public webhook reception |
| `npm run clean` | Cleans up the `dist/` build output directory |

---

## 💳 Testing Razorpay Webhooks Locally

Razorpay sends server-to-server HTTP notifications when a payment is captured. To test webhooks on your local development machine:

1. **Start the local server**:
   ```bash
   npm run dev
   ```
2. **Start the ngrok tunnel** (in a second terminal):
   ```bash
   npm run tunnel
   ```
   *Output will provide your live webhook URL:*
   ```text
   🚀 NGROK TUNNEL ONLINE
   📡 Base URL    : https://<subdomain>.ngrok-free.dev
   🔗 Webhook URL : https://<subdomain>.ngrok-free.dev/api/payment/webhook
   ```
3. **Configure in Razorpay Dashboard**:
   - Go to **Razorpay Dashboard** (ensure **Test Mode** is toggled in the header).
   - Navigate to **Account & Settings** $\rightarrow$ **Webhooks** $\rightarrow$ **+ Add New Webhook**.
   - Paste the **Webhook URL** from the tunnel output.
   - Enter your `RAZORPAY_WEBHOOK_SECRET` value from `.env`.
   - Select active events: `payment.captured` and `order.paid`.
   - Click **Save**.

---

## 🌐 API Endpoint Reference

### Billing & Payments (`/api/payment`)
- `GET /api/payment/balance` - Fetches workspace credit balance and current tier from Supabase.
- `GET /api/payment/ledger` - Fetches transaction history from `payment_transactions`.
- `POST /api/payment/razorpay-order` - Creates an authoritative Razorpay order for a catalog `planId`.
- `POST /api/payment/razorpay-verify` - Verifies client payment signature and grants workspace credits.
- `POST /api/payment/webhook` - Public webhook endpoint; validates Razorpay HMAC-SHA256 signature and idempotently fulfills `payment.captured` and `order.paid` events.

### Internal AI Gateway (`/api/ai`)
- `POST /api/ai/generate-content` - Executes Gemini content generation with system prompts and schemas.
- `POST /api/ai/generate-videos` - Initiates Veo video generation job.
- `POST /api/ai/poll-videos` - Polls status of running video operations.
- `POST /api/ai/tts` - Converts text to base64 PCM/WAV audio using `gemini-2.5-flash-preview-tts`.

### Campaigns & Creative (`/api/campaign`)
- `POST /api/campaign/prompts` - Generates cohesive 5-asset campaign prompts based on product concept and brand guidelines.
- `POST /api/campaign/render` - Renders asset imagery via Fal.ai with automatic fallback.
- `POST /api/campaign/video` - Starts video generation job via Fal.ai Kling/Seedance.
- `POST /api/campaign/video-poll` - Polls running video generation job status.

### Presentation Studio (`/api/presentation`)
- `POST /api/presentation/generate` - Synthesizes complete presentation decks with Google Search Grounding.
- `GET /api/presentation/health` - Health check probe for presentation worker.

### Human Touch & Support (`/api/human-touch`, `/api/contact-sales`)
- `POST /api/human-touch` - Submits asset curation requests.
- `GET /api/human-touch-queue` - Retrieves admin queue for pending curation items.
- `POST /api/human-touch-complete` - Marks curation requests complete and links edited deliverables.
- `POST /api/contact-sales` - Submits enterprise sales inquiries.

### Proxy (SSRF Protected)
- `GET /api/proxy?url=<target>` - CORS proxy with multi-IP DNS validation and manual redirect verification.
- `GET /api/proxy-image?url=<target>` - Safe image proxy endpoint.

---

## 🤝 Detailed Git Workflow & Contribution Guide

Follow these step-by-step instructions to fork, clone, sync, branch, commit, and submit Pull Requests cleanly.

### 1. 🍴 Fork and Clone the Repository

1. Navigate to the main upstream repository: [https://github.com/hardeep-zw/master-enterprise-creative-suite](https://github.com/hardeep-zw/master-enterprise-creative-suite)
2. Click the **Fork** button (top right) to create a copy under your GitHub account.
3. Clone your personal fork to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/master-enterprise-creative-suite.git
   cd master-enterprise-creative-suite
   npm install
   ```

4. Configure the **upstream** remote pointing to the authoritative repository:
   ```bash
   git remote add upstream https://github.com/hardeep-zw/master-enterprise-creative-suite.git
   ```
   *Verify your remotes:*
   ```bash
   git remote -v
   # origin    https://github.com/YOUR_USERNAME/master-enterprise-creative-suite.git (fetch & push)
   # upstream  https://github.com/hardeep-zw/master-enterprise-creative-suite.git (fetch & push)
   ```

---

### 2. 🌿 Create a Dedicated Feature Branch

Always create a fresh, dedicated branch branching off the latest `main`:
```bash
# Ensure local main is clean and selected
git checkout main

# Create and switch to your feature branch
git checkout -b feature/your-feature-name

# Examples:
# git checkout -b feat/image-generation-enhancement
# git checkout -b fix/payment-method-integration
```

---

### 3. 🔄 Fetching & Syncing Code from Upstream

Before starting work or opening a pull request, synchronize your local branch with upstream to maintain a linear and clean history:

```bash
# 1. Fetch all updates from the upstream repository
git fetch upstream main

# 2. Switch to local main and fast-forward to latest upstream main
git checkout main
git merge upstream/main --ff-only

# 3. Push updated main to your personal GitHub fork
git push origin main

# 4. Switch back to your feature branch and rebase or merge on top of main
git checkout feature/your-feature-name
git rebase main
```

---

### 4. ✍️ Quality Verification, Stage, and Commit

Before committing, ensure that all automated verification checks pass:

```bash
# 1. Run architectural boundary checks
npm run check:boundaries

# 2. Run TypeScript compiler validation
npm run lint

# 3. Run deterministic billing security tests
npm run test:billing

# 4. Stage and commit changes with Conventional Commits syntax
git add .
git commit -m "feat(billing): add unified PaymentStatusModal and automated webhook fulfillment"

# 5. Push your branch to YOUR fork on GitHub
git push -u origin feature/your-feature-name
```

---

### 5. 🚀 Create a Pull Request (PR)

1. Open your browser and navigate to your GitHub fork: `https://github.com/YOUR_USERNAME/master-enterprise-creative-suite`
2. Click **"Compare & pull request"** for your recently pushed branch.
3. Configure the branch targets:
   - **Base repository**: `hardeep-zw/master-enterprise-creative-suite` (base: `main`)
   - **Head repository**: `YOUR_USERNAME/master-enterprise-creative-suite` (compare: `feature/your-feature-name`)
4. Fill in the PR Title and Description with summary of changes and verification evidence.
5. Click **"Create pull request"**!

---

### 6. 🧹 Post-Merge Cleanup

After your Pull Request has been reviewed and merged into `upstream/main`:

```bash
# 1. Fetch the merged main from upstream
git checkout main
git fetch upstream main
git merge upstream/main --ff-only
git push origin main

# 2. Delete the local feature branch
git branch -d feature/your-feature-name

# 3. Delete the feature branch from your remote fork
git push origin --delete feature/your-feature-name
```

---

## 📖 Technical Documentation

- [Architecture & Design System](./docs/ARCHITECTURE.md) - Deep dive into modular architecture, data flows, and layer contracts.
- [Security Architecture & Trust Boundaries](./docs/SECURITY.md) - Complete threat model, invariants, and defensive controls.
- [Pricing & Billing Engine Guide](./docs/PRICING.md) - Plan pricing catalog, INR/USD multi-currency engine, and webhook fulfillment.
- [Razorpay MCP Technical Specification](./docs/RAZORPAY_MCP.md) - Razorpay Model Context Protocol server tools and agent integration.
- [AI Pipeline & Orchestration](./docs/PIPELINE.md) - Model selection, prompt chaining, and Google Search Grounding.
- [Model Directory & Benchmarks](./docs/MODELS.md) - Overview of models used across generative tasks.
- [Token Usage & Cost Guide](./docs/TOKEN_USAGE.md) - Token budgets, cost modeling, and optimization techniques.
