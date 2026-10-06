# Master Tester: 06 — Test Matrix & Execution Evidence

| Test ID | Area | Layer | Priority | Test Case | Input / Precondition | Expected Behavior | Observed Behavior | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Campaigns | Unit | P0 | Object Normalization | `discoveryAnswers: { "q1": "ans1" }` | Converts to structured Array | Array of 1 item with questionId, questionText, answer | **PASS** ✅ |
| **TC-02** | Campaigns | Unit | P0 | Defensive Null / Empty | `null`, `undefined`, `{}` | Returns empty array `[]` without error | Empty array returned, 0 errors | **PASS** ✅ |
| **TC-03** | Campaigns | Integration | P0 | Route Generation (Reproduction) | Flipkart Brief + Object `discoveryAnswers` | Generates 3 Strategic Territories without throwing `map is not a function` | Generated 3 Routes (*The Receipts of Truth*, *The Shared Threshold*, *The Unboxers' Guild*) | **PASS** ✅ |
| **TC-04** | Campaigns | Integration | P0 | Master Strategy Synthesis | Object `discoveryAnswers` + Selected Route | Synthesizes strategy, passes Critic evaluation | Strategy compiled, Critic evaluation: Validated | **PASS** ✅ |
| **TC-05** | Campaigns | Contract | P1 | AdSpec v1 Compilation | Master Strategy + Selected Route | 3 Shots with Camera, Lighting, Visual Direction | Canonical AdSpec v1.0.0 compiled (3 Shots) | **PASS** ✅ |
| **TC-06** | Discovery | AI / LLM | P0 | Adversarial Audience Negation | Target Audience: "I don't know who our audience is yet" | Dimension status = `'missing'`, triggers probe questions | Status strictly `'missing'`, generated 3 questions | **PASS** ✅ |
| **TC-07** | Search | Tool | P1 | Live Google Search Grounding | Competitive research query | Tool call executed, citations returned | 45 Live citations extracted with Vertex AI redirect URLs | **PASS** ✅ |
| **TC-08** | Database | Persistence | P0 | Video Ad Project Repository | Canonical AdSpec v1 | Persisted to PostgreSQL `ad_projects` | Project created (`c60e95a7...`), 3 shots retrieved | **PASS** ✅ |
| **TC-09** | Video UI | Hydration | P0 | Director's Plan Ingestion | Staged canonical AdSpec in session/local storage | Rehydrates 3 shots with camera framing, angle, and lighting | Rehydrates 3 shots: Shot 1 push-in, Shot 2 tracking, Shot 3 hero CTA | **PASS** ✅ |
| **TC-10** | Build | Toolchain | P0 | ESBuild Production Compilation | `npm run build:api` | Bundles `api/index.js` cleanly | Built in 44ms, 0 errors | **PASS** ✅ |
