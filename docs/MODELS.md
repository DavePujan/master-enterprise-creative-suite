# Generative AI Models Index

This document catalogs the various generative AI models currently integrated into the Studio AI application. We offer different tiers (Standard vs. High Quality) depending on the user's performance needs and budget.

## 📝 Text Generation Models (Reasoning & Copy)

Used for strategy generation, social media captions, brand manifestos, and agentic campaign planning.

| Model ID | Tier | Description / Use Case |
| :--- | :--- | :--- |
| **`gemini-flash-latest`** (Gemini 1.5 Flash) | Standard | High-speed reasoning and solid copy generation. Used as the default workhorse for most text tasks and JSON structuring. |
| **`gemini-3.1-pro-preview`** | High Quality | Reserved for complex brand strategies, deep reasoning, and high fidelity nuance. Ideal for boardroom-ready campaign planning. |

## 🎨 Image Generation Models (Visuals & Concepts)

Used for standard brand images, studio renders, presentation slide backgrounds, and campaign visual placeholders.

| Model ID | Tier | Description / Use Case |
| :--- | :--- | :--- |
| **`gemini-2.5-flash-image`** | Standard | Fast generation, excellent for rapid ideation and mood boarding. |
| **`gemini-3-pro-image-preview`** | High Quality | Best for final brand creatives, high-fidelity studio renders, and photorealistic output. Supports advanced capabilities like Google Search grounding. |

## 🎬 Video Generation Models (Promos & Cinematic)

Used for generating 5-8 second promotional loops, cinematic brand videos, and social media reels.

| Model ID | Tier | Description / Use Case |
| :--- | :--- | :--- |
| **`veo-3.1-fast-generate-preview`** | Standard | Quick generation for short social media clips (typically 720p). Optimized for speed over complex physics accuracy. |
| **`veo-3.1-generate-preview`** | High Quality | High-end cinematic video generation (typically 1080p). Produces breathtaking, studio-quality shots with dramatic lighting and smooth camera movements. |

---

## ⚙️ Model Selection Logic

- **Context Window**: The text models handle up to 1M+ tokens, allowing us to feed extensive brand guidelines and multi-modal assets into the prompt context.
- **Failovers/Alternatives**: The application codebase is modular and can support `imagen-` or `pollinations.ai` fallbacks for diverse visual formats if needed.
- **Audio Context**: For audio (voiceovers and music), text models write the scripts/prompts, which are then passed to specialized TTS/audio generation pipelines based on the selected voice characters.
