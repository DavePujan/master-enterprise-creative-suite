# Agent Behavioral Rules & Engineering Guardrails
## Project: Writopedia AI (Master Enterprise Creative Suite)

---

### 1. Technology & Dependency Boundaries

#### Permitted Libraries:
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `@tailwindcss/typography`). Use semantic utility classes with brand CSS variables.
- **Icons**: `lucide-react` exclusively. Do not import or mix external icon packages (e.g. `react-icons`, `@heroicons`).
- **Animations**: `motion` (fka Framer Motion). Use micro-animations and layout animations smoothly.
- **AI SDK**: `@google/genai` (version `^1.29.0`) for Gemini APIs.
- **Utilities**: `clsx` and `tailwind-merge` (via `cn(...)` helper function).
- **Exporting**: `jspdf`, `html2canvas`, `jszip`, `file-saver`.

#### Strictly Prohibited / Deprecated:
- **DO NOT** install additional UI component libraries (such as Shadcn CLI dependencies, Material UI, Chakra UI, or Ant Design). All UI components must remain lightweight Vanilla React + Tailwind CSS.
- **DO NOT** use `any` type for core data structures (Gems, BrandGuidelines, Assets, SlideStructures) when refactoring. Maintain explicit TypeScript interfaces.
- **DO NOT** use synchronous blocking loops to poll long-running background tasks. Always use non-blocking asynchronous intervals with timeouts.
- **DO NOT** leak API keys, secret credentials, or write raw keys in client-side code. All third-party secrets (`GEMINI_API_KEY`, `FAL_API_KEY`, `RAZORPAY_KEY_SECRET`) must be routed through server endpoints or `.env`.

---

### 2. Code Quality & Refactoring Standards

1. **Maintain Single-Responsibility Principle**:
   - `App.tsx` must not remain a 6,700-line monolith. When extracting components, isolate domain state (e.g. Canvas Editor, Audio Player, Presentation Viewer, Asset Library).
   - Component files must be modular, ideally keeping individual components under 400 lines of focused code.
2. **Preserve Business Logic & Feature Parity**:
   - Refactoring must **never** break existing functionality, including:
     - Interactive logo dragging, coordinate scaling, and light/dark invert toggles.
     - Brand color palette dynamic variable injection (`getBrandStyles`).
     - Session persistence for user preferences (`localStorage` + cookie backup).
     - Model failover behavior (Fal -> Pollinations Flux; Gemini -> Fal).
3. **Immutability & State Safety**:
   - Never mutate state in-place. Always use functional state setters (`setCredits(prev => ...)`, `setTextLayers(prev => prev.map(...))`).

---

### 3. Error Handling & Resilience Patterns

1. **Graceful Degradation**:
   - Network errors or model quota exhaustion must not crash the React rendering tree.
   - Always wrap API invocations in `try/catch` and utilize `getQuotaErrorMessage(...)` to present user-friendly error banners.
2. **Fallback Cascades**:
   - When generating visuals, if the primary API fails, always trigger the secondary provider or fallback engine before emitting an error to the user.
3. **TypeScript Safety**:
   - Ensure `npm run lint` (`tsc --noEmit`) passes cleanly without type regressions.

---

### 4. Git & Branching Hygiene

1. **Branch Integrity**:
   - All refactoring must take place on the designated branch: `refactor/codebase-reorganization`.
   - Never push directly to `main` without explicit review.
2. **Atomic Commits**:
   - Commit logically grouped changes with Conventional Commits messages (`refactor: ...`, `feat: ...`, `fix: ...`).
   - Run verification checks before concluding tasks.
