# Ecommerce Bundle Gem

## Audit Scope
Inspected `CampaignDeckWorkspace.tsx` and `falClient.ts` to verify asset generation, rendering pipelines, credit deductions, and export functionality for the Ecommerce Bundle.

## Executive Summary
The audit confirmed all five findings. The bundle generation parallelizes rendering and deducts credits non-atomically, risking partial failures. Product references are not transmitted to the backend rendering endpoint. An invalid engine name is exposed in the UI but defaults to a hardcoded adapter, and zip exports fail silently on remote image downloads. 

## Verification Summary

| ID | Finding | Verdict | Severity | Confidence |
|---|---|---|---|---|
| 01 | Uploaded Product References Are Lost During Rendering | VERIFIED | HIGH | HIGH |
| 02 | Credit Deductions Are Not Atomic | VERIFIED | HIGH | HIGH |
| 03 | Parallel Rendering Creates Provider Risk | VERIFIED | MEDIUM | HIGH |
| 04 | Engine Selection Mismatch | VERIFIED | LOW | HIGH |
| 05 | ZIP Export Can Produce Incomplete Packages | VERIFIED | LOW | HIGH |

## Finding 01 — Uploaded Product References Are Lost During Rendering

### Original Audit Claim
"The planning flow knows that product and face references exist, but the actual reference image data is not consistently passed to the rendering request."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`

### Relevant Symbols
- `handleGenerateCampaign`

### Evidence
The initial `POST /api/campaign/prompts` call receives a boolean flag (`referenceContexts: { hasProduct: !!productContext, hasFace: !!faceContext }`), but the subsequent `apiClient.post("/api/campaign/render")` payload completely omits passing the actual base64 `productContext.data` or `faceContext.data`. 

### Execution / Data Flow
User uploads product image → Context state updated → Clicks Generate → Prompts generated using boolean flags → Parallel image rendering loops launched with only `{ prompt, size, engine, falKey, guidelines }` → Image generated without actual reference data.

### Verification Analysis
Proves the claim. The backend rendering endpoint never receives the source image, making the generated assets disregard the user's explicit product shot.

### Security / Reliability / Performance Impact
Critical functional bug.

### Conditions Required to Trigger
Using product or face references in the Ecommerce Bundle.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Pass the `productContext` and `faceContext` data in the `/api/campaign/render` payload and ensure the backend adapter forwards it to the provider.

---

## Finding 02 — Credit Deductions Are Not Atomic

### Original Audit Claim
"The bundle is conceptually priced as a package, but individual image-generation calls can deduct credits independently. A partial bundle can consume credits while later assets fail because the user no longer has sufficient balance."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`

### Relevant Symbols
- `handleGenerateCampaign` (Render Loop)

### Evidence
The component iterates over 5 roles (`Hero`, `Closeup`, `Lifestyle`, `Offer`, `Alternate`) and independently calls `/api/campaign/render` for each. On a `402` or `INSUFFICIENT_CREDITS` error inside the loop, the global credit gate is triggered, and the specific asset is marked as failed, but any preceding assets that succeeded have already deducted their credits.

### Execution / Data Flow
Five concurrent rendering queries → API deducts credits upon each execution independently → If the account depletes mid-batch, subsequent requests fail.

### Verification Analysis
Proves the claim. The frontend treats this as a batch job but the backend processes billing per-image.

### Security / Reliability / Performance Impact
Results in a poor user experience and partial state generation where a user pays for an incomplete bundle.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Implement a batch rendering endpoint that verifies and reserves credits for all 5 assets before beginning the operation.

---

## Finding 03 — Bundle Lacks Backend Concurrency Control and Queue Semantics

### Original Audit Claim
"Five image-generation requests are launched concurrently."

### Corrected Architectural Assessment
The bundle lacks backend-controlled concurrency and queue semantics; browser-side `Promise.all(5)` makes provider load, retries, billing, and partial completion fragile to control.

