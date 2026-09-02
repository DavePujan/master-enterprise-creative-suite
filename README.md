# Writopedia Enterprise Creative Suite: AI-Powered Brand & Campaign Engine

A production-grade, modular creative automation platform and brand engine. Powered by Google Gemini 2.5, Google Imagen, and Fal.ai (ByteDance/Kling/Flux), this suite enables enterprises and creators to initialize complete brand identities and generate high-impact marketing assets across text, image, audio, video, and multi-asset campaigns.

---

## 🚀 Key Platform Capabilities

- **Brand Initialization & Kit**: Define strategic briefs to auto-generate full brand identity systems (pillars, color palettes, tone, typography, and logo discovery/generation).
- **Campaign Deck & Strategist**: Synthesize 5-asset coordinated multi-channel campaigns (Hero banner, Macro Closeup, Lifestyle, Story, Showcase) with automated high-fashion prompts and visual renders.
- **Storyline Narratives**: Generate multi-scene progressive storylines with AI imagery, scripts, and synthesized voiceovers.
- **Interactive Slideshow Creator**: Build structured presentation decks with live fact-checking grounded by Google Search.
- **Cinematic Video Promos**: Generate dynamic video promos using Google Veo, ByteDance Seedance, and Kling Video.
- **Multi-Voice Studio Audio & TTS**: High-fidelity natural voiceovers with tone and accent control (`gemini-2.5-flash-preview-tts`).
- **Curated Asset Library**: Unified digital asset management with AI auto-tagging, aspect ratio conversion, and image analysis.
- **Human-in-the-Loop Curation Queue**: Administrative portal for reviewing, editing, and fulfilling human touch creative requests.
- **Server-Authoritative Billing**: Plan pricing catalog, Razorpay checkout gateway, and idempotent payment verification.

---

## 🏛️ Architecture Overview

The codebase is organized into a clean, layered, modular architecture with strict trust boundaries:

```text
Writopedia Platform
├── src/
│   ├── shared/                     # Pure framework-free domain layer
│   │   ├── contracts/api.ts        # API DTO contracts & request/response shapes
│   │   ├── types/                  # brand.ts, creative.ts, user.ts, billing.ts
│   │   ├── errors/AppError.ts      # Domain exception hierarchy
│   │   └── utils/                  # Pure image and audio helpers (pcmToWav, etc.)
│   │
│   ├── server/                     # Modular Express backend
│   │   ├── config/env.ts           # Centralized environment configuration
│   │   ├── http/app.ts             # Express app setup, CORS, and route registry
│   │   ├── middleware/             # authMiddleware.ts (default-deny), rateLimiter.ts
│   │   ├── modules/                # Domain routers
│   │   │   ├── ai/                 # /api/ai (internal secure GenAI proxy)
│   │   │   ├── campaigns/          # /api/campaign (prompts, renders, videos)
│   │   │   ├── billing/            # /api/payment (Razorpay orders & idempotent verify)
│   │   │   ├── humanTouch/         # /api/human-touch (curation queues)
│   │   │   ├── sales/              # /api/contact-sales (enterprise inquiries)
│   │   │   └── proxy/              # /api/proxy (hardened SSRF-protected proxy)
│   │   ├── infrastructure/         # External service adapters (Gemini, Fal, Razorpay, Firebase)
│   │   └── utils/logger.ts         # Structured logging with sensitive data redaction
│   │
│   └── client/                     # Feature-sliced React 19 Frontend
│       ├── infrastructure/         # Typed Firebase repositories & AI adapters
│       │   ├── ai/                 # geminiClient.ts, geminiService.ts, modelRegistry.ts
│       │   └── firebase/           # Typed repositories (user, brand, asset, admin, sales, humanTouch)
│       └── features/               # Domain feature modules (zero direct Firebase SDK imports)
│           ├── brand/              # Brand setup, logo display
│           ├── campaigns/          # Campaign strategist & deck workspace
│           ├── slideshow/          # Slideshow display & Google grounding
│           ├── assets/             # Asset library & curation panel
│           ├── billing/            # CreditTopUp, PricingPage, EnterprisePlan
│           ├── admin/              # AdminPanel (human touch queue, sales leads)
│           └── marketing/          # LandingPage, LegalPage
│
├── api/
│   └── index.ts                    # Unified Vercel serverless entry point
├── docs/                           # Technical documentation (Architecture, Security, Pipeline, Models)
└── agent/                          # Local agent framework (untracked in .gitignore)
```

---

## 🔒 Security Architecture & Trust Boundaries

