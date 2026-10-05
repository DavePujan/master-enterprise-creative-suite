# Domain 06: Content Moderation & Safety Filters - Verification Report

## Verification Methodology
- Inspected provider adapters (`apps/api/src/modules/videoGeneration/providers/googleVeoProvider.ts`) for safety policy rejection handling.
- Examined `apps/api/src/modules/videoGeneration/videoJobWorker.ts` to trace the error propagation and job status state machine when a safety failure occurs.
- Searched the backend codebase (`apps/api/src`) for `deleteAsset` or Supabase storage `.remove()` invocations to check for cleanup mechanics when generation parameters or prompts are mutated mid-flight.

## Findings Verification

### 1. Failing Moderation Degrades State Silently
- **Audit Claim:** When a provider rejects a prompt for safety, the error is not bubbled up as a safety policy violation. The application state silently rolls back and leaves the UI stuck in a loading or failed state.
- **Status:** **TRUE**
- **Evidence:** 
  1. The provider adapters (e.g., `googleVeoProvider.ts`) perform raw calls to the underlying SDKs (`@google/genai`) without `try...catch` blocks that intercept and normalize safety-specific exceptions.
  2. While the codebase contains an `AdapterErrorNormalizer` (`apps/api/src/modules/adDirector/adapters/shared/errorNormalizer.ts`) designed to translate safety errors into a safe `CONTENT_REJECTED` code, it is completely unintegrated.
  3. In `videoJobWorker.ts` (`processAdShotJob`), upstream safety exceptions during `adapter.submit` are simply caught by a generic top-level `catch (err)` which logs the error to the console and immediately terminates the tick. The job's state in `ai_generation_jobs` is never transitioned to `failed`. Consequently, the lease expires, the job loop perpetually retries and throws the same error, and the UI remains stuck indefinitely.

### 2. Cross-Model Safety Tolerance Discrepancy
- **Audit Claim:** Users generating concepts via Gemini (lax safety) get blocked during video generation with Veo (strict safety). Recommendation is to implement a pre-flight prompt moderation check.
- **Status:** **TRUE**
- **Evidence:** There are no pre-flight moderation checks during the snapshot generation or execution planning phase. The prompt flows directly from the Campaign Strategist (Gemini) into the execution pipeline for Veo, where it hits the unhandled runtime safety walls evaluated above.

### 3. Dangling Artifacts Fill User Storage Bucket
- **Audit Claim:** When users edit prompts or change shots before generation is final, the system silently abandons previously generated Cloud Storage assets without deleting them from the `user-assets` bucket.
- **Status:** **TRUE**
- **Evidence:** A comprehensive scan of the API codebase confirms the total absence of asset deletion mechanics (`deleteAsset` or Supabase storage `.remove()` calls). When users mutate an AdSpec and re-trigger execution, new asset records and storage paths are allocated. The previously generated mp4s remain permanently in Cloud Storage, accumulating unbounded storage costs.
