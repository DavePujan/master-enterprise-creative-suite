# AI Advertising Director: Reasoning Architecture & Orchestration Contracts

## Executive Summary

Writopedia is an **AI Advertising Director**, not an unconstrained video prompt generator. 

The canonical creative state of an advertisement is the **`AdSpec`** (Ad Specification v1). This document formalizes the **operation-based AI boundary** and reasoning orchestration model for Writopedia's Video Generation Gem:

```text
DirectorContext → Stage → StructuredOperation → Validator → StateManager → AdSpec Version
```

### Core Architectural Invariant
> **"LLMs propose; deterministic application code mutates state."**
> 
> Large Language Models and AI reasoning stages have **zero direct write access** to the canonical database or in-memory AdSpec. AI stages output strongly typed, discrete `DirectorOperation` proposals. All state mutations are validated, authorized, checked against user-confirmed decision locks, evaluated for change impact and continuity, and applied atomically by Writopedia's deterministic `DirectorStateManager`.

---

## 1. High-Level Reasoning & Execution Pipeline

The Advertising Director operates across two strictly decoupled lifecycles:

### A. The Creative Planning Lifecycle (Pure Domain / Reasoning)
```text
                         USER MESSAGE / INTERACTION
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ AI INTERVIEWER  │ (Discovers missing information)
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ BRIEF ANALYZER  │ (Normalizes & validates brief)
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌───────────────────┐
                            │ CREATIVE DIRECTOR │ (Generates 3 differentiated concepts)
                            └────────┬──────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ STORY ARCHITECT │ (Structures narrative beats)
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  SHOT DIRECTOR  │ (Creates discrete executable shots)
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌───────────────────┐
                            │    CONTINUITY     │ (Enforces character, product, location,
                            │    SUPERVISOR     │  camera, and state invariants)
                            └────────┬──────────┘
                                     │
                                     ▼
                          ┌───────────────────────┐
                          │  DirectorOperation[]  │ (Structured proposals)
                          └──────────┬────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         ┌───────────────────────┐         ┌───────────────────────┐
         │  OperationValidator   │         │    ApprovalPolicy     │
         │ • Schema validation   │         │ • AUTO_SAFE           │
         │ • Target existence    │         │ • USER_CONFIRM_REQ    │
         │ • Confirmed locks     │         │ • EXECUTION_CONFIRM   │
         └──────────┬────────────┘         └──────────┬────────────┘
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │ ChangeImpactService │ (Direct, Indirect, Unaffected)
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ DirectorStateManager │
                          │ • Atomic mutation    │
                          │ • specVersion + 1    │
                          │ • Structured Diff    │
                          │ • Diff Explanation  │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ AdSpec Version v(N)  │ (Persisted in Supabase)
                          └──────────────────────┘
```

### B. The Downstream Execution Lifecycle (Jobs & Workers)
```text
                          APPROVED ADSPEC v(N)
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   EXECUTION SNAPSHOT   │ (Frozen immutable document)
                        └────────────┬───────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │    PROMPT COMPILER     │ (Provider-neutral synthesis)
                        └────────────┬───────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │  EXISTING AI_JOBS DB   │ (public.ai_generation_jobs)
                        └────────────┬───────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │ EXISTING VIDEO WORKER  │ (Railway Node/CJS daemon)
                        └────────────┬───────────┘
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   VIDEO PROVIDER SDK   │ (Google Veo, Seedance, Omni)
                        └────────────┬───────────┘
                                     │
                                     ▼
                            GENERATED VIDEO ASSET
```

---

## 2. Scoped Director Context (`DirectorContext`)

Reasoning stages never receive an untyped database dump. Contexts are deliberately scoped per stage responsibility:
- **Interviewer Context**: Receives user inputs, brief state, known vs missing fields, and workspace asset summaries. Secrets, job internals, and provider payloads are strictly excluded.
- **Creative Director Context**: Receives the normalized brief, brand rules, available asset references, audience objective, platform, and constraints.
- **Story Architect Context**: Receives the approved concept, audience emotional goal, and duration constraints.
- **Shot Director Context**: Receives the selected concept, story beats, asset world (characters, products, locations), and camera constraints.
- **Continuity Supervisor Context**: Receives adjacent shot pairs, continuity links, and produced/inherited state declarations.
- **Revision Context**: Receives current AdSpec, targeted scope/entity, user revision instruction, and confirmed field locks.

---

## 3. Explicit Stage Contracts

### Stage A: AI Interviewer
- **Purpose**: Discovers missing information needed to create an effective advertisement (`required - known = missing`).
- **Provenance Classification**:
  - `USER_CONFIRMED`: Explicit user answer or confirmation (immutable to AI overwrite).
  - `AI_INFERRED`: Derived logically by AI from user context.
  - `AI_PROPOSED`: Proposed creative option awaiting acceptance.
  - `SYSTEM_DERIVED`: Derived from system defaults or platform specs.
- **Question Policy**: Selects the smallest useful next question prioritized by:
  1. Blocking commercial info (brand, product, core offer)
  2. High-impact commercial info (target audience, conversion goal)
  3. Concept-affecting preferences (tone, key message)
  4. Asset/reference needs (hero packshot, character photos)
  5. Lower-impact creative aesthetics
