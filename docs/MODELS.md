# Generative AI Models Index

This document catalogs the various generative AI models integrated into the Studio AI application. Model capabilities and costs are documentation-driven and strictly derived from official provider API schemas.

---

## 🎨 Image Generation Models (Visuals & Brand Creatives)

Image models are routed through the normalized image engine (`/api/images/generate`), featuring two-phase credit reservations, model-aware payload construction, and permanent Supabase Storage archival (`user-assets`).

Credit deduction rates range between **2 and 5 credits** per generation.

| Product Key / Label | Provider | Actual Provider Endpoint | Credits | Aspect Ratios | Resolution Support | Reference Inputs | Logo Overlay |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **`flux-schnell`**<br>(Fal FLUX Schnell) | Fal AI | `fal-ai/flux/schnell` | **2c** | Provider Native (`image_size`) | Native (`square_hd`, etc.) | Unavailable | Application Layer |
| **`gemini-preview`**<br>(Gemini Preview) | Google GenAI | `gemini-2.5-flash-image` | **2c** | Provider Native (`imageConfig`) | Native (1024x1024) | Reference Input (`inlineData`) | Application Layer |
| **`nano-banana-2`**<br>(Nano Banana 2) | Fal AI | `fal-ai/nano-banana-2` | **2c** | Provider Native (`aspect_ratio`) | Native (`0.5K`, `1K`, `2K`, `4K`) | Unavailable (Text-to-Image) | Application Layer |
| **`fal-studio`**<br>(Fal Studio) | Fal AI | `openai/gpt-image-2` | **3c** | Provider Native (`size`) | Native (1024x1024, 1536x1024) | Unavailable | Application Layer |
| **`flux-pro`**<br>(Fal FLUX Pro) | Fal AI | `fal-ai/flux/dev` | **4c** | Provider Native (`image_size`) | Native (`square_hd`, etc.) | Unavailable | Application Layer |

### Verified Model Capability Details

1. **Fal Studio (`openai/gpt-image-2`) — 3 Credits**:
   - **Aspect Ratio**: *Provider Native* (mapped directly to `size`: `1024x1024`, `1536x1024`, `1024x1536`).
   - **Logo Overlay**: *Application Layer* (real SVG/PNG brand logo is deterministically composited by canvas editor after generation).
   - **Face Reference**: *Unavailable* (endpoint has no face preservation or identity conditioning parameter).
   - **Product Reference**: *Prompt Guided* (product attributes and textures are directed through structured prompt engineering).
   - **Ingredients**: *Prompt Guided* (ingredients are integrated into descriptive prompt context; no dedicated parameter exists).

2. **Fal FLUX Schnell (`fal-ai/flux/schnell`) — 2 Credits**:
   - **Aspect Ratio**: *Provider Native* (mapped directly to `image_size` enum: `square_hd`, `landscape_16_9`, `portrait_16_9`, `landscape_4_3`).
   - **Logo Overlay**: *Application Layer* (clean background generated; real logo composited by application layer).
   - **Face Reference**: *Unavailable* (text-to-image endpoint does not accept reference images).
   - **Product Reference**: *Unavailable* (no reference image parameter on text-to-image endpoint).
   - **Ingredients**: *Prompt Guided* (described in visual scene context).

3. **Fal FLUX Pro (`fal-ai/flux/dev`) — 4 Credits**:
   - **Aspect Ratio**: *Provider Native* (`image_size`).
   - **Logo Overlay**: *Application Layer*.
   - **Face Reference**: *Unavailable*.
   - **Product Reference**: *Prompt Guided*.
   - **Ingredients**: *Prompt Guided*.

