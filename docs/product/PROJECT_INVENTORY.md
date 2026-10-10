# Writopedia Enterprise Creative Suite — Complete Project Inventory

**Repository**: `DavePujan/master-enterprise-creative-suite`  
**Git Commit Revision**: `913d538`  
**Current Active Branch**: `feature/campaign-strategy-modernization`  
**Audit Date**: October 2026  
**Document Status**: `Complete from available repository evidence`

---

## 1. System Overview & Monorepo Structure

Writopedia is organized as an enterprise full-stack TypeScript monorepo with strict architectural boundaries (`npm run check:boundaries`). The product consists of three primary first-party applications, six shared packages, an infrastructure/migration layer, and comprehensive automation test suites.

```text
Writopedia Platform
├── apps/
│   ├── web/                    # React 19 Client SPA (Vite, TailwindCSS v4, Motion)
│   ├── api/                    # Express 4 Modular Gateway (17 domain routers, security middleware)
│   └── worker/                 # Dedicated persistent background worker (Video & Presentation jobs)
├── packages/
│   ├── ad-director/            # Video AdDirector DSL, compiler, QA, and assembly engine
│   ├── contracts/              # DTO schemas, Zod request/response contracts
│   ├── errors/                 # Standardized AppError hierarchy
│   ├── presentation-engine/    # Slide deck layout algorithms, themes, & PPTX export
│   ├── types/                  # Pure TypeScript domain models (billing, brand, user, creative)
│   └── utils/                  # Audio PCM-to-WAV conversion, image format helpers
├── supabase/
│   └── migrations/             # 14 PostgreSQL migrations (schemas, RLS policies, atomic RPCs)
├── scripts/                    # 47 automated verification, security, and integration suites
└── docs/                       # Technical architecture, pricing, models, and security specs
```

---

## 2. First-Party Applications Inventory

