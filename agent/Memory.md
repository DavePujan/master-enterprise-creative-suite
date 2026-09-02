# Live Agent Context & Memory Log
## Project: Writopedia AI (Master Enterprise Creative Suite)
*Last Updated: 2026-09-02 (Post-Refactor Baseline)*

---

### 1. Current Branch & Environment State
- **Active Branch**: `refactor/codebase-reorganization`
- **Architecture**: Production-Grade Modular Monolith with Clean Layer Boundaries
- **Local Dev Server**: Running on `http://localhost:3000` (Express backend + Vite HMR frontend via `npm.cmd run dev`).
- **Environment**: Node.js + TypeScript + Vite 6 + Tailwind CSS v4 + React 19.

---

### 2. High-Level Modular Codebase Map

| Layer / Path | Description | Layer Status |
| :--- | :--- | :--- |
| `src/shared/**` | Pure framework-free domain types (`brand.ts`, `creative.ts`, `user.ts`), contracts (`api.ts`), standard errors (`AppError.ts`), and utilities (`audio.ts`, `image.ts`). Zero dependencies on React, Firebase, or Express. | **Complete & Verified** |
| `src/server/**` | Modular Express backend. Contains typed config (`config/env.ts`), infrastructure adapters (`gemini`, `fal`, `payment`, `fallback`), and domain route modules (`campaigns`, `billing`, `humanTouch`, `sales`, `proxy`). | **Complete & Verified** |
| `src/client/infrastructure/**` | Isolated client Firebase adapters (`firebaseApp.ts`, `auth.ts`, `firestore.ts`, `storage.ts`, and repositories in `repositories/`) and client AI generator services (`ai/geminiClient.ts`, `ai/modelRegistry.ts`, `ai/promptBuilders.ts`, `ai/geminiService.ts`). | **Complete & Verified** |
| `src/client/features/**` | Domain-specific feature modules: `brand`, `slideshow`, `marketing`, `billing`, `assets`, `campaigns`, `admin`, `canvas`, `creative`, `layout`, `history`. | **Complete & Verified** |
| `src/components/**` & `src/lib/**` | Backward-compatibility facades re-exporting symbols cleanly to guarantee zero legacy import breaks. | **Complete & Verified** |

---

### 3. Key Invariants & Dependency Guardrails
1. **Dependency Boundary Rules**:
   - `src/shared/**` MUST contain only pure, framework-free code.
   - Client code MUST NOT import `src/server/**` or Express.
   - UI feature components interact with Firestore via typed repositories, not raw ad-hoc queries.
2. **Never Break Logo & Layer Baking**:
   - `bakeLogoOnGeneration`: When `true`, logo base64 is injected into prompt to blend into image pixels.
   - When `false`, background is generated textless, and client renders interactive draggable logo + text layers with HTML5 canvas export.
3. **Resilient Visual Failover Cascade**:
   - Fal.ai (`/api/campaign/render`) -> If `FAL_API_KEY` is missing or queue fails -> Pollinations.ai FLUX fallback.
   - Gemini Image Preview -> If quota error -> Auto-recovers by calling `/api/campaign/render`.

---

### 4. Verification Checkpoint History
- [x] Phase 1: Shared Core Contracts & Utilities (`src/shared/`) — Commit `8bd5453`
- [x] Phase 2: Server Modularization & Route Extraction (`src/server/`) — Commit `71c8529`
- [x] Phase 3: Client Infrastructure & Firebase Repositories (`src/client/infrastructure/`) — Commit `0e0913e`
- [x] Phase 4: Feature Decomposition & Backward-Compatibility Facades (`src/client/features/`) — Commit `92e8fcc`
- [x] Static Dependency Boundary Verification (0 violations)
- [x] Automated TypeScript & Bundler Verification (`npm run lint` & `npm run build` passing with exit code 0)
- [x] Runtime Endpoint Smoke Tests (All 6 API routes responsive and verified)
