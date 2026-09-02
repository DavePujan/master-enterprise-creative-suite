# Product Requirements Document (PRD)
## Project: Writopedia AI (Master Enterprise Creative Suite)

---

### 1. Executive Summary & Vision
**Writopedia AI** is an enterprise-grade, agentic creative automation platform designed for modern brands, marketing agencies, and creative directors. It empowers teams to initialize, govern, and scale comprehensive brand identities into high-impact marketing collateral—spanning strategy, copy, social imagery, presentation slide decks, voiceovers, and cinematic video assets—with zero latency and high visual fidelity.

---

### 2. Target Audience & Personas
- **Brand Managers & Creative Directors**: Need consistent visual guidelines, color palette governance, typography enforcement, and automated logo placement across multi-channel campaigns.
- **Performance Marketers & Growth Teams**: Require rapid generation of high-converting social caption packs, ad creatives (1:1, 9:16, 16:9), and promotional video hooks.
- **Enterprise Agency Teams**: Manage multiple client brands, require multi-modal context inputs (face consistency, product placement, ingredient references), and demand boardroom-ready corporate presentation decks.

---

### 3. Core Features & Capabilities

#### 3.1 Brand Initialization & Guidelines Engine
- Automated brand strategic brief discovery and kit generator.
- Extracts/generates Brand Pillars, Color Palettes, Typography Pairings, Brand Voice/Tone, and Logo concepts.
- Cultural & Demographic Alignment: Regional targeting (e.g., Indian demographic context, contemporary lifestyle adaptations).

#### 3.2 Creative Tool Suite ("Gems")
1. **Campaign Strategy & Copywriting (`text`)**:
   - Deep conversational discovery workshop, positioning manifestos, and boardroom campaign reasoning.
   - Grounded in real-time market contexts via Google Search Grounding.
2. **Social Caption Pack (`text`)**:
   - Platform-ready hooks, body captions, call-to-actions (CTAs), and hashtag sets for Instagram, LinkedIn, and Threads.
3. **Standard Brand Image Studio (`image`)**:
   - Social media and advertising visual generation tailored to active brand identity.
   - Multi-aspect ratio support: `1:1`, `16:9`, `9:16`, `4:3`.
   - Dual logo workflow: Immediate AI baking into image pixels vs. Interactive Draggable Logo/Text Layer canvas.
   - Context references: Product Placement image, Face/Model character reference, and Ingredients inputs.
4. **Cinematic & Social Video Producer (`video`)**:
   - Short promotional video loops (5–8s) with cinematic lighting and dynamic camera transitions.
   - Multi-tier model execution (Veo Lite, Veo Fast, Veo Pro, Kling 3.0, Seedance 2.0).
   - First-frame and last-frame context anchoring.
5. **Voiceover & Audio Studio (`audio`)**:
   - Natural spoken scripts with emotional accents (Professional, Cheerful, Energetic, Calming) synthesized via Gemini Flash TTS.
   - PCM to standard `.wav` dynamic conversion and in-browser playback/export.
6. **Corporate Presentations (`slideshow`)**:
   - Multi-slide deck generation with real-time fact-checking and automated slide background imagery generation.
   - Direct PDF compilation and export.
7. **Agentic Storyline & Narrative Generator (`storyline`)**:
   - 6 to 8-chapter progressive narrative decks with auto-generated visual scene concepts and zip packaging.
8. **E-Commerce Campaign Bundle (`campaign-deck`)**:
   - Unified 53-asset creative mix across display, social, email, and print channels.

#### 3.3 Asset Governance & Post-Processing
- **Interactive Canvas Editor**: Client-side repositioning, scaling, color inversion, and typography customization without re-rendering cost.
- **Asset Library & Curation Queue**: Centralized repository for all generated creatives with human-touch review pipelines.
- **Enterprise Credit System**: Usage throttling and cost allocation per model tier with Razorpay billing integration.

---

### 4. Non-Functional & Operational Requirements
- **Resilience & Fault Tolerance**: Every visual model generation implements a tiered fallback strategy (Primary Fal.ai Queue -> Secondary Google GenAI -> Zero-downtime Pollinations Flux fallback).
- **Latency & Responsiveness**: Immediate UI optimistic states, asynchronous queue polling with non-blocking feedback, and live streaming markdown renderers.
- **Cross-Platform Compatibility**: Fully responsive desktop and mobile workspace with persistent dark/light theme switching.
- **Serverless & Edge Ready**: Deployable on Express daemon servers or Vercel Serverless Functions (`/api/*`).
