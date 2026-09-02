# Live Agent Context & Memory Log
## Project: Writopedia AI (Master Enterprise Creative Suite)
*Last Updated: 2026-09-02*

---

### 1. Current Branch & Environment State
- **Active Branch**: `refactor/codebase-reorganization`
- **Previous Working Branches**:
  - `main`: Baseline production code.
  - `feature/image-generation`: Dedicated image generation feature branch.
  - `feat/preferences-session-persistence`: Session persistence updates.
- **Local Dev Server**: Running on `http://localhost:3000` (Express backend + Vite HMR frontend via `npm.cmd run dev`).
- **Environment**: Node.js + TypeScript + Vite 6 + Tailwind CSS v4 + React 19.

---

### 2. High-Level Codebase Map & Key Files

| Module / Path | Description | Status & Attention Items |
| :--- | :--- | :--- |
| `src/App.tsx` | Main application entry point (~6,750 lines). Contains full workspace layout, router, interactive canvas layer, audio player, modal dialogues, sidebar navigation, and tool handling. | **High Priority Refactoring Candidate**: Target for modular component decomposition. |
| `src/services/geminiService.ts` | Core AI engine (~2,320 lines). Houses AI configurations, prompt builders, model definitions (`IMAGE_MODELS`, `TEXT_MODELS`, `VIDEO_MODELS`), Google GenAI calls, audio converters, and fallback logic. | **High Priority Refactoring Candidate**: Target for splitting into `geminiClient.ts`, `falClient.ts`, `promptBuilders.ts`, and `modelRegistry.ts`. |
| `server.ts` | Express backend (~830 lines). Serves static assets, proxies Fal.ai image and video queues, handles Razorpay webhooks, and provides Pollinations FLUX failovers. | Stable backend proxy. |
| `src/components/BrandLogo.tsx` | Brand SVG logo generator and vector renderer. | Stable. |
| `src/components/SlideshowDisplay.tsx` | Slide deck presentation renderer with PDF export. | Stable. |
| `src/components/CampaignStrategistWorkspace.tsx` | Multi-asset strategic campaign workspace. | Stable. |
| `src/components/AssetLibrary.tsx` | Central asset management and curation queue. | Stable. |
| `src/index.css` | Tailwind CSS v4 design tokens, custom font imports, and Crimson/Rose palette variables. | Configured. |

---

### 3. Key Operational Rules & Gotchas
1. **Never Break Logo & Layer Baking**:
   - `bakeLogoOnGeneration`: When `true`, logo base64 is injected into the AI prompt to blend into image pixels.
   - When `false`, image is generated clean, and the client renders interactive draggable logo and text layers over the image with HTML5 canvas download.
2. **Resilient Visual Failover Cascade**:
   - Fal.ai (`/api/campaign/render`) -> If `FAL_API_KEY` is missing or queue fails -> Pollinations.ai FLUX fallback.
   - Gemini Image Preview -> If quota error -> Auto-recovers by calling `/api/campaign/render`.
3. **Session Persistence**:
   - Preferences and themes are stored in `writopedia_user_preferences_v1` in `localStorage` with cookie synchronization (`writo_pref_theme`).

---

### 4. Refactoring Roadmap & Progress Tracker

- [x] Create project documentation and behavioral rules in `agent/` (`PRD.md`, `Architecture.md`, `Rules.md`, `Design.md`, `Memory.md`).
- [ ] **Phase 1: Service Modularization**:
  - Extract `src/services/ai/modelRegistry.ts` (Constants, models, costs).
  - Extract `src/services/ai/promptBuilders.ts` (Brand injection, cultural guidelines, negative prompts).
  - Extract `src/services/ai/falClient.ts` (Render proxy calling and queue polling).
  - Extract `src/services/ai/geminiClient.ts` (Google GenAI SDK wrapper and error mapping).
  - Extract `src/services/audio/pcmToWav.ts` (Audio header binary writer).
- [ ] **Phase 2: Types & Context Extraction**:
  - Consolidate all shared interfaces into `src/types/creative.ts` and `src/types/brand.ts`.
- [ ] **Phase 3: Component Decomposition from `App.tsx`**:
  - Extract `src/components/canvas/InteractiveCanvas.tsx` (Draggable logo, text layers, coordinate inspectors).
  - Extract `src/components/workspaces/ImageStudioWorkspace.tsx`.
  - Extract `src/components/workspaces/AudioStudioWorkspace.tsx`.
  - Extract `src/components/layout/Sidebar.tsx` and `Header.tsx`.
- [ ] **Phase 4: Verification & Linting**:
  - Run `npm run lint` and verify full feature parity on `http://localhost:3000`.
