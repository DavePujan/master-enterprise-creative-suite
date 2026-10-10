# Standard Brand Image Gem

## Audit Scope
Inspected the Standard Brand Image Gem configuration, the `generateImage` service in `geminiService.ts`, model capabilities in `modelRegistry.ts`, and the interactive canvas tools in `useCanvasEditor.ts` and `CreativeOutputCanvas.tsx`.

## Executive Summary
The audit confirmed all four findings. The frontend directly injects hexadecimal color codes into the prompt string without semantic translation. The platform silently degrades reference image requests to text-to-image without warning the user. The interactive logo and text layering features are only persisted upon clicking "Download," leaving the system's internal state pointing to the un-composited background. Finally, the UI completely lacks support for visual seed locking, causing stylistic drift.

## Verification Summary

| ID | Finding | Verdict | Severity | Confidence |
|---|---|---|---|---|
| 01 | Brand Hex Colors Are Passed Directly Into Prompts | VERIFIED | LOW | HIGH |
| 02 | Reference Images Can Be Silently Ignored | VERIFIED | MEDIUM | HIGH |
| 03 | Canvas Layers Are Not Reliably Persisted | VERIFIED | HIGH | HIGH |
| 04 | No Cross-Generation Style Lock | VERIFIED | LOW | HIGH |

## Finding 01 — Brand Hex Colors Are Passed Directly Into Prompts

### Original Audit Claim
"Brand palettes are inserted using raw hexadecimal values. Image models may not reliably interpret raw hex strings as intended visual directions."

### Verdict
VERIFIED

### Severity
LOW

### Confidence
HIGH

### Affected Files
- `apps/web/src/infrastructure/ai/geminiService.ts`

### Relevant Symbols
- `generateImage`

### Evidence
Line 772 of `geminiService.ts` directly interpolates the brand colors array into the LLM system prompt: `- Primary Colors: ${guidelines.colors.join(', ')}`.
If a user specifies `["#F43F5E", "#10B981"]`, the prompt literally instructs the vision model to use "#F43F5E" which is poorly understood by many image-generation models compared to descriptive color terminology ("Vibrant Rose Red", "Emerald Green").

### Verification Analysis
Proves the claim. The frontend provides no translation layer.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Implement a simple color translation utility that maps hex codes to semantic English descriptions before injecting them into the prompt.

---

## Finding 02 — Reference Images Can Be Silently Ignored

### Original Audit Claim
"If the selected engine does not support image conditioning, the reference can be disabled without clear user feedback."

### Verdict
VERIFIED

### Severity
MEDIUM

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/creative/hooks/useCreativeExecution.ts`
- `apps/web/src/infrastructure/ai/modelRegistry.ts`

### Relevant Symbols
- `executeGenerate` -> `creationMode` resolution

### Evidence
When generating creative assets (especially video generation derived from image components), the system checks `vCaps.supportsReferences` and `vCaps.supportsFirstFrame`. If the model capabilities in `modelRegistry.ts` mark these as `false`, the execution silently falls back to standard text generation (`text_to_video` or dropping image assets) without warning the user that their meticulously uploaded reference contexts are being ignored.

### Verification Analysis
Proves the claim. The degradation is completely silent.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Display a warning toast or disable the generate button when the user supplies a reference context but selects a model that does not support it.

---

## Finding 03 — Canvas Layers Are Not Reliably Persisted

### Original Audit Claim
"Logo and typography layers added to the canvas can be baked only during local download while the stored asset remains the original background... Persist the composited result back to asset storage when the user finalizes edits."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/canvas/hooks/useCanvasEditor.ts`
- `apps/web/src/features/creative/components/CreativeWorkspace.tsx`

### Relevant Symbols
- `handleDownloadInteractiveImage`

### Evidence
When a user does not use the "Bake Logo on Generation" feature, they enter the Interactive Layout Studio. Here, they can drag logos and text overlays onto the canvas. When they click download, `handleDownloadInteractiveImage` utilizes an HTML5 Canvas to composite the layers, generating a `data:image/png;base64` string. It triggers a browser download and calls `saveAsset`. However, it does NOT call `setResult` or update the active `result.data` state inside `useCreativeExecution.ts`. 

If the user attempts to send this image to the next pipeline stage (e.g., Image-to-Video generation), the system passes the original, unmodified background image url instead of the composited canvas.

### Verification Analysis
Proves the claim. The layers exist only in CSS/DOM and are not passed back into the application's central data model.

### Security / Reliability / Performance Impact
Breaks workflow continuity.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Upon clicking a "Commit Edits" button, composite the canvas, upload it to cloud storage (or convert to base64 if short-lived), and explicitly call `setResult({ type: 'image', data: compositedUrl })`.

---

## Finding 04 — No Cross-Generation Style Lock

### Original Audit Claim
"Consecutive images can use different seeds and produce visual drift. Provide an optional visual seed/style lock for campaign continuity."

### Verdict
VERIFIED

### Severity
LOW

### Confidence
HIGH

### Affected Files
- `apps/web/src/infrastructure/ai/geminiService.ts`
- `apps/web/src/features/creative/components/CreativeWorkspace.tsx`

### Relevant Symbols
- `generateImage`

### Evidence
Neither `generateImage` nor the `apiClient.post("/api/campaign/render")` endpoint accept or pass a `seed` parameter. The frontend UI provides no mechanism to lock a visual seed across multiple asset generations, meaning generating five images in a row will result in five radically different compositions and visual structures despite using the same Brand Guidelines.

### Verification Analysis
Proves the claim. 

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Add a `seed` parameter to the `generateImage` function and allow the user to toggle a "Lock Style Seed" button in the Layout Studio.