| Application | Path | Runtime / Framework | Entry Point | Primary Responsibility | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Web Frontend** | `apps/web/` | React 19.0.0, Vite 6.2.0 | [`apps/web/src/main.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/main.tsx) | User interface, authentication state, canvas editor, campaign strategist, video/audio studios, brand kit | **Reviewed** |
| **API Gateway** | `apps/api/` | Node 22, Express 4.21.2 | [`apps/api/src/serverless.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/serverless.ts) / [`server.ts`](file:///c:/zz_ALL/z_Project/Writopedia/server.ts) | Security middleware, default-deny JWT auth, 17 domain modules, provider adapters, billing transactions | **Reviewed** |
| **Background Worker**| `apps/worker/` | Node 22 Standalone Daemon | [`apps/worker/src/index.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/worker/src/index.ts) | Asynchronous video job polling, credit settlement, presentation export rendering | **Reviewed** |

---

## 3. Frontend Module Coverage Matrix (`apps/web`)

### A. Core Infrastructure & Layout
* **App Router & Navigation**: [`apps/web/src/app/AppRouter.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/app/AppRouter.tsx), [`apps/web/src/lib/navigation.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/lib/navigation.ts) — Enforces centralized authentication, unverified email quarantine (`/verify-email`), brand initialization gate (`/brand-init`), and admin authorization checks.
* **App Shell & Workspace**: [`apps/web/src/app/AppShell.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/app/AppShell.tsx), [`apps/web/src/features/layout/components/AppHeader.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/features/layout/components/AppHeader.tsx), [`apps/web/src/features/layout/components/AppSidebar.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/features/layout/components/AppSidebar.tsx) — Top navigation, brand switcher, credit badge, responsive drawer, history drawer.

### B. Feature Slices

| Feature Slice | Directory | Key Components | Entry Route | Review Status |
| :--- | :--- | :--- | :--- | :---: |
| **Authentication** | `apps/web/src/features/auth/` | `AuthBox.tsx`, `AuthCallbackView.tsx`, `VerifyEmailView.tsx`, `useAuth.ts` | `/login`, `/verify-email`, `/auth/callback` | **Reviewed** |
| **Brand Guidelines** | `apps/web/src/features/brand-guidelines/` | `BrandSetup.tsx`, `BrandGuidelinesDrawer.tsx`, `ColorPalettePicker.tsx` | `/brand-init`, workspace drawer | **Reviewed** |
| **Campaign Strategist**| `apps/web/src/features/campaigns/` | `CampaignStrategistWorkspace.tsx`, `BriefStage.tsx`, `TerritoryStage.tsx`, `StrategyStage.tsx`, `DeliverablesStage.tsx`, `ActivationStage.tsx`, `SavedStrategiesModal.tsx` | `/workspace` (Gem: `campaign-strategist-y`) | **Reviewed** |
| **Ecommerce Bundle** | `apps/web/src/features/campaigns/` | `CampaignDeckWorkspace.tsx`, `AssetCard.tsx`, `PromptEditorModal.tsx` | `/workspace` (Gem: `bundles-campaigns`) | **Reviewed** |
| **Creative Workspace** | `apps/web/src/features/creative/` | `CreativeWorkspace.tsx`, `OutputCanvas.tsx`, `CommandBar.tsx`, `useCreativeExecution.ts` | `/workspace` (Generic Gems) | **Reviewed** |
| **Interactive Canvas** | `apps/web/src/features/canvas/` | `InteractiveLogoOverlay.tsx`, `InteractiveTextCanvas.tsx`, `useCanvasEditor.ts` | Embedded in Image/Creative preview | **Reviewed** |
| **Billing & Payments** | `apps/web/src/features/billing/` | `PricingPage.tsx`, `EnterprisePlan.tsx`, `CreditTopUp.tsx`, `PaymentStatusModal.tsx`, `CreditGateContext.tsx` | `/pricing`, `/topup`, modal overlays | **Reviewed** |
| **Corporate Slideshow**| `apps/web/src/features/slideshow/` | `SlideshowWorkspace.tsx`, `PresentationCanvas.tsx`, `SlideEditor.tsx` | `/workspace` (Gem: `corporate-presentations`) | **Reviewed** |
| **Cinematic Video** | `apps/web/src/features/video/` | `VideoWorkspace.tsx`, `VideoPreviewPlayer.tsx`, `KeyframeSelector.tsx` | `/workspace` (Gem: `cinematic-video`) | **Reviewed** |
| **Audio Studio** | `apps/web/src/features/creative/` | Voiceover & Music subviews in `CreativeWorkspace.tsx` | `/workspace` (Gem: `audio-studio`) | **Reviewed** |
| **Asset Library** | `apps/web/src/features/assets/` | `AssetLibrary.tsx`, `AssetLibraryPage.tsx`, `CurationQueuePanel.tsx` | `/assets` | **Reviewed** |
| **History & Audits** | `apps/web/src/features/history/` | `CreativeHistoryPage.tsx`, `CreditHistoryPage.tsx` | `/history/creative`, `/history/credits` | **Reviewed** |
| **Human-in-the-Loop** | `apps/web/src/features/human-touch/`| `HumanTouchRequestModal.tsx`, `CurationToasters.tsx` | Global overlay | **Reviewed** |
| **Admin Console** | `apps/web/src/features/admin/` | `AdminConsole.tsx`, `CurationSection.tsx`, `SettingsSection.tsx` | `/admin` | **Reviewed** |
| **Settings** | `apps/web/src/features/settings/` | `SettingsPage.tsx`, `ProfileSettings.tsx`, `WorkspaceMembers.tsx` | `/settings` | **Reviewed** |
| **Public Marketing** | `apps/web/src/features/marketing/`| `LandingPage.tsx`, `LegalPage.tsx` | `/`, `/legal/*` | **Reviewed** |

---

## 4. Backend Module Coverage Matrix (`apps/api`)

Mounted in [`apps/api/src/http/app.ts`](file:///c:/zz_ALL/z_Project/Writopedia/apps/api/src/http/app.ts):

| Module Name | Route Prefix | Primary Controller | Key Dependencies | Review Status |
| :--- | :--- | :--- | :--- | :---: |
| **AI Proxy** | `/api/ai` | `aiRoutes.ts` | Google GenAI SDK (`@google/genai`) | **Reviewed** |
| **Campaigns** | `/api/campaign` | `campaignRoutes.ts` | `campaignStrategyService.ts`, `bundleOrchestratorService.ts`, `campaignRepository.ts` | **Reviewed** |
| **Image Engine** | `/api/images` | `imageRoutes.ts` | `imageGenerationService.ts`, Fal.ai (`@fal-ai/client`), Google GenAI | **Reviewed** |
| **Text & Copy** | `/api/text` | `textRoutes.ts` | `textGenerationService.ts`, Gemini 2.5 Pro/Flash | **Reviewed** |
| **Audio Studio** | `/api/audio` | `audioRoutes.ts` | `audioGenerationService.ts`, `gemini-2.5-flash-preview-tts` | **Reviewed** |
| **Video Engine** | `/api/video` | `videoRoutes.ts` | `videoGenerationService.ts`, Google Veo 3.1, Kling V3, Seedance 2.0 | **Reviewed** |
| **Ad Director** | `/api/ad-director` | `adDirectorRoutes.ts` | `packages/ad-director/`, `directorsPlanService.ts`, `videoQaService.ts` | **Reviewed** |
| **Presentations** | `/api/presentation`| `presentationRoutes.ts` | `presentationService.ts`, `packages/presentation-engine/`, Google Search Grounding | **Reviewed** |
| **Billing & Payments**| `/api/payment` | `billingRoutes.ts` | `billingService.ts`, `creditService.ts`, Razorpay SDK (`razorpay`) | **Reviewed** |
| **Enterprise Sales**| `/api/contact-sales`| `salesRoutes.ts` | `salesService.ts`, Resend (`resend`) | **Reviewed** |
| **Brand Guidelines** | `/api/brand-guidelines`| `brandRoutes.ts` | Supabase Client, Gemini Brand Extractor | **Reviewed** |
| **History & Logs** | `/api/history` | `historyRoutes.ts` | PostgreSQL `user_history` table | **Reviewed** |
| **Assets DAM** | `/api/assets` | `assetRoutes.ts` | Supabase Storage `user-assets` bucket | **Reviewed** |
| **Admin Operations** | `/api/admin` | `adminRoutes.ts` | `adminAuthMiddleware.ts`, `public.user_roles` check | **Reviewed** |
| **Workspaces** | `/api/workspaces` | `workspaceRoutes.ts` | `workspaceRepository.ts`, PostgreSQL multi-tenant tables | **Reviewed** |
| **Human Touch** | `/api/human-touch` | `humanTouchRoutes.ts` | Human touch curation queue | **Reviewed** |
| **Universal Proxy** | `/api/proxy` | `proxyRoutes.ts` | Undici `Agent`, `dns.lookup`, SSRF validator | **Reviewed** |

---

## 5. Shared Domain Packages Matrix (`packages/`)

| Package Directory | Key Exports / Modules | Architectural Boundary Invariant | Review Status |
| :--- | :--- | :--- | :---: |
| **`packages/types`** | `billing.ts`, `brand.ts`, `campaignStrategy.ts`, `creative.ts`, `imageGeneration.ts`, `videoGeneration.ts`, `adDirector.ts`, `presentation.ts`, `user.ts` | Pure TypeScript type definitions. **Zero imports** of React, Express, or vendor SDKs. | **Reviewed** |
| **`packages/contracts`** | `adSpecContracts.ts`, `api.ts`, `directorStageContracts.ts`, `executionQueueContracts.ts`, `videoAssemblyContracts.ts`, `videoQaContracts.ts` | Zod runtime schemas & DTO validation contracts for client-server communication. | **Reviewed** |
| **`packages/ad-director`** | `adspec/`, `assembly/`, `capabilities/`, `compiler/`, `operations/`, `qa/`, `stages/`, `validation/` | Domain engine implementing the 10-phase Video Commercial Production pipeline. | **Reviewed** |
| **`packages/presentation-engine`** | `domain/`, `geometry/`, `layouts/`, `theme/`, `typography/`, `validation/`, PPTX export | Pure presentation math, layout hierarchy, slide typography, color harmony, and PPTX generation. | **Reviewed** |
| **`packages/errors`** | `AppError`, `InsufficientCreditsError`, `NotFoundError`, `UnauthorizedError`, `ValidationError` | Unified error code taxonomy and HTTP status mapping. | **Reviewed** |
| **`packages/utils`** | `pcmToWav.ts`, `colorUtils.ts`, `stringUtils.ts` | Framework-agnostic algorithms for audio processing and string normalizations. | **Reviewed** |

---

## 6. Database Migrations & Persistence Schema (`supabase/migrations/`)

| Migration File | Key Tables / Procedures Created | RLS Policies Applied | Review Status |
| :--- | :--- | :--- | :---: |
| `20260903000001_initial_schema.sql` | `profiles`, `workspaces`, `workspace_members`, `brand_guidelines`, `user_assets`, `user_history`, `credit_balances`, `credit_ledger` | Multi-tenant tenant isolation | **Reviewed** |
| `20260903000002_hardened_functions_and_procedures.sql` | `reserve_credits_for_ai`, `grant_credits_atomic`, `deduct_credits_atomic`, `settle_credits_atomic`, `release_reserved_credits` | Strict row-level locking (`FOR UPDATE`) | **Reviewed** |
| `20260903000003_row_level_security.sql` | Applied RLS across all base tables | User & workspace member ownership | **Reviewed** |
| `20260904000001_storage_user_assets_rls.sql` | `storage.buckets` (`user-assets`), storage objects RLS | Folder-prefix path validation (`(storage.foldername(name))[1] = auth.uid()::text`) | **Reviewed** |
| `20260904000002_presentation_engine.sql` | `presentation_decks`, `presentation_slides`, `presentation_exports` | Workspace & user isolation | **Reviewed** |
| `20260905000001_campaign_strategies_versioned.sql` | `campaign_strategies`, `campaign_strategy_versions` | Versioned campaign history | **Reviewed** |
| `20260906000001_ad_director_engine.sql` | `ad_director_sessions`, `ad_director_briefs` | Session ownership isolation | **Reviewed** |
| `20260907000001_security_audit_logs.sql` | `security_audit_logs` | Admin-only read, append-only service write | **Reviewed** |
| `20260908000001_ad_director_execution_architecture.sql` | `ad_director_executions`, `ad_director_plans` | Multi-shot plan execution storage | **Reviewed** |
| `20260909000001_video_ad_normalized_schema.sql` | `video_ad_projects`, `video_ad_briefs` | Normalized video production schema | **Reviewed** |
| `20260909000002_video_ad_discovery.sql` | `video_ad_discovery_sessions` | Discovery question & answer tracking | **Reviewed** |
| `20260909000003_video_ad_concepts.sql` | `video_ad_concepts` | Concept selection & script versions | **Reviewed** |
| `20260910000001_video_ad_qa_engine.sql` | `video_ad_qa_evaluations` | AI QA scoring & compliance audits | **Reviewed** |
| `20260911000001_video_ad_assembly_engine.sql` | `video_ad_assemblies`, `video_ad_exports` | Multi-variant video export tracks | **Reviewed** |

---

## 7. Verification & Automated Test Suites (`scripts/`)

47 automated TypeScript/Node scripts verify platform integrity:
* **Billing & Gateway Security**: `test-billing-security.ts` (63 assertions), `test-razorpay-integration.ts`
* **Authentication Hardening**: `verify-auth-security.ts` (password bounds, blacklist screening, real-time matching)
* **Campaign & Strategy Persistence**: `verify-saved-strategies-manager.ts`, `verify-campaign-persistence-and-loader.ts`, `test-campaign-strategy.ts`, `test-ecommerce-bundle-hardening.ts`
* **Video & AdDirector Pipelines**: `test-phase1-adspec-normalized.ts` through `test-phase10-assembly-export.ts`, `test-video-engine.ts`, `test-ad-director-dsl.ts`
* **Presentation Engine**: `verify-presentation-pipeline.ts`
* **Audio & Speech**: `verify-audio-live.ts`, `verify-tts-fallback.ts`, `test-audio-studio.ts`
* **Security & SSRF Hardening**: `test-security-phase1.ts`, `test-security-phase2.ts`, `test-security-phase3.ts`
* **Architectural Boundary Linting**: `check-boundaries.cjs`