4. **Gemini Preview (`gemini-2.5-flash-image`) — 2 Credits**:
   - **Aspect Ratio**: *Provider Native* (Google GenAI SDK accepts `imageConfig.aspectRatio`).
   - **Logo Overlay**: *Application Layer*.
   - **Face Reference**: *Unavailable* (does not guarantee facial biometric identity preservation).
   - **Product Reference**: *Reference Input* (accepts multimodal `inlineData` image parts for visual conditioning and style guidance).
   - **Ingredients**: *Prompt Guided*.

5. **Nano Banana 2 (`fal-ai/nano-banana-2`) — 2 Credits**:
   - **Aspect Ratio**: *Provider Native* (exposes explicit `aspect_ratio` enum covering 1:1, 16:9, 9:16, 4:3, 21:9, 3:2, etc.).
   - **Resolution**: *Provider Native* (exposes explicit `resolution` enum: `0.5K`, `1K`, `2K`, `4K`).
   - **Logo Overlay**: *Application Layer*.
   - **Face Reference**: *Unavailable*.
   - **Product Reference**: *Prompt Guided*.
   - **Ingredients**: *Prompt Guided*.

---

## 📝 Text Generation Models (Reasoning & Copy)

Used for strategy generation, social media captions, brand manifestos, and agentic campaign planning.

| Model ID | Tier | Description / Use Case | Credits |
| :--- | :--- | :--- | :---: |
| **`gemini-2.5-flash`** | Standard | High-speed reasoning and solid copy generation. Default workhorse. | 1c / call |
| **`gemini-2.5-pro`** | High Quality | Reserved for complex brand strategies, deep reasoning, and high fidelity nuance. | 5c / call |

---

## 🎬 Video Generation Models (Promos & Cinematic)

Video models are routed through the normalized video generation pipeline (`/api/video/generate` and `/api/video/jobs/:jobId`), featuring asynchronous job polling, atomic two-phase credit reservations, model-adaptive conditioning parameter compilers, and automatic asset archival.

Credit deduction rates range between **10 and 80 credits** per video generation, calibrated to yield 45% – 81% gross margin against provider API costs.

| Product Key / Label | Provider | Provider Endpoint ID | Canonical Key | Credits | Supported Modes | Durations | Aspect Ratios | Max Resolution | Keyframe Control | Reference Inputs | Audio Capabilities |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- | :--- | :--- |
| **Google Omni Flash** | Google GenAI | `gemini-omni-1.1-flash` | `google-omni` | **20c** | text_to_video, image_to_video, edit_video, extend_video | 4s, 6s, 8s, 10s | 16:9, 9:16 | 1080p | No (explicit interpolation unsupported) | Up to 3 reference images (inline conditioning parts) | Ambient / Score / SFX / Full Soundscape |
| **Google Veo Pro** | Google GenAI | `veo-3.1-generate-preview` | `veo-pro` | **40c** | text_to_video, image_to_video, extend_video | 4s, 6s, 8s *(1080p/4K requires 8s)* | 16:9, 9:16 | 4K | Yes (Start Frame + End Frame motion interpolation) | Up to 3 subject consistency images | Audio Intent Selector |
| **Google Veo Fast** | Google GenAI | `veo-3.1-fast-generate-preview` | `veo-fast` | **20c** | text_to_video, image_to_video | 5s, 7s | 16:9, 9:16 | 1080p | Start Frame only (Animate Image) | None (bypassed for speed) | Audio Intent Selector |
| **Google Veo Lite** | Google GenAI | `veo-3.1-lite-generate-preview` | `veo-lite` | **10c** | text_to_video | 5s | 16:9, 9:16 | 720p (locked) | None | None | Draft preview |
| **Kling 3.0 Standard** | Fal AI | `fal-ai/kling-video/v3/standard` | `kling-v3` | **40c** | text_to_video, image_to_video, multi_shot | 3s, 5s, 10s, 15s | 16:9, 9:16, 1:1 | 1080p | Yes (Start Keyframe + End Keyframe) | `@Element1`..`@Element4` tag injection | Native Lip-Sync & Sound Effects |
| **Seedance 2.0 Cinematic** | ByteDance | `bytedance/seedance-2.0` | `seedance-2` | **80c** | text_to_video, image_to_video, reference_to_video, multi_shot | 4s, 6s, 8s, 10s, 12s, 15s, auto | auto, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 | 1080p | Yes (Start Keyframe) | Up to 9 image refs, 3 video guides, 3 audio tracks | Native Lip-Sync & Foley Synthesis |