### Verdict
VERIFIED (RE-FRAMED)

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`
- `apps/api/src/modules/campaigns/bundleOrchestratorService.ts`

### Relevant Symbols
- `handleGenerateCampaign`
- `Promise.all(renderPromises)`

### Evidence
The frontend previously mapped over the 5 roles and triggered `apiClient.post` for each simultaneously, awaiting them with `Promise.all(renderPromises)` in the browser without retry policies, concurrency governors, or centralized status management.

### Execution / Data Flow
Browser ├── request 1 ├── request 2 ├── request 3 ├── request 4 └── request 5

### Verification Analysis
Modern Fal AI documentation confirms that Fal natively supports high-concurrency workloads, autoscaling infrastructure, and queue-based execution. Concurrency itself is not inherently invalid. Rather, the true architectural problem is **where concurrency and queue state are controlled**. Orchestrating 5 concurrent rendering jobs from React state creates:
1. Browser dependency on 5 persistent open connections.
2. Uncoordinated credit billing and absence of atomic rollback.
3. Inability to recover if the user closes the browser or tab.
4. Absence of worker-level concurrency limits (e.g., concurrency = 2) or bounded retries.

### Security / Reliability / Performance Impact
Fragile client-driven batch lifecycle, susceptible to network blips and incomplete bundle states.

### Original Audit Accuracy
Partially correct directionally, but overstated/simplistic in reasoning ("Promise.all automatically causes 429s"). Concurrency is supported by modern providers; the defect is lack of backend-governed job orchestration.

### Remediation Fix
Move bundle execution to backend orchestrator `POST /api/campaign/bundle/generate` using a backend worker queue with configurable concurrency (concurrency = 2), per-asset error tracking, and atomic settlement.

---

## Finding 04 — Engine Selection Mismatch & Provider Identifier Coupling

### Original Audit Claim
"The UI can expose an engine that the backend does not actually resolve to a corresponding provider adapter."

### Corrected Assessment
The frontend's engine identifier was not reliably mapped to the backend/provider model registry. The selected premium engine was silently overridden, and provider-specific model IDs were tightly coupled to the UI.

### Verdict
VERIFIED (FACTUALLY CORRECTED)

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`
- `apps/api/src/modules/campaigns/campaignRoutes.ts`
- `packages/types/imageGeneration.ts`

### Relevant Symbols
- `<select value={engine}>` (UI)
- `POST /render` (Backend)
- `resolveCanonicalEngine`

### Evidence
The UI exposed `openai-gpt-image-2` as the "Premium" engine. However, in `campaignRoutes.ts`, if the engine string was not `schnell`, `dev`, `pro`, `banana`, or `gemini`, it fell back to `fal-studio`.

### Important Provider Correction
The original audit claim stating that *"openai/gpt-image-2 is an invalid model identifier on Fal AI"* is **factually outdated**. Current Fal AI documentation confirms that GPT Image 2 is actively exposed on Fal via `openai/gpt-image-2` (text-to-image) and `openai/gpt-image-2/edit` (image reference editing with `image_urls`).
The true defect is **model routing and coupling**:
`UI identifier ("openai-gpt-image-2") ≠ backend route parser ≠ provider model registry ("fal-studio")`
The UI exposed raw provider names instead of canonical product tiers, and the backend silently overrode them.

### Security / Reliability / Performance Impact
Unpredictable model routing, silent fallback behavior, and broken contracts between UI options and backend execution.

### Original Audit Accuracy
The audit was factually wrong about GPT Image 2 being invalid on Fal, but correct that the engine selection pipeline suffered from severe identifier mismatch and silent overrides.

### Remediation Fix
Introduce a canonical internal engine registry:
- `fast`: `fal-ai/flux/schnell` (2 credits)
- `quality`: `fal-ai/flux/dev` (3 credits)
- `premium`: `openai/gpt-image-2` (4 credits, supports image reference editing)
Frontend selects canonical internal keys (`fast`, `quality`, `premium`). Backend owns provider mapping cleanly and handles backward compatibility.

---

## Finding 05 — ZIP Export Can Produce Incomplete Packages

### Original Audit Claim
"Remote image failures are swallowed during ZIP generation. Users can receive ZIP packages containing missing binaries and broken references."

### Verdict
VERIFIED

### Severity
LOW

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`

### Relevant Symbols
- `handleExportZipBundle`

### Evidence
The zip generation loop wraps `fetchImageAsBlob` in a `try/catch` block. If fetching the image blob fails, the `catch` block merely calls `console.warn` and writes a fallback URL to the markdown spec file. It does not abort the zip export or notify the user of the failure.

### Execution / Data Flow
User clicks Export → ZIP generation starts → Loops through asset URLs → Proxy fetch fails → `catch` swallows error → Resulting `.zip` file is downloaded missing the image binary.

### Verification Analysis
Proves the claim. The system allows exporting broken states without failing loudly.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Collect all download promises. If any fail, alert the user and allow them to retry or abort, rather than silently omitting files.