- **Asset Request Contract**: Emits `StructuredAssetNeed` (role, reason, required, qualityRequirement, preferredViews) integrated with Writopedia's existing `public.assets` library.

### Stage B: Brief Analyzer
- **Purpose**: Normalizes user input, verifies brief completeness, and detects contradictions (e.g. 6s total duration vs 8 requested shots).

### Stage C: Creative Director
- **Purpose**: Generates ~3 genuinely differentiated `CreativeConcept` items.
- **Differentiation Rule**: Concepts must differ in the underlying **creative mechanism** (e.g. kinetic momentum vs intimate sensory ritual vs relatable problem inversion), not merely superficial styling.
- **Quality Evaluation**: Evaluates originality, brand fit, audience fit, visual potential, narrative strength, feasibility, and model risk without fake precision.

### Stage D: Story Architect
- **Purpose**: Formulates narrative structure and temporal beats answering:
  - Why does the ad start here?
  - What creates curiosity?
  - Where is tension introduced?
  - Where does the product become essential?
  - What delivers the payoff?
  - How does the ending transition to the CTA?

### Stage E: Shot Director
- **Purpose**: Turns story beats into discrete, executable shots (`AdShot`).
- **Action Model**: Temporally structured action beats (`startingState`, `beat 1: 0.0-1.5s`, `beat 2: 1.5-3.0s`, `endingState`).
- **Camera Model**: Structured cinematographic parameters (`position`, `height`, `angle`, `shotSize`, `lensCharacteristics`, `cameraMovement`, `composition`, `depthIntent`). Generic labels like "cinematic" are forbidden.

### Stage F: Continuity Supervisor
- **Purpose**: Compares adjacent shots and sequence graphs against continuity rules:
  - **Character**: Appearance, hair, wardrobe, accessories.
  - **Product**: Geometry, packaging finish, label, orientation.
  - **Location**: Lighting intensity, time of day, atmosphere.
  - **Camera**: Spatial continuity, jump cut detection across hard cuts.
  - **State**: Shot N `endingState` vs Shot N+1 `startingState`.
- **Diagnostics**: Outputs `PASS`, `WARNING`, or `CONFLICT` with auto-repairability flags.

### Stage G: Revision Engine
- **Purpose**: Applies surgical, targeted modifications based on user feedback without full-document regeneration.
- **Targeted Operations**: Modifies specific properties (`camera.angle`, `action.action`) while keeping unassociated shots and entities completely untouched.

### Stage H: Prompt Compiler Boundary
- **Purpose**: Transforms approved shots into provider-specific requests (`CompiledGenerationRequest`).
- **Isolation**: Provider SDK objects, API tokens, and model prompts remain **strictly outside** the canonical `AdSpec`.

---

## 4. Operation Model (`DirectorOperation`)

Every mutation is represented as an atomic, strongly typed operation:
```typescript
interface DirectorOperation {
  operationId: string;
  type: DirectorOperationType;
  target: {
    scope: AdSpecPatchScope | 'root';
    entityId?: string;
    path?: string;
  };
  changes: Record<string, any>;
  reason: {
    type: DirectorReasonType;
    description?: string;
  };
  actor: {
    id: string;
    role: DirectorActorRole;
  };
  confidence?: number;
  approvalRequirement?: ApprovalLevel;
  parentSpecVersion: number;
}
```

### Deterministic Approval Policy
- **`AUTO_SAFE`**: Small AI inferences in draft state, cosmetic tweaks.
- **`USER_CONFIRMATION_REQUIRED`**: Modifying user-confirmed fields (`confirmed: true`, `source: 'user'`), altering product geometry/branding, removing characters, changing creative direction.
- **`EXECUTION_CONFIRMATION_REQUIRED`**: Modifying generation parameters or credit expenditure on an already approved plan.
- **`REJECTED_UNAUTHORIZED`**: Direct AI mutations on approved AdSpecs or operations lacking required authorization.

---

## 5. Change Impact Analysis

Before applying any change, the `analyzeChangeImpact` service computes:
1. **Directly Affected**: The target field or entity.
2. **Indirectly Affected**: Dependent shots, lighting parameters, ambient audio, and continuity links.
3. **Unaffected**: Verified invariant components (e.g. brand rules, product specifications, unrelated shots).

---

## 6. Deterministic State Manager & Diff Representation

The `DirectorStateManager`:
1. Validates the operation against schema and active version bounds.
2. Applies the operation atomically to a deep clone of the AdSpec.
3. Validates the resulting AdSpec structure against all domain invariants.
4. Executes the Continuity Supervisor.
5. Immutably increments `specVersion` and sets `parentVersionId`.
6. Computes structured `AdSpecDiff` (modified paths, previous values, new values, affected shots/entities).
7. Synthesizes a human-readable revision explanation strictly from the diff.
8. **Guarantees Zero Partial Mutation**: If any validation check fails, the active AdSpec remains 100% untouched.

---

## 7. Cost & Credit Safety Invariants

- Creative planning, AI interviewing, concept exploration, storyboard formulation, and revisions consume **zero video generation credits**.
- Video generation credits are consumed solely through Writopedia's existing atomic credit locking system when an approved plan execution is submitted to `public.ai_generation_jobs`.
