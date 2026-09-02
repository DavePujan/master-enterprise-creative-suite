# System Architecture & Technical Specifications
## Project: Writopedia AI (Master Enterprise Creative Suite)

---

### 1. Technology Stack

| Layer | Technology | Version / Spec |
| :--- | :--- | :--- |
| **Frontend Framework** | React + TypeScript | React 19.0.0, TypeScript ~5.8.2 |
| **Styling & Design System** | Tailwind CSS + Typography plugin | Tailwind CSS v4.1.14 |
| **Animations & Transitions** | Motion | `motion` v12.23.24 |
| **Build & Tooling** | Vite + TSX + ESBuild | Vite 6.2.0, tsx 4.21.0 |
| **Backend / API Layer** | Express.js / Node.js + Vercel Functions | Express 4.21.2, Node.js v20+ / v22+ |
| **AI Orchestration** | Google GenAI SDK + Fal.ai Queue API | `@google/genai` v1.29.0 |
| **Storage & Auth** | Firebase Client SDK + Rules | Firebase 12.12.1 |
| **Export & Compilation** | jsPDF, html2canvas, JSZip, FileSaver | Browser canvas & blob streaming |
| **Billing Gateway** | Razorpay Node & Webhooks | Razorpay SDK 2.9.6 |

---

### 2. High-Level System Architecture

```mermaid
graph TD
    Client["React 19 SPA (Vite Client)"]
    
    subgraph Frontend Architecture
        Workspace["Workspace Router & Gem Selector"]
        CanvasEditor["Interactive Image & Layer Canvas"]
        AssetLib["Asset Library & Curation Queue"]
        PrefState["Local Preferences & Session Store"]
    end
    
    subgraph Service Layer (src/services)
        GeminiService["geminiService.ts (Prompt Orchestrator)"]
        TTSConverter["pcmToWav Audio Converter"]
    end
    
    subgraph Backend Services (server.ts / api/*)
        ExpressServer["Express Daemon / Vercel API Gateway"]
        FalProxy["Fal.ai Queue Proxy (/api/campaign/render)"]
        VideoProxy["Fal Video Proxy (/api/campaign/video)"]
        RazorpayProxy["Payment & Webhook Controller (/api/razorpay/*)"]
        PollinationsFallback["Pollinations FLUX Resilient Fallback"]
    end
    
    subgraph External AI Services
        GoogleAI["Google Gemini API (Flash, Pro, Image, TTS)"]
        FalRun["Fal.ai (GPT-Image-2, FLUX Schnell, FLUX Dev, Kling, Veo)"]
        FirebaseCloud["Firebase Firestore & Storage"]
    end

    Client --> Workspace
    Workspace --> GeminiService
    Workspace --> CanvasEditor
    GeminiService --> GoogleAI
    GeminiService --> ExpressServer
    ExpressServer --> FalProxy
    ExpressServer --> VideoProxy
    ExpressServer --> RazorpayProxy
    FalProxy --> FalRun
    FalProxy -.->|On Key Absence or Queue Fail| PollinationsFallback
```

---

### 3. Execution Workflows

#### 3.1 Text & Strategic Narrative Flow
1. User provides campaign brief or prompt in UI.
2. `geminiService.ts` combines brief with active `BrandGuidelines`.
3. Calls `ai.models.generateContent` (`gemini-2.5-flash` or `gemini-2.5-pro`) with Google Search Grounding enabled.
4. Response is streamed/rendered as interactive Markdown with dynamic brand CSS styles applied.

#### 3.2 Visual Generation Flow (Image / Video)
1. User configures aspect ratio, model tier, style, and uploads reference context (product, face, ingredients).
2. Prompt is formulated with negative text-exclusion rules and cultural/demographic parameters.
3. If Fal model: Request is dispatched to `/api/campaign/render`. The Express server posts to Fal.ai queue, polls status every 2s, and returns final asset URL.
4. If Fal credentials fail or are omitted, request routes automatically to Pollinations FLUX engine with matched dimensions and seed.
5. If Gemini image preview: Calls Google GenAI directly, with automatic failover to the Fal proxy if quota is exhausted.
6. The client renders the result with optional draggable, interactive vector logo and typography layers.

---

### 4. Codebase Organization & Refactoring Blueprint

#### Current State (Monolithic Hotspots):
- `src/App.tsx` (~6,750 lines): Contains routing, full workspace layout, image canvas editor, audio player, modal dialogues, sidebar navigation, and state handlers.
- `src/services/geminiService.ts` (~2,320 lines): Houses AI configs, prompt builders, model definitions, API handlers, audio converters, and fallback logic.

#### Target Refactored Structure (`refactor/codebase-reorganization`):
```
e:/A_Writopedia/
├── agent/                           # Agent context, PRD, architecture, and rules
│   ├── PRD.md
│   ├── Architecture.md
│   ├── Rules.md
│   ├── Design.md
│   └── Memory.md
├── api/                             # Serverless edge endpoints (Vercel)
│   ├── campaign/
│   │   ├── render.ts
│   │   └── video.ts
│   └── razorpay/
├── src/
│   ├── components/
│   │   ├── brand/                   # Brand Kit initialization & guideline managers
│   │   ├── canvas/                  # Interactive image, logo, and text canvas editors
│   │   ├── common/                  # Reusable UI primitives (Buttons, Modals, Badges)
│   │   ├── layout/                  # Sidebar, Header, Navbar, Workspace Wrapper
│   │   ├── workspaces/              # Dedicated workspace per Gem type
│   │   │   ├── ImageStudio.tsx
│   │   │   ├── VideoStudio.tsx
│   │   │   ├── CopywritingStudio.tsx
│   │   │   ├── PresentationStudio.tsx
│   │   │   └── AudioStudio.tsx
│   │   └── asset-library/           # Asset Library & Curation Queue panels
│   ├── hooks/                       # Custom React hooks (useCredits, useBrand, useAudio)
│   ├── lib/                         # Utilities (canvas helpers, storage, preferences)
│   ├── services/                    # Modularized AI and API clients
│   │   ├── ai/
│   │   │   ├── geminiClient.ts
│   │   │   ├── falClient.ts
│   │   │   ├── promptBuilders.ts
│   │   │   └── modelRegistry.ts
│   │   └── payment/
│   ├── types/                       # Central TypeScript interfaces & Gem definitions
│   ├── App.tsx                      # Clean root router & layout provider
│   └── main.tsx                     # React root mount
└── server.ts                        # Development & production Express proxy server
```
