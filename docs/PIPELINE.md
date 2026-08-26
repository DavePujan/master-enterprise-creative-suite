# AI Pipeline & Model Architecture

This document outlines the strategic orchestration of AI models within the Creative Suite, reflecting the current Enterprise Plan configurations. We utilize a multi-model pipeline to balance speed, cost, and creative quality, managed by a credit-based usage system.

## 💰 Credit System & Enterprise Plan

The application operates on a credit-based system to simulate enterprise usage. Users start with an allocation of credits (e.g., 2500) which are deducted based on the specific AI tool (Gem) utilized.

### Available Gems & Costs

| Gem | Type | Cost | Description |
| :--- | :--- | :--- | :--- |
| **Strategy & Reasoning** | Text | 5 Credits | Deep strategic analysis and campaign reasoning. |
| **Social Caption Pack** | Text | 1 Credit | Generates a pack of engaging social media captions. |
| **Standard Brand Image** | Image | 2 Credits | High-quality social media imagery tailored to brand identity. |
| **Studio Asset Renders** | Image | 5 Credits | High-fidelity, studio-quality 3D renders and product shots. |
| **Social Video (5-8s)** | Video | 20 Credits | Cinematic ~8s video promos for social media. |
| **Cinematic Video (5-8s)** | Video | 40 Credits | High-end cinematic video generation for premium brand moments. |
| **Voiceover (upto 1m)** | Audio | 2 Credits | Professional AI voiceover generation. |
| **Social Music Track (30s)** | Audio | 3 Credits | Catchy 30-second music tracks for social content. |
| **Studio Music Track (upto 3m)** | Audio | 6 Credits | Full-length studio quality music composition. |
| **Agentic Campaign** | Campaign | 250 Credits | Full 53-asset campaign mix with autosync. |

---

## 🧠 Model Selection Strategy

We categorize our AI tasks into four primary layers: **Logic**, **Creative Synthesis**, **High-Fidelity Rendering**, and **Audio Generation**.

### 1. Logic & Structure Layer
Used for generating JSON schemas, story arcs, scripts, and strategic briefs.
- **Model**: `gemini-flash-latest`
- **Role**: High-speed reasoning. Handles the "thinking" before the "creating."
- **Grounding**: **Google Search Grounding** is utilized for logic tasks to ensure real-world relevance.

### 2. Creative Synthesis Layer
Used for final copy, editorial content, and complex brand strategies.
- **Models**: 
  - `gemini-flash-latest` (Standard)
  - `gemini-3.1-pro-preview` (High Quality)

### 3. Visual Rendering Layer
Used for generating images and videos.

#### Image Generation
- **Standard**: `gemini-2.5-flash-image` (Optimized for speed/ideation)
- **High Quality**: `gemini-3-pro-image-preview` (Best for final brand creatives, supports 1K resolution and **Google Search Grounding**)
- **Anti-Hallucination**: Strict system instructions are enforced to prevent the AI from hallucinating text or logos. If a logo is provided, it is used as an overlay; the AI is forbidden from attempting to draw or spell the brand name.

#### Video Generation (Veo)
- **Standard**: `veo-3.1-fast-generate-preview` (Quick promos, ~8s cinematic duration)
- **High Quality**: `veo-3.1-generate-preview` (Cinematic quality, takes longer, ~8s cinematic duration)

### 4. Audio Generation Layer
Used for generating voiceovers and music tracks.
- **Model**: `gemini-2.5-flash-preview-tts`
- **Role**: Converts generated scripts or lyrics into high-quality audio.

---

## 🔄 Core Workflows

### Brand Kit Initialization
1. **Identity Generation**: `gemini-flash-latest` generates core brand guidelines (pillars, tone, colors).
2. **Logo Discovery/Generation**: The system intelligently attempts to discover existing logos online via Google Search Grounding. If none is found, it falls back to AI generation.
3. **Visual Asset**: `gemini-3-pro-image-preview` generates a single, high-impact hero image grounded in industry trends.
4. **Strategic Docs**: `gemini-flash-latest` generates a **Brand Manifesto** and **Market Strategy** document.

### Audio Generation Pipeline
1. **Scripting**: `gemini-flash-latest` generates the script or lyrics based on the user's prompt and brand guidelines.
2. **Synthesis**: `gemini-2.5-flash-preview-tts` processes the script to generate the final audio `.wav` file.

### Video Promo Pipeline
1. **Creative Direction**: `gemini-flash-latest` acts as a Creative Director to write a detailed visual prompt for Veo, including VO and music style recommendations.
2. **Rendering**: The Veo model (`veo-3.1`) processes the prompt to generate the video file.

---

## 🛡️ Safety, Grounding & Brand Integrity
- **Grounding**: **Google Search Grounding** is used across logic and high-quality image tasks to ensure factual accuracy and industry relevance.
- **Strict Logo Handling**: To maintain brand integrity, models are explicitly instructed *not* to hallucinate logos or text. Logos are handled as clean, transparent overlays.
- **Dynamic Context**: All prompts are dynamically injected with Brand Guidelines to ensure consistent color, tone, and visual style across all generated assets.