| Trust Boundary | Enforcement Mechanism |
| :--- | :--- |
| **Zero Browser Secrets** | `GEMINI_API_KEY` is completely excluded from client builds; all AI operations proxy through server-side `/api/ai/*`. |
| **Server Billing Authority** | Order amounts and credits are strictly validated against `PLAN_PRICING_CATALOG`; client cannot specify arbitrary amounts. |
| **Payment Idempotency** | Cryptographic HMAC SHA256 verification and atomic transaction ledger prevent replay attacks. |
| **SSRF Multi-IP Protection** | Outbound proxy resolves all DNS records (`all: true`), blocks loopback/private/link-local/metadata/CGNAT ranges, and manually checks redirects. |
| **Default-Deny Authentication** | Server middleware verifies Firebase ID tokens; public routes are explicitly allowlisted. |
| **Firestore Authorization** | `adminSettings` strictly requires `isAdmin()`; user `balance` cannot be modified by client requests. |
| **Repository Boundaries** | UI components are prohibited from importing Firebase SDK directly; all data flows through typed repositories. |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion (Framer Motion).
- **Backend**: Node.js, Express 4, tsx, esbuild.
- **AI Models**: Google Gemini 2.5 Flash, Gemini 3 Pro, Veo 3.1, Gemini TTS, Fal.ai (ByteDance Seedance / Kling).
- **Database & Storage**: Google Firebase Authentication, Cloud Firestore, Cloud Storage.
- **Payments**: Razorpay Gateway (INR & USD auto-detection and checkout).
- **Export Formats**: JSZip, FileSaver, jsPDF, html2canvas.

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **NPM**: `v10+` or `v11+`

### 2. Installation
```bash
git clone https://github.com/DavePujan/master-enterprise-creative-suite.git
cd master-enterprise-creative-suite
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
# Required: Google AI Studio API Key (Server-Side Only)
GEMINI_API_KEY=AIzaSy...

# Optional: Server Port (default 3000)
PORT=3000
NODE_ENV=development

# Optional: Fal.ai key for alternative visual/video generation
FAL_API_KEY=fal_key_...

# Optional: Razorpay payment gateway credentials
VITE_RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_razorpay_secret...
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
| `npm run dev` | Starts the Express server with Vite in development middleware mode (`tsx server.ts`) |
| `npm run build` | Builds the production Vite bundle and compiles `server.ts` with esbuild to `dist/server.cjs` |
| `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| `npm run preview` | Previews the production Vite build locally |
| `npm run lint` | Runs TypeScript compiler checks without emitting files (`tsc --noEmit`) |
| `npm run clean` | Cleans up the `dist/` build output folder |

---

## 🌐 API Endpoint Reference

### Internal AI Gateway
- `POST /api/ai/generate-content` - Executes Gemini model content generation with system prompts and JSON schemas.
- `POST /api/ai/generate-videos` - Initiates Veo video generation job.
- `POST /api/ai/poll-videos` - Polls status of running video operations.
- `POST /api/ai/tts` - Converts text to high-fidelity base64 PCM/WAV audio using `gemini-2.5-flash-preview-tts`.

### Campaigns & Creative
- `POST /api/campaign/prompts` - Generates cohesive 5-asset campaign prompts based on product concept and brand guidelines.
- `POST /api/campaign/render` - Renders asset imagery via Fal.ai with automatic fallback to Pollinations.
- `POST /api/campaign/video` - Starts video generation job via Fal.ai Kling/Seedance.
- `POST /api/campaign/video-poll` - Polls running video generation job status.

### Billing & Payments
- `POST /api/payment/razorpay-order` - Creates an authoritative Razorpay order for a catalog `planId`.
- `POST /api/payment/razorpay-verify` - Verifies HMAC SHA256 signature and idempotently credits user balance.

### Human Touch & Support
- `POST /api/human-touch` - Submits asset curation requests.
- `GET /api/human-touch-queue` - Retrieves admin queue for pending curation items.
- `POST /api/human-touch-complete` - Marks curation requests complete and links edited deliverables.
- `POST /api/contact-sales` - Submits enterprise sales inquiries.

### Proxy (SSRF Protected)
- `GET /api/proxy?url=<target>` - CORS proxy with multi-IP validation and manual redirect verification.
- `GET /api/proxy-image?url=<target>` - Image proxy endpoint.

---

## 📖 Technical Documentation

- [Architecture & Design System](./docs/ARCHITECTURE.md) - Deep dive into modular architecture, data flows, and layer contracts.
- [Security Architecture & Trust Boundaries](./docs/SECURITY.md) - Complete threat model, invariants, and defensive controls.
- [AI Pipeline & Orchestration](./docs/PIPELINE.md) - Model selection, prompt chaining, and Google Search Grounding.
- [Model Directory & Benchmarks](./docs/MODELS.md) - Overview of models used across tasks.
- [Token Usage & Cost Guide](./docs/TOKEN_USAGE.md) - Optimization techniques and token budgets.

---

## 🤝 Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Validate locally: `npm run lint && npm run build`
3. Commit using Conventional Commits: `git commit -m "feat(module): description"`
4. Open a Pull Request targeting `main`.
