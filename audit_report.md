# Writopedia Engineering Architecture & Technical Audit Report

> **Report Type:** Engineering architecture, implementation, and integration audit
> **Report Date:** 2026-09-21
> **Scope:** Creative generation, campaign systems, media engines, identity, billing, presentations, assets, administration, and related infrastructure

## Table of Contents

1. [Campaign Strategy Gem](#1-campaign-strategy-gem)
2. [Ecommerce Bundle Gem](#2-ecommerce-bundle-gem)
3. [Captions & Copy Gem](#3-captions--copy-gem)
4. [Standard Brand Image Gem](#4-standard-brand-image-gem)
5. [Cinematic & Social Video Subsystem](#5-cinematic--social-video-subsystem)
6. [Voiceover & Audio Studio](#6-voiceover--audio-studio)
7. [Corporate Presentations & Slideshow Engine](#7-corporate-presentations--slideshow-engine)
8. [Storyline Generator](#8-storyline-generator)
9. [Auth & Identity Service](#9-auth--identity-service)
10. [Landing & Public Marketing Portal](#10-landing--public-marketing-portal)
11. [Billing & Payment Engine](#11-billing--payment-engine)
12. [Brand Intelligence Engine](#12-brand-intelligence-engine)
13. [Generation History & Asset Library](#13-generation-history--asset-library)
14. [Settings & Workspace Administration](#14-settings--workspace-administration)
15. [Human-Touch Curation Service](#15-human-touch-curation-service)
16. [Video Generation Engines](#16-video-generation-engines)
17. [Image Generation Engines](#17-image-generation-engines)
18. [Text & Strategy Engines](#18-text--strategy-engines)
19. [Audio & Speech Engines](#19-audio--speech-engines)

---

# Executive Overview

The audit identifies recurring architectural themes across the platform:

* **Model and provider correctness:** Several integrations reference unavailable, outdated, or incorrectly named AI models and provider endpoints.
* **State and persistence consistency:** Important data is sometimes held only in frontend state or local storage and is not reliably persisted to the canonical backend representation.
* **Credit and billing safety:** Several generation flows need stronger atomic reservation, capture, rollback, and entitlement enforcement.
* **Serverless limitations:** Video assembly, large media transfers, and background work need to remain outside short-lived HTTP/serverless execution paths.
* **Cross-gem workflow integration:** Multiple systems generate useful outputs but do not reliably hand structured assets or metadata into downstream gems.
* **Security and authorization:** Workspace membership, RBAC, API keys, and sensitive administration endpoints require stronger server-side enforcement.
* **Asset lifecycle management:** History, storage, signed URLs, media export, and asset reuse are not consistently connected.
* **UX consistency:** Several UI flows expose controls that do not correspond to the backend behavior or current generation mode.

---

# 1. Campaign Strategy Gem

This section covers strategy planning, audience research, positioning, campaign planning, downstream handoff, and frontend architecture.

## Executive Summary

| Domain                | Finding                                                                     | Severity |
| --------------------- | --------------------------------------------------------------------------- | -------- |
| Backend LLM Gateway   | Invalid Google model names create repeated failed requests before fallback. | High     |
| Frontend Architecture | `CampaignStrategistWorkspace.tsx` is a large monolithic component.          | High     |
| Campaign Handoff      | Downstream video handoff uses raw text instead of structured `AdSpec` data. | Medium   |
| Competitor Research   | Live-search controls are disconnected from actual search grounding.         | Medium   |
| Audience Research     | Keyword heuristics can incorrectly mark dimensions as completed.            | Low      |

## Key Findings

### 1. Invalid Google Model Names

The campaign LLM gateway attempts unavailable Gemini model names before reaching a valid fallback.

**Impact**

* Repeated `404 / NotFoundError` responses.
* Additional latency on discovery, territory generation, synthesis, and stress-testing requests.
* Noisy backend logs.

**Recommendation**

Use only verified production model identifiers and keep the fallback chain aligned with the actual provider SDK.

### 2. Heuristic Audience Classification

Audience readiness currently relies on substring checks such as `audience`, `customer`, `problem`, and `barrier`.

**Risk**

A response such as “I don't know who the audience is” can still be classified as an answered dimension.

**Recommendation**

Use structured LLM-generated dimension-resolution flags or combine keyword detection with substantive-content validation.

### 3. Competitor Research Is Not Truly Live

The UI exposes a `web_search` competitor source, but synthesis does not consistently enable Google Search grounding.

**Impact**

Positioning can be generated from static model knowledge instead of current competitor information.

**Recommendation**

Enable search grounding whenever the selected competitor source is `web_search`.

### 4. Video Handoff Uses Raw Brief Text

Launching the video gem from a completed campaign strategy passes a text prompt instead of initializing the downstream video project from a structured campaign specification.

**Impact**

The video workspace can fall back to its default director-plan fixture rather than using the campaign strategy's actual multi-shot structure.

**Recommendation**

Convert the strategy output into a structured `AdSpec` or explicitly initialize the video workspace in single-shot mode.

### 5. Frontend Monolith

`CampaignStrategistWorkspace.tsx` combines:

* Strategy wizard
* Interactive canvas
* Strategist chat
* Production planning
* Export logic

**Recommendation**

Split the component into dedicated strategy-wizard, canvas-editor, strategist-chat, and production-planner modules.

---

# 2. Ecommerce Bundle Gem

The ecommerce bundle flow covers product launches, advertising creatives, social assets, campaign packages, and asset export.

## Key Findings

### 1. Uploaded Product References Are Lost During Rendering

The planning flow knows that product and face references exist, but the actual reference image data is not consistently passed to the rendering request.

**Impact**

Generated outputs may depict generic or hallucinated products rather than the customer's actual packaging, shape, or appearance.

**Recommendation**

Pass valid `referenceImages` through the complete render pipeline, including re-render operations.

### 2. Credit Deductions Are Not Atomic

The bundle is conceptually priced as a package, but individual image-generation calls can deduct credits independently.

**Failure Scenario**

A partial bundle can consume credits while later assets fail because the user no longer has sufficient balance.

**Recommendation**

Reserve the full bundle amount up front, capture only after successful completion, and release unused credits when the operation fails.

### 3. Parallel Rendering Creates Provider Risk

Five image-generation requests are launched concurrently.

**Risks**

* Provider `429` responses
* Database contention
* Partial bundle completion

**Recommendation**

Use a throttled render queue with bounded concurrency and retry/backoff behavior.

### 4. Engine Selection Mismatch

The UI can expose an engine that the backend does not actually resolve to a corresponding provider adapter.

**Impact**

A selected model can silently fall back to a different engine.

**Recommendation**

Make frontend model choices match the real backend registry and supported provider adapters.

### 5. ZIP Export Can Produce Incomplete Packages

Remote image failures are swallowed during ZIP generation.

**Impact**

Users can receive ZIP packages containing missing binaries and broken references.

**Recommendation**

Validate every asset before producing the final archive and provide a retry/error state when any download fails.

---

# 3. Captions & Copy Gem

## Executive Summary

The primary issues are output structure, auto-write service utilization, Markdown parsing, TTS cleanup, and platform-specific copy validation.

## Key Findings

### 1. Unstructured Markdown Output

The platform returns a complete multi-platform caption pack as one Markdown block.

**Impact**

Users must manually extract individual captions, hooks, CTAs, and hashtags.

**Recommendation**

Render structured platform cards with dedicated copy actions.

### 2. Structured Auto-Write Service Is Bypassed

A structured backend service already exposes platform fields, hooks, hashtags, and CTAs, but the frontend uses the generic text-generation route.

**Recommendation**

Route the captions gem through the structured auto-write service.

### 3. Hashtag Markdown Collision

Lines beginning with `#Hashtag` can be interpreted as Markdown headings.

**Impact**

Hashtags render as large H1 elements rather than social tags.

**Recommendation**

Escape or normalize hashtag lines before Markdown rendering.

### 4. TTS Reads Markdown Metadata

Raw Markdown is passed into speech synthesis.

**Impact**

The speech engine can literally pronounce heading and hashtag metadata.

**Recommendation**

Strip Markdown, URLs, formatting symbols, and trailing hashtag blocks before TTS generation.

### 5. Missing Platform Metrics

The interface lacks platform-specific character validation.

**Recommendation**

Display character counts and compatibility indicators for Instagram, X, LinkedIn, and other supported destinations.

---

# 4. Standard Brand Image Gem

## Key Findings

### 1. Brand Hex Colors Are Passed Directly Into Prompts

Brand palettes are inserted using raw hexadecimal values.

**Risk**

Image models may not reliably interpret raw hex strings as intended visual directions.

**Recommendation**

Convert palette values into descriptive color language and explicit grading instructions.

### 2. Reference Images Can Be Silently Ignored

If the selected engine does not support image conditioning, the reference can be disabled without clear user feedback.

**Recommendation**

Display an explicit warning when the selected model cannot preserve a supplied product or face reference.

### 3. Canvas Layers Are Not Reliably Persisted

Logo and typography layers added to the canvas can be baked only during local download while the stored asset remains the original background.

**Recommendation**

Persist the composited result back to asset storage when the user finalizes edits.

### 4. No Cross-Generation Style Lock

Consecutive images can use different seeds and produce visual drift.

**Recommendation**

Provide an optional visual seed/style lock for campaign continuity.

---

# 5. Cinematic & Social Video Subsystem

## Key Findings

### 1. Unseeded Director's Plan Fixture

The UI references a hardcoded commercial project identifier that is not guaranteed to exist in the database.

**Impact**

Revision, confirmation, and generation actions can fail with `400 Not Found`.

**Recommendation**

Create the actual project before mutation actions and replace the fixture identifier with a real project ID.

### 2. FFmpeg Assembly Must Not Run in Serverless HTTP

Multi-shot assembly downloads multiple video files, merges audio, applies transitions, and re-encodes the final result.

**Risk**

The workload can exceed serverless execution and memory limits.

**Recommendation**

Queue the assembly job to the dedicated background worker and return an asynchronous job identifier from the API.

### 3. Director Mode and Single-Shot Controls Conflict

The UI can show a director storyboard while the main command bar still performs single-shot generation.

**Recommendation**

Use a director-specific action bar when `videoMode === 'director_plan'`.

### 4. Character Continuity Requires Persistent References

Non-adjacent shots cannot simply reuse previous video outputs as references.

**Recommendation**

Inject the canonical character bible and reference image into every relevant shot.

### 5. Audio Requires Downstream Voiceover Processing

Video generation can produce silent visuals even when the campaign contains dialogue.

**Recommendation**

Offer an automated voiceover/TTS stage during final video assembly.

---

# 6. Voiceover & Audio Studio

## Key Findings

### 1. Voiceover and Music Modes Can Become Desynchronized

The “Use Music Direction” action can populate music instructions without switching the active generation mode.

**Impact**

Music instructions may be sent into a voice-generation pipeline.

**Recommendation**

Synchronize prompt content and the active audio-generation mode.

### 2. Fixed 24kHz WAV Assumption

The PCM containerizer assumes a 24kHz sample rate.

**Risk**

If upstream PCM arrives at a different rate, playback speed, pitch, and reported duration can become incorrect.

**Recommendation**

Use provider metadata or reliable output characteristics to determine the sample rate dynamically.

### 3. Multi-Speaker Dialogue Tags Are Fragile

Custom labels such as `Host:` or `Guest:` are not necessarily normalized to the speaker identifiers expected by the TTS provider.

**Impact**

Two-speaker input can collapse into a single voice.

**Recommendation**

Add a transcript-normalization layer before provider invocation.

### 4. Music Generation Lacks Reliable Fallback

The music path depends heavily on the Lyria preview pipeline.

**Risk**

Quota exhaustion or provider failures can stop music generation entirely.

**Recommendation**

Add a production-grade secondary music provider.

### 5. Audio Assets Are Poorly Connected to Downstream Studios

Generated audio can require manual download and re-upload to video or presentation workflows.

**Recommendation**

Provide direct “Use in Video” and “Use in Presentation” asset actions.

### 6. Regional Language Handling Needs Native-Script Support

Hindi, Gujarati, and Marathi flows may produce Latin-script phonetic text.

**Recommendation**

Explicitly require native-script output for supported Indian regional languages before TTS synthesis.

---

# 7. Corporate Presentations & Slideshow Engine

## Key Findings

### 1. Canvas Edits Can Be Lost During Export

Frontend modifications are not always persisted into the canonical presentation document before server-side rendering.

**Recommendation**

Persist or synchronize the latest presentation state before initiating export.

### 2. Slide Count Can Ignore User Intent

Presentation generation can rely on hardcoded planning behavior instead of fully respecting prompt/persona requirements.

**Recommendation**

Make slide-count requirements explicit in the canonical planning schema.

### 3. Invalid Chart Data Can Crash PPTX Rendering

LLM-produced chart values can contain data types that the rendering layer does not expect.

**Recommendation**

Sanitize and validate every numerical series before handing data to the PPTX renderer.

### 4. Grounding Information Can Be Dropped

Live-search evidence and citations are not always preserved in the canonical presentation model.

**Recommendation**

Persist provenance and citation metadata as first-class presentation data.

### 5. Legacy and Canonical Canvas Paths Diverge

Old DOM controls and the canonical presentation engine can expose overlapping or conflicting editing behavior.

**Recommendation**

Consolidate the workspace around the canonical `PresentationDocument` representation.

### 6. PDF Rendering Has Font and Scale Risks

Font substitution and point-scale differences can cause clipping or layout inconsistencies.

**Recommendation**

Standardize server-side font handling and validate PDF output across representative templates.

---

# 8. Storyline Generator

## Key Findings

### 1. Fire-and-Forget Image Generation Can Corrupt State

Sequential scene generation is performed through asynchronous client-side loops.

**Risk**

Failures and stale state can leave partially completed narratives inconsistent with UI state.

**Recommendation**

Use explicit job state and server-side orchestration for multi-scene generation.

### 2. Sequential Scenes Can Drift Visually

Character appearance, style, and composition may change from scene to scene.

**Recommendation**

Persist canonical character/style references and apply them to every scene.

### 3. ZIP Export Can Omit Narrative Metadata

The storyline package does not always preserve the complete narrative alongside generated media.

**Recommendation**

Make narrative text, scene metadata, and visual assets part of the same export specification.

### 4. Voiceover Integration Is Incomplete

Generated story narratives do not automatically flow into the audio pipeline.

**Recommendation**

Provide a structured narration handoff to the audio studio.

### 5. Credit Accounting Needs Consistency

Multi-scene workflows need predictable reservation and capture behavior.

**Recommendation**

Use a single atomic credit model for the entire storyline job.

---

# 9. Auth & Identity Service

## Key Findings

### 1. Token Refresh and 401 Retry Are Incomplete

The client does not consistently recover from expired sessions.

**Recommendation**

Implement centralized token refresh and safe request retry handling.

### 2. OAuth Onboarding Has Race Conditions

First-time OAuth users can reach workspace-resolution logic before their profile/workspace state is fully established.

**Recommendation**

Make onboarding state transitions explicit and transactional.

### 3. Auth Callback State Depends on URL Timing

The callback flow has an implicit dependency on URL-hash processing.

**Recommendation**

Use deterministic callback parsing and initialization.

### 4. Email State Is Tab-Isolated

`sessionStorage` can cause verification/resend state to diverge between tabs.

**Recommendation**

Use shared persistent state or server-backed verification status.

### 5. Resend Cooldown Can Be Bypassed

Client-side cooldown state can be cleared by manipulating browser storage.

**Recommendation**

Enforce rate limits and cooldowns server-side.

---

# 10. Landing & Public Marketing Portal

## Key Findings

### 1. Pricing Information Can Become Desynchronized

Landing-page pricing and pricing-page/checkout information are not guaranteed to share one source of truth.

**Recommendation**

Use a central product/pricing configuration.

### 2. Product Demonstration Coverage Is Limited

The public portal lacks strong live demonstrations and visual proof of the creative workflows.

**Recommendation**

Add product previews tied directly to current capabilities.

### 3. Responsive Layout Has Vertical Constraints

Some layouts can become cramped on laptops and smaller screens.

**Recommendation**

Review viewport-based sizing and vertical overflow behavior.

### 4. Company/Lead Routing Is Partially Hardcoded

Lead-routing behavior depends on hardcoded values and lacks strong real-time alerting.

**Recommendation**

Move business routing into configuration and add reliable lead notifications.

### 5. SEO/Social Metadata Is Incomplete

OpenGraph, Twitter card metadata, and structured JSON-LD are insufficient.

**Recommendation**

Add canonical metadata for public pages and campaigns.

---

# 11. Billing & Payment Engine

## Key Findings

### 1. Invoicing and GST Receipt Generation Are Missing

The payment engine does not provide a complete commercial invoicing lifecycle.

**Recommendation**

Add invoice generation, GST information, downloadable receipts, and invoice history.

### 2. Subscription Architecture Is Incomplete

One-time orders can be represented as if they were recurring subscriptions.

**Recommendation**

Implement a true subscription lifecycle with recurring state, renewals, cancellations, and entitlement synchronization.

### 3. Client-Side IP Geolocation Is Fragile

Currency detection depends on third-party IP APIs that can be blocked by privacy tools.

**Recommendation**

Use server-side geolocation signals or a reliable configured fallback.

### 4. Webhook Raw-Body Handling Is Fragile

Payment webhook verification depends on `req.rawBody` being preserved across deployment middleware.

**Recommendation**

Guarantee raw-body access before parsing and test the exact deployment environment.

### 5. Credit Expiry and Rollover Are Not Segregated

The credit balance is represented as a single unified value.

**Recommendation**

Separate credit buckets by purchase period/expiry and explicitly define rollover rules.

---

# 12. Brand Intelligence Engine

## Key Findings

### 1. Creative Directives and Intelligence Data Are Not Fully Persisted

Important `creativeDirectives` and intelligence profile information can be lost at the database layer.

**Impact**

Downstream gems lose brand-specific instructions after refresh or cross-device access.

**Recommendation**

Persist `creative_directives` and intelligence data as canonical database fields.

### 2. Brand Guidelines Drawer Is Incomplete

Important parameters such as location, voice-accent style, visual demographic style, mission, pillars, tagline, and creative directives are not all editable after onboarding.

**Recommendation**

Expand the drawer into structured strategic-control sections.

### 3. Base64 Logo Payloads Are Excessive

Large logos can remain as Base64 data during AI requests.

**Impact**

Increased network payloads, latency, and token consumption.

**Recommendation**

Upload assets to storage early and use stable storage references.

### 4. Prompt Context Is Insufficiently Isolated

Website text and brand attributes are interpolated into prompts without strong boundary markers.

**Risk**

Adversarial or misleading content can influence model behavior.

**Recommendation**

Use explicit structured delimiters around externally sourced and user-provided context.

### 5. Color Extraction Has a Weak Fallback

The color extractor can depend heavily on `theme-color` metadata.

**Impact**

Many modern sites fall back to generic colors.

**Recommendation**

Add logo/CSS-based color extraction before applying generic defaults.

---

# 13. Generation History & Asset Library

## Key Findings

### 1. History Can Be Wiped by Error Recovery

The error boundary and storage-quota handling can aggressively remove local history.

**Impact**

Prompt history and offline creative state can be permanently lost.

**Recommendation**

Prune old records instead of clearing the entire history store.

### 2. Stored Media URLs Can Expire

History records may contain direct private media URLs instead of storage paths that can be re-signed.

**Recommendation**

Refresh signed URLs when history is requested.

### 3. Generation Parameters Are Not Fully Preserved

History records may omit:

* Aspect ratio
* Model/engine
* Negative prompt
* Style preset
* Seed
* Temperature
* Voice settings

**Impact**

“Replay” can reproduce the prompt but not the original generation conditions.

**Recommendation**

Persist the complete generation configuration.

### 4. Proxy Downloads Have a 25MB Bottleneck

Large videos and ZIP packages can exceed the proxy limit.

**Recommendation**

Use streaming download endpoints for large media.

### 5. History and Asset Library Are Disconnected

Generated assets cannot always be promoted directly into reusable product/face/brand assets.

**Recommendation**

Add a direct “Save to Asset Library” action.

### 6. Video History Preview Is Incomplete

Video cards lack the same preview behavior available for images.

**Recommendation**

Support video posters, hover playback, and clickable video previews.

---

# 14. Settings & Workspace Administration

## Key Findings

### 1. Workspace Membership Allows Unauthorized Modification

Membership endpoints require stronger server-side authorization.

**Risk**

A caller may be able to add members or alter workspace roles without sufficient privilege.

**Recommendation**

Protect all membership mutations with explicit workspace-role checks.

### 2. Member Directory Can Expose Sensitive Information

Workspace-member listing is insufficiently restricted.

**Recommendation**

Require workspace membership and appropriate role authorization before exposing member details.

### 3. Workspace Administration Is Missing From the UI

The settings interface lacks a complete multi-tenant administration workflow.

**Missing Areas**

* Workspace configuration
* Team member management
* Invitations
* Role management
* Member removal
* Workspace transfer

### 4. API Key Infrastructure Is Absent

There is no complete API-key lifecycle for programmatic access.

**Recommendation**

Add:

* Key database schema
* Creation/revocation endpoints
* Scope management
* Authentication middleware
* API-key settings UI

### 5. RBAC Is Not Consistently Enforced

Database roles exist, but sensitive application services do not consistently validate permissions.

**Recommendation**

Introduce reusable server-side role guards.

### 6. Account Self-Service Is Incomplete

The account/settings layer lacks robust profile management, active-session controls, account deletion, and data export.

**Recommendation**

Add account security and privacy workflows, including export and deletion.

---

# 15. Human-Touch Curation Service

## Key Findings

### 1. No Credit Hold Protection

Human-touch requests can bypass the same atomic billing protections used by generation flows.

**Recommendation**

Reserve credits when the request is created and capture/release them according to completion state.

### 2. Large Base64 Deliverables Are Stored in Database Records

Large completed files are transferred as Base64 strings.

**Impact**

Large database payloads, inefficient storage, and oversized API requests.

**Recommendation**

Upload media directly to Supabase Storage and store object paths instead.

### 3. Status Mutation Can Be Privileged Client-Side

A requester can potentially modify state beyond what their role should allow.

**Recommendation**

Restrict state transitions to authorized administrative/curator roles.

### 4. Email Routing Is Hardcoded

Notification destinations include fixed addresses and can fail to reach the customer.

**Recommendation**

Store request-specific customer notification information and centralize email configuration.

### 5. Campaign Deck Can Double-Dispatch Requests

The campaign workflow can submit the same curation request more than once.

**Recommendation**

Make dispatch idempotent and disable duplicate submissions.

### 6. Polling and Realtime Mechanisms Are Duplicated

Multiple client polling intervals can overlap with Supabase realtime updates.

**Recommendation**

Choose one primary synchronization mechanism with a clear fallback.

### 7. Curation State Machine Is One-Way

The workflow lacks a revision/editorial-review loop.

**Recommendation**

Add explicit revision, rework, review, approval, and resubmission states.

---

# 16. Video Generation Engines

## Key Findings

### 1. Google Omni Integration Uses an Invalid Model/API Contract

The configured Omni integration does not consistently correspond to a valid provider model and payload contract.

**Recommendation**

Align the registry, adapter, and request payload with a verified Google API contract.

### 2. Veo Integration Uses Invalid SDK Methods

The provider implementation relies on methods that are not available through the configured `@google/genai` interface.

**Recommendation**

Use the supported REST/API operation for asynchronous Veo generation.

### 3. Seedance Endpoint Is Invalid

The configured fal.ai Seedance endpoint does not correspond to a supported provider endpoint.

**Recommendation**

Replace the provider slug and adapter contract with a verified endpoint.

### 4. Kling Version Slug Is Invalid

The configured Kling provider version does not match the actual fal.ai endpoint.

**Recommendation**

Centralize provider slugs and validate them against the provider contract.

### 5. Two Separate Video Architectures Exist

The standard video-generation system and the Ad Director system maintain separate provider hierarchies.

**Impact**

Duplicated logic, inconsistent behavior, and difficult maintenance.

**Recommendation**

Unify provider capability definitions and execution through a canonical pipeline.

### 6. Background Worker Execution Is Fragile

Serverless and worker startup paths can become disconnected.

**Recommendation**

Ensure all expensive jobs have reliable worker ownership, queue visibility, retry behavior, and job reconciliation.

---

# 17. Image Generation Engines

## Key Findings

### 1. Imagen Is Advertised but Not Properly Implemented

Documentation and product surfaces reference Imagen capabilities that are not consistently represented by the actual provider implementation.

**Recommendation**

Implement a complete official Google Imagen provider and align product metadata with it.

### 2. FLUX Uses Long Synchronous Polling

The FLUX flow can block for long periods and create credit/storage consistency risks.

**Recommendation**

Move long-running generation into a background job model with explicit credit state.

### 3. Ideogram Is Missing

The codebase does not contain an implemented Ideogram integration despite its relevance to typography-heavy creative generation.

**Recommendation**

Add a dedicated Ideogram adapter if typography-focused image generation is required.

### 4. Midjourney Is Referenced but Not Integrated

Prompt language may mention Midjourney, but no production adapter exists.

**Recommendation**

Either remove unsupported references or clearly separate conceptual prompt compatibility from actual provider support.

### 5. Some fal.ai Endpoints Are Non-Existent

Model registries contain unsupported or invalid endpoint definitions.

**Recommendation**

Validate every model definition against the provider API before exposing it to users.

---

# 18. Text & Strategy Engines

## Key Findings

### 1. Anthropic Claude Is Absent

No production Anthropic adapter exists despite strategic use cases that could benefit from multi-provider text generation.

**Recommendation**

Add Claude only if multi-model redundancy and differentiated strategy capabilities are required.

### 2. Gemini Model Names Are Invalid

Multiple text-generation and planning services reference model identifiers that do not resolve successfully.

**Impact**

Repeated `404` failures and unnecessary fallback latency.

**Recommendation**

Centralize verified model identifiers.

### 3. Campaign Strategy Gateway Repeats Failed Requests

The campaign gateway tries unavailable model names on every strategy-generation stage.

**Recommendation**

Remove invalid entries and reorder the production fallback chain.

### 4. SSE Streaming Protocol Is Incorrect

The text adapter expects event structures that do not match the actual streaming contract.

**Recommendation**

Use the supported streaming chunk format and implement explicit connection/error handling.

### 5. AI Policy and Model Registry Can Diverge

The central AI policy, text resolver, and frontend model registry do not always describe the same models.

**Recommendation**

Create a single authoritative model capability registry consumed by all layers.

---

# 19. Audio & Speech Engines

## Key Findings

### 1. ElevenLabs Is Not Implemented

No production ElevenLabs adapter exists.

**Recommendation**

Introduce an optional enterprise voice provider for custom voices and advanced voice quality where required.

### 2. Gemini TTS Primary Model Configuration Is Inconsistent

The TTS resolver references model identifiers that do not reliably match the production provider configuration.

**Recommendation**

Use verified TTS models and ensure the fallback chain is based on actual provider errors.

### 3. Audio Scriptwriting Performs Unnecessary Failed Attempts

The audio generation path can spend multiple requests traversing unavailable model candidates.

**Recommendation**

Replace speculative model chains with a validated primary model and bounded fallback strategy.

### 4. Lyria Music Integration Is Not Reliable

The configured Lyria preview path is not a dependable production music backend.

**Recommendation**

Replace or supplement the integration with a supported production music provider.

---

# Cross-System Remediation Priorities

## Priority 1 — Provider and Model Correctness

Standardize all model names, provider slugs, SDK operations, and capability definitions.

Affected areas include:

* Campaign Strategy
* Text Generation
* Presentations
* Image Generation
* Video Generation
* Audio/TTS
* Music

## Priority 2 — Billing and Credit Integrity

Adopt a single transaction model for expensive asynchronous operations:

1. Reserve credits.
2. Create a generation/job record.
3. Execute asynchronously.
4. Capture on successful completion.
5. Release on failure or cancellation.
6. Keep the operation idempotent.

## Priority 3 — Server-Side Authorization

Introduce reusable authorization middleware for:

* Workspace membership
* Workspace roles
* Administration
* Asset deletion
* Credit operations
* API keys
* Human-touch state changes

## Priority 4 — Canonical State and Persistence

Ensure frontend state is synchronized with the authoritative backend representation before:

* Export
* Regeneration
* Cross-device access
* Downstream gem handoff
* Background execution

## Priority 5 — Storage and Asset Lifecycle

Use storage references rather than Base64 payloads and ensure:

* Signed URLs are refreshed
* Large media is streamed
* History can promote assets
* Generated assets retain their full metadata
* Export paths support large media

## Priority 6 — Background Processing

Move long-running workloads into workers, particularly:

* Video rendering
* FFmpeg assembly
* Multi-scene image generation
* Large media processing
* Heavy exports
* Long-running AI jobs

## Priority 7 — Cross-Gem Integration

Replace raw-text handoffs with canonical structured objects wherever possible.

Examples include:

* Campaign Strategy → Video
* Audio → Video
* Image → Asset Library
* History → Regeneration
* Brand Intelligence → All creative gems
* Presentation → Export pipeline

## Priority 8 — UX and Capability Transparency

The UI should expose only capabilities actually supported by the backend and should clearly communicate when:

* A model does not support references
* A generation is asynchronous
* Voiceover requires downstream TTS
* A selected engine differs from the requested engine
* A workflow is incomplete
* A user lacks the required workspace role

---

# Verification Strategy

The implementation work should be validated with focused integration tests covering:

* Provider model resolution
* Credit reserve/capture/release
* Duplicate request prevention
* Workspace authorization and RBAC
* OAuth onboarding
* Large-file storage and export
* Signed media URL regeneration
* Presentation export fidelity
* Video background-job processing
* Audio provider fallback
* Cross-gem asset handoff
* History replay with full generation parameters

The final production validation should confirm that a failed provider request does not cause duplicate billing, that long-running jobs never depend on serverless execution, and that user-created state survives refresh, cross-device access, and export.
