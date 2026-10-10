# Domain 08: Storyline Generator - Verification Report

## Verification Methodology
- Reviewed `apps/web/src/features/creative/hooks/useCreativeExecution.ts` to trace the execution flow of `storyline` gem types.
- Analyzed the client-side loop that triggers sequential image generation for storylines.
- Inspected the `handleDownloadStorylineZip` implementation in `useCreativeExecution.ts` to determine payload packaging behavior.

## Findings Verification

### 1. Fire-and-Forget Image Generation Can Corrupt State
- **Audit Claim:** Sequential scene generation is performed through asynchronous client-side loops, making it vulnerable to failures and stale UI state.
- **Status:** **TRUE**
- **Evidence:** When a storyline is generated, `useCreativeExecution.ts` fires an unawaited asynchronous IIFE loop (`(async () => { for (let i = 0; i < scenes.length; i++) { ... } })()`) directly from the browser. If the browser tab is closed, navigating away, or if a provider rate limit (`429`) is hit midway, the background loop silently dies, leaving the user's React state permanently hung with a partial storyboard and no server-side recovery mechanism.

### 2. Sequential Scenes Can Drift Visually
- **Audit Claim:** Character appearance, style, and composition may change from scene to scene without persistence.
- **Status:** **TRUE**
- **Evidence:** Inside the sequential image generation loop, the `generateImage` utility is called for each scene with a fresh textual prompt (`Scene X for storyline...`). It does not pass any consistent character identity reference (like a consistent seed, or prior image as an `imagePrompt`) to the backend. As a result, the visual continuity is entirely at the mercy of the model, which leads to distinct style and character drifting across sequential scenes.

### 3. ZIP Export Can Omit Narrative Metadata
- **Audit Claim:** The storyline package does not always preserve the complete narrative alongside generated media.
- **Status:** **TRUE**
- **Evidence:** In `handleDownloadStorylineZip`, the implementation strictly loops over `scenes`, fetches the `scene.image` blob, and writes it to `zip.file('scene_X.png', blob)`. It completely fails to serialize or append the narrative text (`scene.narrative`) or the parent `storyTitle` into the ZIP payload (e.g., as a `.json` or `.txt` manifest). Consequently, users receive a ZIP file containing only images with no accompanying storyline copy.
