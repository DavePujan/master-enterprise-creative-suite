# Cinematic & Social Video Generation Engine (v2)

Enterprise capability-driven multimodal video generation, conversational editing, and director-level sequence planning across Google Omni, Google Veo 3.1, fal Kling 3.0, and fal Seedance 2.0.

---

## 1. System Architecture

```text
                                     FRONTEND (Web Client)
                                              │
                                              ↓
                                   VideoGenerationRequest
                                              │
                                              ↓
                                         /api/video
                                              │
                                   VideoGenerationService
                                              │
                         ┌────────────────────┼────────────────────┐
                         ↓                    ↓                    ↓
                    Credit Hold       Capability Registry     Job Creation
                   (Persistent)               │           (ai_generation_jobs)
                                              ↓
                                        Model Resolver
                           [HARD REQUIREMENT | SOFT PREF | DEFAULT]
                                              │
                            ┌─────────┬───────┼─────────┬─────────┐
                            ↓         ↓       ↓         ↓         ↓
                          Omni       Veo    Kling    Seedance   (Future)
                            │         │       │         │
                            └─────────┴───────┴─────────┘
                                              │
                                       VideoJobWorker
                                   (Background Reconciler)
                                              │
                                     Provider Poll / Result
                                              │
                                       Supabase Storage
                                         (user-assets)
                                              │
                                         public.assets
                                              │
                                        Credit Capture
                                   (Atomic capture / release)
                                              │
                                    VideoGenerationResult
```

---

## 2. The 8 Architectural Pillars (v2)

### 1. Explicit Omni Capabilities & Terminology
- **Google Omni 1.1 Flash (`gemini-omni-1.1-flash`)** supports multimodal image conditioning, reference parts, conversational video editing, extension, and native synchronized audio.
- **NOT** described as start/end frame interpolation. Omni does not provide Veo-style explicit first-to-last frame trajectory guarantees.
  - Image conditioning / reference parts: **YES**
  - Explicit start-frame control: **NO**
  - Explicit end-frame interpolation: **NO**
  - Conversational follow-up edits: **YES**

### 2. Omni Response Delivery & Store Semantics
- Initial generation sets `store: true` so Google's session context is preserved on the server side.
- Specifies `response_format: { type: 'video', delivery: 'uri' }` for reliable video streaming.
- Follow-up conversational edits provide `previous_interaction_id`, keep `store: true`, and automatically embed `"Keep everything else the same"` for targeted adjustments.

### 3. Provider-Aware Cancellation & Safe Credit Accounting
- **Before Upstream Submission**: Job immediately marked `cancelled`; reserved credits released immediately with zero net charge.
- **In-Flight with Provider Cancellation Support** (e.g. `fal.queue.cancel`): Cancellation dispatched upstream; held credits released upon provider confirmation.
- **In-Flight without Immediate Provider Abort** (e.g. Veo operations): Job marked `cancel_requested`. The client stops tracking, but credit hold remains active until the worker observes final termination without output to prevent accounting voids.

### 4. Persistent Credit Reservation on `VideoJob`
- Every `VideoJob` persists:
  - `jobId`: Unique job identifier
  - `workspaceId`: Tenant boundary
  - `reservationId`: PostgreSQL credit reservation hold reference
  - `reservedCredits`: Quantity of credits held
  - `creditState`: `'held' | 'captured' | 'released'`
- Survives server restarts; background reconciler sweeps and settles orphaned credit holds.

### 5. Decoupled Background Worker & Recovery Reconciler
- HTTP requests return `{ jobId, status: 'queued' }` immediately (HTTP 202).
- `VideoJobWorker` polls providers in the background, downloads video streams, uploads to Supabase Storage (`user-assets`), creates records in `public.assets`, and triggers atomic capture via `creditService.captureCredits`.
- `VideoJobReconciler` automatically sweeps pending jobs on server startup or timeout to clear zombie locks.

