# Master Tester: 00 — Test Request Normalization

## Request Details
- **Trigger**: User command `@[docs] /master-tester /security-automation /agent-platform Test the campaign completely`
- **Context**: The user attached a live workspace screenshot showing a runtime exception in Stage 2 (Adaptive Discovery):
  ```
  discoveryAnswers.map is not a function
  ```
  Along with an unformatted readout on the Strategist's Whiteboard:
  ```
  READINESS AUDIT: 88% ([object Object])
  ```
- **Target Subsystem**: Campaign Strategy Gem (`CampaignStrategistWorkspace`, `campaignDiscoveryEngine`, `campaignTerritoryEngine`, `campaignStrategyCompiler`, `campaignDownstreamOrchestrator`, `videoAdProjectRepository`, `DirectorsPlanWorkspace`).
- **Scope**:
  1. Root-cause investigation and reproduction of the `discoveryAnswers.map is not a function` exception.
  2. Investigation and resolution of the `88% ([object Object])` Whiteboard readout defect.
  3. Investigation of the Selected Route name resolution (`t.name` vs `t.title`).
  4. End-to-end multi-stage campaign execution test (Brief -> Discovery -> Territories -> Strategy -> Activation -> Downstream Gems).
  5. Negative, boundary, and defensive type-handling verification.
  6. Integration testing with live Google AI model fallbacks (`gemini-3.8-flash` -> `gemini-3.7-flash` -> `gemini-3.5-flash` -> `gemini-3.5-flash-lite` -> `gemini-2.5-flash`).
  7. Production build and bundle integrity (`npm run build:api`).

## Expected Behavior
1. When a user clicks "GENERATE STRATEGIC ROUTES", the system must tolerate any format of `discoveryAnswers` (object dictionary, structured array, null, undefined) without throwing an uncaught TypeError.
2. The Strategist's Whiteboard must render formatted strings (e.g., `88% (READY FOR ROUTES)` or `88% (STRONG)`) instead of JavaScript object representations (`[object Object]`).
3. Selected Route must display the actual route title (`Bharat Ka Tyohaar` / `The Receipts of Truth`) instead of falling back to `"Pending selection"`.
4. Downstream AdSpec v1.0.0 compilation must produce valid 3-shot storyboard specs with complete camera framing, movement, lighting, and action integrity.
