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

## Finding 03 — Parallel Rendering Creates Provider Risk

### Original Audit Claim
"Five image-generation requests are launched concurrently."

### Verdict
VERIFIED

### Severity
MEDIUM

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`

### Relevant Symbols
- `handleGenerateCampaign`
- `Promise.all(renderPromises)`

### Evidence
The application maps over the 5 roles, immediately triggering `apiClient.post` for each without any delay, and uses `Promise.all(renderPromises)` to await them.

### Execution / Data Flow
5 simultaneous outbound requests to the backend image rendering pipeline.

### Verification Analysis
Proves the claim. Depending on the backend provider (e.g., fal.ai or OpenAI), this can easily trigger rate limits (`429`).

### Security / Reliability / Performance Impact
High risk of intermittent failures due to provider throttling.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Throttle the render loop (e.g., using a concurrency limit of 2) or use a backend queue.

---

## Finding 04 — Engine Selection Mismatch

### Original Audit Claim
"The UI can expose an engine that the backend does not actually resolve to a corresponding provider adapter."

### Verdict
VERIFIED

### Severity
LOW

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignDeckWorkspace.tsx`
- `apps/api/src/modules/campaigns/campaignRoutes.ts`
- `apps/api/src/infrastructure/fal/falClient.ts`

### Relevant Symbols
- `<select value={engine}>` (UI)
- `POST /render` (Backend)

### Evidence
The UI exposes `openai-gpt-image-2` as the "Premium" engine. However, in `campaignRoutes.ts`, if the engine string is not `schnell`, `dev`, `pro`, `banana`, or `gemini`, it falls back to `fal-studio`. Even if it reached `falClient.ts`, it routes `openai-gpt-image-2` to `https://queue.fal.run/openai/gpt-image-2` which is an invalid model identifier on Fal AI.

### Execution / Data Flow
User selects "Premium" → `engine="openai-gpt-image-2"` sent → backend sets `modelKey="fal-studio"` (silently overriding) OR routes to an invalid fal.run URL.

### Verification Analysis
Proves the claim. The engine identifiers are completely desynced between frontend expectations and backend support.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Align frontend model dropdown options with actual supported backend models.

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
