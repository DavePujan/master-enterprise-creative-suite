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

Used for promotional loops, brand videos, and social media reels.

| Model ID | Tier | Description / Use Case | Credits |
| :--- | :--- | :--- | :---: |
| **`veo-3.1-fast-generate-preview`** | Fast | Quick draft generation for short social clips (720p). | 20c |
| **`veo-3.1-generate-preview`** | Standard | High-end cinematic video generation (1080p). | 30c |
