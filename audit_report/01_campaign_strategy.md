# Campaign Strategy Gem

## Audit Scope
Inspected the frontend workspace `CampaignStrategistWorkspace.tsx`, the backend LLM gateway `campaignLLMGateway.ts`, the discovery engine `campaignDiscoveryEngine.ts`, and shared types `campaignStrategy.ts`.

## Executive Summary
The audit confirmed the presence of invalid model identifiers, heuristic-based discovery evaluation, raw text handoff to downstream video gems, and a massive frontend monolithic component. The claim regarding the `web_search` competitor source could not be verified in the current codebase and appears to have been removed or misunderstood.

## Verification Summary

| ID | Finding | Verdict | Severity | Confidence |
|---|---|---|---|---|
| 01 | Invalid Google Model Names | VERIFIED | HIGH | HIGH |
| 02 | Frontend Monolith | VERIFIED | HIGH | HIGH |
| 03 | Video Handoff Uses Raw Brief Text | VERIFIED | MEDIUM | HIGH |
| 04 | Competitor Research Is Not Truly Live | ALREADY FIXED | MEDIUM | HIGH |
| 05 | Heuristic Audience Classification | VERIFIED | LOW | HIGH |

## Finding 01 — Invalid Google Model Names

### Original Audit Claim
"The campaign LLM gateway attempts unavailable Gemini model names before reaching a valid fallback."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/api/src/modules/campaigns/campaignLLMGateway.ts`

### Relevant Symbols
- `CampaignLLMGateway`
- `GOOGLE_MODELS`

### Evidence
The `CampaignLLMGateway` class defines `GOOGLE_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash']`. Since versions 3.8 and 3.7 do not exist, the gateway systematically attempts to call these models, receives failures, logs warnings, and finally falls back to 2.5-flash.

### Execution / Data Flow
API Request → `CampaignLLMGateway.executeStructured()` → attempts `gemini-3.8-flash` (fails) → attempts `gemini-3.7-flash` (fails) → attempts `gemini-2.5-flash` (succeeds or fails over to Fal).

### Verification Analysis
This proves the original claim. The fallback chain is intentionally misconfigured with futuristic model names, resulting in guaranteed initial request failures.

### Security / Reliability / Performance Impact
Adds unnecessary latency and error logging to every strategy generation step.

### Conditions Required to Trigger
Always occurs when a strategy generation step is requested via the gateway.

### Existing Mitigations
The system ultimately falls back to `gemini-2.5-flash` or Fal AI, so generation still succeeds eventually.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Update `GOOGLE_MODELS` array to use only verified production model identifiers (e.g., `gemini-2.5-flash` as primary).

### Testing Recommendation
Mock the Gemini client and verify the gateway only attempts valid model strings.

### Evidence References
`apps/api/src/modules/campaigns/campaignLLMGateway.ts` lines 35-39.

---

## Finding 02 — Frontend Monolith

### Original Audit Claim
"`CampaignStrategistWorkspace.tsx` combines: Strategy wizard, Interactive canvas, Strategist chat, Production planning, Export logic."

### Verdict
VERIFIED

