# Domain 05: Cinematic & Social Video - Verification Report

## Verification Methodology
- Inspected `apps/api/src/modules/videoGeneration/videoJobWorker.ts` and `videoAssemblyService.ts` to evaluate how FFmpeg assembly is executed.
- Reviewed `apps/web/src/features/creative/components/CreativeWorkspace.tsx` to verify UI rendering of Director Mode vs Single Shot modes.
- Examined `packages/ad-director/compiler/adSpecPromptCompiler.ts` to assess how reference assets and character continuity are resolved.
- Analyzed `packages/ad-director/assembly/assemblySpecBuilder.ts` and `packages/ad-director/assembly/ffmpegPipeline.ts` for audio integration and TTS handling.

## Findings Verification

### 1. FFmpeg Assembly Must Not Run in Serverless HTTP
- **Audit Claim:** FFmpeg is executed in a serverless HTTP context leading to timeouts. Recommendation is to use a background worker.
- **Status:** **FALSE / OUTDATED**
- **Evidence:** The backend architecture utilizes `public.ai_generation_jobs` and a dedicated `VideoJobWorker` (`apps/api/src/modules/videoGeneration/videoJobWorker.ts`) running a persistent polling loop to claim jobs atomically. The `processAssemblyRenderJob` method isolates FFmpeg execution securely inside the background worker, ensuring it does not run synchronously on the Express HTTP thread.

### 2. Director Mode and Single-Shot Controls Conflict
- **Audit Claim:** The UI can show a director storyboard while the main command bar still performs single-shot generation.
- **Status:** **FALSE**
- **Evidence:** `CreativeWorkspace.tsx` manages a strict `videoMode` state (`'director_plan'` vs `'single_shot'`). When `videoMode === 'director_plan'`, the `DirectorsPlanWorkspace` component is rendered, and the standard `CreativeCommandBar` and `CreativeOutputCanvas` components are intentionally excluded from the DOM. This ensures complete isolation between the multi-shot director plan and single-shot workflows.

### 3. Character Continuity Requires Persistent References
- **Audit Claim:** Non-adjacent shots cannot reuse previous video outputs as references and require injection of the canonical character bible into every relevant shot.
- **Status:** **FALSE / ALREADY IMPLEMENTED**
- **Evidence:** The `adSpecPromptCompiler.ts` engine explicitly implements character injection. In `resolveReferenceBindings`, it extracts the global character bible (`extractCharacters`) and loops over every `shot.subject`. For any character subject, it pulls the `char.referenceAssetIds` and appends them to the compiled execution payload with the role `'character_ref'`. This exact recommendation is already fully implemented.

### 4. Audio Requires Downstream Voiceover Processing
- **Audit Claim:** Video generation can produce silent visuals even when the campaign contains dialogue. Recommendation is to add a TTS + FFmpeg mix pass.
- **Status:** **TRUE**
- **Evidence:** In `assemblySpecBuilder.ts`, if the `adSpec` defines `adSpec.brief?.cta?.spokenText` but lacks a pre-rendered `voiceoverAssetId`, the spec assigns `assetId: undefined` for the voiceover track. Downstream, `ffmpegPipeline.ts` iterates over `spec.audioTracks` and safely skips any track without an `assetId`. As a result, the worker gracefully drops the requested dialogue instead of triggering a TTS generation pass, leading to silent visuals despite the presence of spoken dialogue in the campaign brief.
