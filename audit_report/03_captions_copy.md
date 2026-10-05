# Captions & Copy Gem

## Audit Scope
Inspected the Captions & Copy Gem generation flow spanning the frontend (`useCreativeExecution.ts`, `CreativeOutputCanvas.tsx`, `geminiService.ts`) and backend (`textAutoWriteService.ts`, `textRoutes.ts`).

## Executive Summary
The audit confirmed all five findings. Despite the existence of a high-quality, structured backend service (`/api/text/autowrite`), the frontend bypasses it and routes caption generation through the generic, unstructured `/api/text/generate` route. This leads to markdown formatting issues, text-to-speech reading metadata out loud, and lacking platform-specific character optimizations.

## Verification Summary

| ID | Finding | Verdict | Severity | Confidence |
|---|---|---|---|---|
| 01 | Unstructured Markdown Output | VERIFIED | HIGH | HIGH |
| 02 | Structured Auto-Write Service Is Bypassed | VERIFIED | HIGH | HIGH |
| 03 | Hashtag Markdown Collision | VERIFIED | MEDIUM | HIGH |
| 04 | TTS Reads Markdown Metadata | VERIFIED | MEDIUM | HIGH |
| 05 | Missing Platform Metrics | VERIFIED | LOW | HIGH |

## Finding 01 — Unstructured Markdown Output

### Original Audit Claim
"The platform returns a complete multi-platform caption pack as one Markdown block... Users must manually extract individual captions, hooks, CTAs, and hashtags."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/infrastructure/ai/modelRegistry.ts`
- `apps/web/src/features/creative/hooks/useCreativeExecution.ts`

### Relevant Symbols
- `strategy-captions` (system instruction in `modelRegistry.ts`)
- `/api/text/generate` response payload

### Evidence
The system instruction for the `strategy-captions` gem instructs the model to return a single formatted Markdown document rather than a JSON structure. The frontend handles this response by simply rendering it as one large block in `<ReactMarkdown>`.

### Verification Analysis
Proves the claim. The frontend treats the result as unstructured markdown text.

### Security / Reliability / Performance Impact
Severely limits UX by forcing the user to copy-paste from a monolith instead of interacting with distinct platform blocks.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Consume the structured JSON response from the auto-write service and build distinct UI cards for each platform caption.

---

## Finding 02 — Structured Auto-Write Service Is Bypassed

### Original Audit Claim
"A structured backend service already exposes platform fields, hooks, hashtags, and CTAs, but the frontend uses the generic text-generation route."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/infrastructure/ai/geminiService.ts`
- `apps/api/src/modules/textGeneration/textAutoWriteService.ts`
- `apps/api/src/modules/textGeneration/textRoutes.ts`

### Relevant Symbols
- `generateCreative()` inside `geminiService.ts`

### Evidence
`geminiService.ts` line 313: `const res = await apiClient.post('/api/text/generate', textReq);`. 
However, the backend codebase contains `textAutoWriteService.ts` which exposes `POST /api/text/autowrite` returning a strongly typed JSON schema specifically designed for this use case (`TextAutoWriteResponse`). The frontend completely ignores this route.

### Execution / Data Flow
User clicks generate captions → `useCreativeExecution` calls `generateCreative` → posts to the generic `/api/text/generate` endpoint → receives raw text.

### Verification Analysis
Proves the claim. The structured architecture exists but is orphaned.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Refactor the `strategy-captions` gem handling in `useCreativeExecution.ts` to call `/api/text/autowrite` instead of `/api/text/generate`.

---

## Finding 03 — Hashtag Markdown Collision

### Original Audit Claim
"Lines beginning with `#Hashtag` can be interpreted as Markdown headings... Hashtags render as large H1 elements rather than social tags."

### Verdict
VERIFIED

### Severity
MEDIUM

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/creative/components/CreativeOutputCanvas.tsx`

### Relevant Symbols
- `<ReactMarkdown>{cleanTextContent(result.data)}</ReactMarkdown>`

### Evidence
Because the output is an unstructured Markdown block parsed by `ReactMarkdown`, lines that begin with `#` (a common pattern for hashtags if spaced improperly or handled by lenient parsers) will render as large header text instead of stylized social media tags. `cleanTextContent` only strips SVG blocks.

### Verification Analysis
Proves the claim. Relying on raw markdown parsing for social media captions creates formatting collisions.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Migrating to the structured Auto-Write service natively resolves this by keeping hashtags in a separate JSON array.

---

## Finding 04 — TTS Reads Markdown Metadata

### Original Audit Claim
"Raw Markdown is passed into speech synthesis. The speech engine can literally pronounce heading and hashtag metadata."

### Verdict
VERIFIED

### Severity
MEDIUM

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/creative/components/CreativeOutputCanvas.tsx`

### Relevant Symbols
- `handleTTS(cleanTextContent(result.data), true)`

### Evidence
When the user clicks the Voice Synthesis button, the canvas passes the raw `result.data` text directly to the TTS engine. `cleanTextContent` only removes `<svg>` blocks, failing to strip `##`, `**`, `*`, or `#` markdown characters. 

### Execution / Data Flow
Markdown text → `cleanTextContent` → TTS engine → Engine audibly reads "Hashtag" or "Asterisk Asterisk".

### Verification Analysis
Proves the claim. The TTS engine will literally narrate the markdown syntax.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Implement a regex parser to strip Markdown characters before passing text to the TTS engine, or pull the clean text from the structured Auto-Write service.

---

## Finding 05 — Missing Platform Metrics

### Original Audit Claim
"The prompt dictates platform optimization but doesn’t output precise character counts."

### Verdict
VERIFIED

### Severity
LOW

### Confidence
HIGH

### Affected Files
- `apps/web/src/infrastructure/ai/modelRegistry.ts`

### Relevant Symbols
- `strategy-captions` system instruction

### Evidence
The prompt demands "platform-ready social captions" but contains zero instructions regarding character counts or platform constraints (e.g., 280 limits for X).

### Verification Analysis
Proves the claim.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Incorporate character count instructions into the prompt or natively enforce character validation via the structured API.