### 6. Tiered Model Routing Rules
- **HARD_REQUIREMENT**:
  - `startFrame + endFrame` -> Requires `veo-pro`.
  - `> 3 image refs` or `videoRefs` / `audioRefs` -> Requires `seedance-2`.
  - `mode === 'edit_video'` with `previousInteractionId` -> Requires `google-omni`.
  - `1:1` aspect ratio -> Requires `kling-v3` or `seedance-2`.
- **SOFT_PREFERENCE**:
  - High-energy physical motion / stunt actions -> Preference `kling-v3`.
  - Complex multi-shot narrative sequence -> Preference `seedance-2`.
- **DEFAULT_PREFERENCE**:
  - General text-to-video / multimodal draft -> `google-omni` (conversational power & audio).

### 7. Canonical `assetId` in References (Zero Base64 in Request)
- API requests specify `VideoReference: { assetId: string; type: VideoReferenceType; label: string }`.
- Backend resolves `assetId` via `VideoAssetResolver` into Supabase signed URLs or buffers for provider payloads. Eliminates megabyte base64 strings over the wire.

### 8. Live Verification Gate
- Validates configured credentials (`GEMINI_API_KEY`, `FAL_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) before declaring model readiness.

---

## 3. Video Engine Specifications & Costing

| Engine Key | Model ID | Provider | Product Tier | Max Dur | Ratios | Frames / Refs | Audio | Credits |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`google-omni`** | `gemini-omni-1.1-flash` | Google | Pro | 10s | 16:9, 9:16 | Up to 3 image refs, Conversational edit | Synced | **20c** |
| **`veo-pro`** | `veo-3.1-generate-preview` | Google | Pro | 8s | 16:9, 9:16 | Start + End frame interpolation, 3 refs | Native | **40c** |
| **`veo-fast`** | `veo-3.1-fast-generate-preview` | Google | Standard | 7s | 16:9, 9:16 | Start frame only | Native | **20c** |
| **`veo-lite`** | `veo-3.1-lite-generate-preview` | Google | Fast | 5s | 16:9, 9:16 | Text prompt only (720p rapid draft) | No | **10c** |
| **`kling-v3`** | `fal-ai/kling-video/v3/standard` | fal.ai | Plus | 15s | 16:9, 9:16, 1:1 | Start + End image, Elements, Multi-shot | Synced | **40c** |
| **`seedance-2`** | `bytedance/seedance-2.0` | fal.ai | Cinematic | 15s | Auto, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 | Up to 9 images, 3 videos, 3 audios | Synced | **80c** |

---

## 4. API Specification (`/api/video`)

### `POST /api/video/generate`
Dispatches an asynchronous video generation job.
- **Request Body**: `VideoGenerationRequest`
- **Response**: HTTP 202 `{ job: VideoJob }`

### `GET /api/video/jobs/:jobId`
Fetches the current status and output URLs of an in-flight or completed video job.
- **Response**: HTTP 200 `{ job: VideoJob }`

### `POST /api/video/jobs/:jobId/cancel`
Provider-aware cancellation with safe credit release.
- **Response**: HTTP 200 `{ success: boolean, status: VideoJobStatus, message: string }`

### `POST /api/video/jobs/:jobId/edit`
Conversational follow-up video edit using Google Omni `previous_interaction_id`.
- **Request Body**: `{ editInstruction: string }`
- **Response**: HTTP 202 `{ job: VideoJob }`

### `POST /api/video/jobs/:jobId/extend`
Extends an existing video sequence with continuous motion.
- **Request Body**: `{ prompt?: string, durationSeconds?: number }`
- **Response**: HTTP 202 `{ job: VideoJob }`

### `POST /api/video/plan` (or `/api/video/autowrite`)
Auto-Write Video Director: Generates a complete cinematography plan, scene breakdown, and engine recommendation.
- **Request Body**: `VideoAutoWriteRequest`
- **Response**: HTTP 200 `{ plan: VideoPlan }`