### Severity
HIGH

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx`

### Relevant Symbols
- `CampaignStrategistWorkspace`

### Evidence
The `CampaignStrategistWorkspace.tsx` file is over 5,000 lines long and handles the entire state machine for a 5-stage strategic journey, including brief controls, discovery questions, territory generation, strategy synthesis, downstream handoffs, and UI rendering for all these phases.

### Execution / Data Flow
React render → Single component manages complex state (e.g., `journeyStep`, `discoveryAnswers`, `masterStrategy`, `downstreamBriefs`) and contains multiple large rendering blocks (Accordions, Modals, Forms).

### Verification Analysis
Proves the claim. The component is severely bloated and handles too many distinct responsibilities.

### Security / Reliability / Performance Impact
Causes significant maintainability and performance issues due to re-renders.

### Conditions Required to Trigger
Opening the Campaign Strategy UI.

### Existing Mitigations
None.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Extract the 5 stages into individual components and move state management to a context provider or Redux slice.

### Testing Recommendation
Component unit tests for isolated stages once decoupled.

### Evidence References
`apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx` lines 273-396 (State setup).

---

## Finding 03 — Video Handoff Uses Raw Brief Text

### Original Audit Claim
"Launching the video gem from a completed campaign strategy passes a text prompt instead of initializing the downstream video project from a structured campaign specification."

### Verdict
VERIFIED

### Severity
MEDIUM

### Confidence
HIGH

### Affected Files
- `apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx`

### Relevant Symbols
- `handleLaunchGem`

### Evidence
When `handleLaunchGem` is called with `cinematic-video`, the code does this:
`if (setPrompt) setPrompt(downstreamBriefs.videoBrief.textlessPrompt);`
It only passes a single text string (`textlessPrompt`) and `aspectRatio` rather than handing over a complete `AdSpec` or structured object.

### Execution / Data Flow
User clicks "Use in Video" → `handleLaunchGem('cinematic-video')` → sets global `prompt` string state → navigates to video gem.

### Verification Analysis
Proves the original claim. Structured `downstreamBriefs.videoBrief` is available but stripped down to raw text.

### Security / Reliability / Performance Impact
Context loss across gems.

### Conditions Required to Trigger
Exporting a campaign to the video gem.

### Existing Mitigations
The text prompt contains some synthesized details, but lacks structure.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Pass the full `videoBrief` object into the video gem context or initialize an `AdSpec` directly.

### Testing Recommendation
Integration test verifying `AdSpec` initialization upon gem handoff.

### Evidence References
`apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx` lines 485-505.

---

## Finding 04 — Competitor Research Is Not Truly Live

### Original Audit Claim
"The UI exposes a `web_search` competitor source, but synthesis does not consistently enable Google Search grounding."

### Verdict
ALREADY FIXED

### Severity
MEDIUM

### Confidence
HIGH

### Affected Files
- `packages/types/campaignStrategy.ts`
- `apps/web/src/features/campaigns/components/CampaignStrategistWorkspace.tsx`

### Relevant Symbols
- `CompetitorKnowledgeSource`

### Evidence
The `CompetitorKnowledgeSource` type defines only three options: `provided_by_client`, `imported_from_workspace`, and `no_research_supplied`. There is no `web_search` option present in the codebase.

### Execution / Data Flow
N/A

### Verification Analysis
Disproves the claim for the current state of the repository. The option appears to have been removed entirely, mitigating the issue.

### Security / Reliability / Performance Impact
None (fixed).

### Conditions Required to Trigger
N/A

### Existing Mitigations
The feature was removed.

### Original Audit Accuracy
Outdated or incorrectly observed.

### Recommended Future Fix
No action needed unless live search grounding is intended to be reintroduced.

### Testing Recommendation
N/A

### Evidence References
`packages/types/campaignStrategy.ts` line 169.

---

## Finding 05 — Heuristic Audience Classification

### Original Audit Claim
"Audience readiness currently relies on substring checks such as `audience`, `customer`, `problem`, and `barrier`."

### Verdict
VERIFIED

### Severity
LOW

### Confidence
HIGH

### Affected Files
- `apps/api/src/modules/campaigns/campaignDiscoveryEngine.ts`

### Relevant Symbols
- `CampaignDiscoveryEngine.evaluateAndGenerateQuestions`

### Evidence
The `evaluateAndGenerateQuestions` method uses naive substring checks to determine if a dimension is answered:
`if (lower.includes('audience') || lower.includes('customer') || lower.includes('who')) answeredDimensions.add('audience');`

### Execution / Data Flow
API Request → `evaluateAndGenerateQuestions` → Iterates `priorAnswers` → performs `.includes()` on concatenated text → adds dimension to `answeredDimensions`.

### Verification Analysis
Proves the claim. The engine does not semantically validate whether the question actually resolved the dimension; it only checks if certain keywords are present in the text.

### Security / Reliability / Performance Impact
Can cause the discovery engine to prematurely stop asking questions if the user enters a garbage response containing the keyword.

### Conditions Required to Trigger
Submitting any answer to the discovery engine.

### Existing Mitigations
The LLM gateway parses final strategies, which might still detect missing info.

### Original Audit Accuracy
Correct.

### Recommended Future Fix
Use an LLM classification call to determine which strategic dimensions have been successfully resolved by the user's answers.

### Testing Recommendation
Unit tests feeding adversarial answers to ensure dimensions are not marked resolved incorrectly.

### Evidence References
`apps/api/src/modules/campaigns/campaignDiscoveryEngine.ts` lines 66-76.