### Verified Video Model Capability Details

1. **Google Omni 1.1 Flash (`gemini-omni-1.1-flash`) — 20 Credits**:
   - **Core Use Case**: Conversational video editing, multi-turn narrative modifications, and multimodal image conditioning.
   - **Stateful Continuity**: Utilizes Google GenAI `store: true` with `delivery: 'uri'`. Enables conversational iterative modifications using `previous_interaction_id`.
   - **Conditioning Parts**: Accepts up to 3 inline reference images without explicit interpolation constraints.
   - **Audio Direction**: Synthesizes audio intent via semantic audio prompting (Mute, Ambient, Score, Action SFX, Full Soundscape).
   - **Keyframe Policy**: Explicit start/end keyframe interpolation is intentionally unsupported by the Gemini Omni architecture.

2. **Google Veo 3.1 Pro (`veo-3.1-generate-preview`) — 40 Credits**:
   - **Core Use Case**: High-end cinematic commercials and motion interpolation sequences.
   - **Keyframe Interpolation**: Accepts explicit `startFrameAssetId` and `endFrameAssetId` to compute seamless physics-based motion transitions.
   - **Subject Consistency**: Accepts up to 3 subject reference images (`image_to_video` conditioning).
   - **Duration / Resolution Rules**: Generating in 1080p or 4K strictly enforces 8-second sequence length per Google GenAI API specifications.

3. **Google Veo 3.1 Fast (`veo-3.1-fast-generate-preview`) — 20 Credits**:
   - **Core Use Case**: Sub-second fast image animation and rapid concept iteration.
   - **Keyframe Support**: Accepts `startFrameAssetId` for single-image animation. End-frame interpolation and subject references are disabled to maintain ultra-low latency.
   - **Durations**: Fixed to 5-second or 7-second clips.

4. **Google Veo 3.1 Lite (`veo-3.1-lite-generate-preview`) — 10 Credits**:
   - **Core Use Case**: Most economical draft engine for direct text-to-video storyboarding.
   - **Resolution**: Locked to 720p draft rendering.
   - **Media Inputs**: All image uploads and keyframe parameters are disabled; operates strictly on text prompts.

5. **Kling 3.0 Standard (`fal-ai/kling-video/v3/standard`) — 40 Credits**:
   - **Core Use Case**: Social media square format (1:1), dual keyframe animation, and character element preservation.
   - **Element Injection**: Accepts up to 4 distinct visual element tokens (`@Element1` through `@Element4`) for consistent props, mascots, or characters.
   - **Audio Generation**: Native audio engine generates synchronized lip-sync and environmental Foley.
   - **Aspect Ratios**: Native support for 16:9, 9:16, and 1:1.

6. **Seedance 2.0 Cinematic (`bytedance/seedance-2.0`) — 80 Credits**:
   - **Core Use Case**: Universal multimodal choreography, multi-shot sequences, and complex reference conditioning.
   - **Multimodal Reference Board**:
     - Up to 9 image references categorized by semantic role (`subject`, `style`, `layout`, `background`, `character`, `motion`).
     - Up to 3 video reference guides for motion transfer or timing.
     - Up to 3 audio reference tracks for rhythm-matching and vocal choreography.
   - **Native Audio Engine**: Fully synchronized lip-sync and Foley sound effects synthesis.
   - **Aspect Ratios**: Full spectrum support (`auto`, `21:9`, `16:9`, `4:3`, `1:1`, `3:4`, `9:16`).

