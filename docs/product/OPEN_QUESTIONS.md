# Writopedia Enterprise Creative Suite — Open Questions & Technical Debt Log

**Repository**: `DavePujan/master-enterprise-creative-suite`  
**Git Commit Revision**: `913d538`  
**Current Active Branch**: `feature/campaign-strategy-modernization`  
**Audit Date**: October 2026  
**Document Status**: `Complete from available repository evidence`

---

## 1. Overview

This document catalogs unresolved business decisions, architectural contradictions, unverified assumptions, and technical debt identified during the full-project repository audit. Each item is documented with its business/technical impact, why repository evidence cannot resolve it without stakeholder input, a focused decision question, and a safe suggested default.

---

## 2. Strategic Product Decisions

### Q-01: Razorpay Live Merchant Cutover Procedure
* **Category**: Commercial / Payments
* **Impact**: **High** — Determines when real monetary transactions can be processed by customers.
* **Evidence**: [`docs/PRICING.md:10-31`](file:///c:/zz_ALL/z_Project/Writopedia/docs/PRICING.md) strictly mandates Test Mode (`RAZORPAY_MODE="test"`) for all development and testing environments, with automated assertions failing if simulation is active in production.
* **Why Code Cannot Resolve**: The repository codebase intentionally restricts execution to Test Mode to prevent accidental real-money movement. The activation date and merchant KYC completion are business operations external to code.
* **Focused Question**: *What is the target schedule for switching Razorpay credentials from `rzp_test_...` to `rzp_live_...`, and what merchant bank settlement accounts have been approved?*
* **Suggested Default**: Maintain strict Test Mode until all automated billing test suites pass and explicit stakeholder authorization is granted in writing.

---

### Q-02: Credit Expiry & Roll-Over Rules
* **Category**: Billing & Accounting
* **Impact**: **Medium** — Impacts long-term revenue recognition and database credit liability balances.
* **Evidence**: [`packages/types/billing.ts`](file:///c:/zz_ALL/z_Project/Writopedia/packages/types/billing.ts) and [`supabase/migrations/20260903000002_hardened_functions_and_procedures.sql`](file:///c:/zz_ALL/z_Project/Writopedia/supabase/migrations/20260903000002_hardened_functions_and_procedures.sql) grant monthly credits upon subscription renewal. The schema does not currently enforce a time-to-live (TTL) expiration on unused credits.
* **Why Code Cannot Resolve**: Product requirements in `TOKEN_USAGE.md` do not explicitly state whether unused monthly subscription credits expire after 30 days or roll over indefinitely.
* **Focused Question**: *Do unused monthly subscription credits roll over indefinitely, expire at the end of each billing cycle, or cap at a maximum balance (e.g. 2x monthly quota)?*
* **Suggested Default**: Allow roll-over up to a maximum cap of 3x the monthly plan quota to balance enterprise customer satisfaction with financial liability control.

---

### Q-03: Multi-Factor Authentication (MFA) for Enterprise Accounts
* **Category**: Security & Identity
* **Impact**: **High** — Dictates compliance with enterprise security audits and NIST SP 800-63B digital identity guidelines.
* **Evidence**: Authentication now enforces an 8-character minimum policy with compromised password screening and long passphrase support up to 128 characters (`apps/web/src/infrastructure/supabase/auth.ts:101-131`). NIST guidance permits an 8-character minimum when used as part of multi-factor authentication (MFA), while recommending 15 characters for single-factor password-only setups.
* **Why Code Cannot Resolve**: Supabase GoTrue supports TOTP/MFA enrollment, but MFA enforcement policies depend on customer enterprise tier requirements.
* **Focused Question**: *Should MFA (TOTP / authenticator apps) be made mandatory for Enterprise/Pro workspace tiers, or offered as an optional opt-in setting?*
* **Suggested Default**: Implement optional TOTP authenticator app support in User Settings (`/settings`), with an option for Workspace Admins to enforce mandatory MFA for their team members.

---

### Q-04: Third-Party Direct Social Media Publishing
* **Category**: Product Scope / Integrations
* **Impact**: **Medium** — Determines whether the platform remains an asset creation & export suite or expands into an automated social media scheduler.
* **Evidence**: The system generates high-impact, platform-optimized captions with hashtags and 16:9/9:16 video promos (`apps/web/src/features/creative/`), but exports them via manual download or ZIP packages (`apps/api/src/modules/campaigns/campaignRoutes.ts`).
* **Why Code Cannot Resolve**: No Meta Graph API, TikTok API, or X API publishing code exists in the repository. It is unknown whether direct social publishing is on the near-term roadmap.
* **Focused Question**: *Is direct social media scheduling and auto-publishing planned for a future release, or should Writopedia remain focused purely on asset creation and export?*
* **Suggested Default**: Retain the current high-performance export and download model, providing pre-formatted ZIP archives and copy-paste platform blocks.

---

## 3. Technical Debt & Operational Observations

### Q-05: Client Bundle Code-Splitting for PDF/PPTX Engines
* **Category**: Performance & Frontend Optimization
* **Impact**: **Low-Medium** — Vite build produces warnings that individual chunks exceed 500kB (`jspdf.es.min.js`: 390kB, `html2canvas.esm.js`: 202kB, `index.js`: 3.3MB).
* **Evidence**: [`apps/web/src/app/App.tsx`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/app/App.tsx) and [`apps/web/src/features/slideshow/`](file:///c:/zz_ALL/z_Project/Writopedia/apps/web/src/features/slideshow/) statically import `jspdf` and `html2canvas`.
* **Why Code Cannot Resolve**: Resolving this requires architectural approval to configure `build.rollupOptions.output.manualChunks` in `vite.config.ts` or replace static imports with dynamic `React.lazy()` / `import()` calls.
* **Focused Question**: *Should we enable dynamic code-splitting for presentation export libraries to reduce the initial frontend bundle footprint below 1MB?*
* **Suggested Default**: Defer dynamic loading of `jspdf`, `html2canvas`, and `pptxgenjs` to when an export modal is actively triggered by the user.

---

### Q-06: Human Touch Curation Specialist Alerting Pipeline
* **Category**: Operations / Workflows
* **Impact**: **Medium** — Turnaround time for Human-in-the-Loop creative requests depends on timely notification of agency specialists.
* **Evidence**: Database tables (`user_curation_requests`) and frontend submission components (`HumanTouchRequestModal.tsx`) are fully functional, but notifications to staff currently rely on database polling rather than an external webhook or Slack/Pager alert.
* **Why Code Cannot Resolve**: Target notification channels (e.g. Slack webhook URL, PagerDuty, or dedicated internal email alias) are not defined in `.env.example`.
* **Focused Question**: *Which internal communication channel should receive instant alerts when a user submits a Human Touch curation request?*
* **Suggested Default**: Add an optional `CURATION_ALERT_WEBHOOK_URL` in `apps/api/src/config/env.ts` to dispatch JSON payloads to internal team Slack or Discord channels upon request creation.

---

### Q-07: AdDirector & DiscoveryWorkspace TypeScript Compiler Alignment
* **Category**: Codebase Maintainability & Type Strictness
* **Impact**: **Medium** — Global `npm run lint` (`tsc --noEmit`) reports compiler errors on properties like `targetAudience`, `objective`, `platform` on `Partial<AdBrief>` in `DiscoveryWorkspace.tsx` and camera movement / asset properties on `packages/ad-director/compiler/adSpecPromptCompiler.ts`. Note that Vite and ESBuild compilation (`npm run build:api`, `npm run build:web`) succeed because transpilation strips types, but global type-checking fails.
* **Why Code Cannot Resolve**: Fixing requires updating the shared `AdBrief` and `SemanticAssetItem` type contracts in `packages/contracts/` and `packages/types/` to reconcile newly added AdDirector DSL fields with the legacy brief components. Per `/generate-prd` rules, application code must not be modified during documentation discovery.
* **Focused Question**: *Should we synchronize the `AdBrief` interface in `packages/types/adDirector.ts` with the DiscoveryWorkspace form state fields in an upcoming maintenance sprint?*
* **Suggested Default**: Reconcile `AdBrief` and `SemanticAssetItem` definitions in a dedicated technical debt sprint to restore a green `tsc --noEmit` check across the entire monorepo.

