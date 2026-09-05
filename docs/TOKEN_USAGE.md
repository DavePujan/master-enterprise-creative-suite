# Token Usage Architecture, Model Costing & Credit Schedules

> 🔒 **MANDATORY GOVERNANCE DIRECTIVE**  
> This document is the **single authoritative billing, pricing, and token economics specification** for Writopedia AI.  
> **Rule of Immutability**: AI agents are **STRICTLY FORBIDDEN** from modifying, recalibrating, discounting, or altering any credit deduction schedules, plan pricing, or model costs in this file unless the user explicitly issues the directive: *"Update TOKEN_USAGE.md"* or *"Change billing parameters"*.

---

## 1. 🌐 Economic Baseline & Currency Standard

Writopedia AI operates on a dual-currency financial model (INR & USD) backed by dynamic geolocation detection (IP-API / Timezone heuristics) and Razorpay international checkout.

- **Baseline Currency Exchange Rate**: **$1.00 USD = ₹93.00 INR**
- **Credit Valuation Tiers**:
  - **Starter / On-Demand Rate**: **₹15.00 / $0.17 per Credit** (Pilot Subscription & Starter Booster)
  - **Growth / Pro Rate**: **₹12.50 / $0.13 per Credit** (Plus Subscription & Power Booster)
  - **Enterprise / Volume Rate**: **₹10.00 / $0.10 per Credit** (Pro Subscription & Super Booster)
- **Minimum Gross Margin Target**: **≥ 65% – 85%** across all creative generative modalities.

---

## 2. 💎 Gem-Wise Credit & Model Cost Matrix

Every credit deduction in Writopedia AI is atomic, backed by PostgreSQL `reserve_credits_for_ai` stored procedure with row-level locks (`SELECT ... FOR UPDATE`). Failed provider generations or user cancellations trigger automatic release with **zero net credit loss**.

---

### 1. 🎯 Campaign Strategy Gem (`campaign-strategist-y`)
Synthesizes the comprehensive 16-dimension enterprise campaign strategy, 5-stage customer journey, 5-tier production architecture, and real-time strategic route options.

| Action / Model | Provider ID | Input Cost ($ / 1M) | Output Cost ($ / 1M) | Avg. Provider Cost ($) | Avg. Provider Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Discovery Questions & Readiness** | `gemini-2.5-flash` | $0.075 | $0.30 | $0.0008 | ₹0.07 | **0c (Free)** | Free Exploration | 100% |
| **Alternative Route Generation** | `gemini-2.5-flash` | $0.075 | $0.30 | $0.0012 | ₹0.11 | **0c (Free)** | Free Exploration | 100% |
| **Master Strategy Synthesis** | `gemini-2.5-pro` | $1.250 | $5.00 | $0.0650 | ₹6.05 | **5 Credits** | ₹50.00 – ₹75.00 | **~88%** |
| **AI Strategy Refinement / Critique** | `gemini-2.5-pro` | $1.250 | $5.00 | $0.0250 | ₹2.33 | **2 Credits** | ₹20.00 – ₹30.00 | **~88%** |

*Note: Exploratory discovery queries and strategic routes are intentionally unbilled (0 credits) to maximize user engagement; the authoritative deduction occurs strictly upon locking a territory and compiling the Master Strategy.*

---

### 2. 📦 Ecommerce Bundle / Campaign Deck (`bundles-campaigns`)
Spawns 5 cohesive, brand-grounded advertising visuals in parallel (Hero 16:9, Closeup 1:1, Lifestyle 3:4, Offer 1:1, Alternate 1:1) alongside strategic campaign copy.

| Pipeline Component | Provider Engine / Model | Unit Cost ($) | Total Unit Cost ($) | Total Unit Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Full 5-Asset Campaign Deck** | 5x `openai/gpt-image-2` + `gemini-2.5-pro` | ~$0.030 / img | ~$0.170 | ₹15.81 | **25 Credits** | ₹250.00 – ₹375.00 | **~94%** |
| **Single Visual Re-Render** | `openai/gpt-image-2` / `fal-ai/flux/dev` | $0.030 | $0.030 | ₹2.79 | **2 Credits** | ₹20.00 – ₹30.00 | **~86%** |
| **Custom Prompt Cohesive Planning** | `gemini-2.5-flash` | $0.001 | $0.001 | ₹0.09 | **Included** | — | — |

---

### 3. ✍️ Captions & Copywriting (`captions` / Text Gem)
Generates platform-tailored marketing copy, social media hooks, hashtags, and email newsletters across multiple brand voices and languages.

| Model Tier | Provider Model ID | Input Cost ($ / 1M) | Output Cost ($ / 1M) | Est. Cost / Gen ($) | Est. Cost / Gen (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Standard Copy** | `gemini-2.5-flash` | $0.075 | $0.300 | $0.0004 | ₹0.04 | **1 Credit** | ₹10.00 – ₹15.00 | **~99%** |
| **Premium High-Stakes Copy** | `gemini-2.5-pro` | $1.250 | $5.000 | $0.0080 | ₹0.74 | **2 Credits** | ₹20.00 – ₹30.00 | **~96%** |
| **Auto-Write Prompt Ideator** | `gemini-2.5-flash` | $0.075 | $0.300 | $0.0003 | ₹0.03 | **0c (Free)** | In-App Assist | 100% |

---

### 4. 🎨 Standard Brand Image (`brand-image` / Image Gem)
Generates high-resolution, commercial-grade product photography, lifestyle scenes, and graphic assets with brand guidelines and color palette locking.

| Model Name | Provider Model ID | Inference Steps / Spec | Provider Cost ($) | Provider Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fast SDXL** | `fal-ai/fast-sdxl` | 20 steps, rapid | $0.003 | ₹0.28 | **2 Credits** | ₹20.00 – ₹30.00 | **~98%** |
| **Flux Schnell** | `fal-ai/flux/schnell` | 4 steps, photoreal | $0.003 | ₹0.28 | **2 Credits** | ₹20.00 – ₹30.00 | **~98%** |
| **Gemini Image** | `gemini-2.5-flash-image` | Multimodal native | $0.015 | ₹1.40 | **2 Credits** | ₹20.00 – ₹30.00 | **~93%** |
| **Standard Commercial** | `openai/gpt-image-2` | DALL-E / GPT Image | $0.030 | ₹2.79 | **3 Credits** | ₹30.00 – ₹45.00 | **~91%** |
| **Flux Pro High-Detail** | `fal-ai/flux-pro/v1.1` | 28 steps, studio quality | $0.050 | ₹4.65 | **4 Credits** | ₹40.00 – ₹60.00 | **~88%** |
| **AI Texture Refine / Upscale** | `fal-ai/creative-upscaler` | Super-resolution | $0.020 | ₹1.86 | **2 Credits** | ₹20.00 – ₹30.00 | **~91%** |

---

### 5. 🎬 Cinematic & Social Video (`cinematic-video` / Video Gem)
Generates high-definition video advertising, social video clips (Reels, TikToks, Shorts), and cinematic narrative sequences across Google GenAI, Fal AI (Kling), and ByteDance (Seedance) video pipelines.

| Model / Quality Tier | Provider Engine / Model ID | Resolution / Length Supported | Provider Est. Cost ($) | Provider Est. Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Profit Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Google Omni 1.1 Flash** | `gemini-omni-1.1-flash`<br>*(Canonical: `google-omni`)* | 720p, 1080p<br>(4s, 6s, 8s, 10s) | $0.065 | ₹6.05 | **20 Credits** | ₹200.00 – ₹300.00 | **~67.5%** |
| **Google Veo 3.1 Pro** | `veo-3.1-generate-preview`<br>*(Canonical: `veo-pro`)* | 720p, 1080p, 4K<br>(4s, 6s, 8s; 1080p/4K = 8s) | $0.220 | ₹20.46 | **40 Credits** | ₹400.00 – ₹600.00 | **~45.0%** |
| **Google Veo 3.1 Fast** | `veo-3.1-fast-generate-preview`<br>*(Canonical: `veo-fast`)* | 720p, 1080p<br>(5s, 7s rapid) | $0.075 | ₹6.98 | **20 Credits** | ₹200.00 – ₹300.00 | **62.5%** |
| **Google Veo 3.1 Lite** | `veo-3.1-lite-generate-preview`<br>*(Canonical: `veo-lite`)* | 720p locked<br>(5s draft mode) | $0.035 | ₹3.26 | **10 Credits** | ₹100.00 – ₹150.00 | **65.0%** |
| **Kling 3.0 Standard** | `fal-ai/kling-video/v3/standard`<br>*(Canonical: `kling-v3`)* | 720p, 1080p<br>(3s, 5s, 10s, 15s) | $0.084 | ₹7.81 | **40 Credits** | ₹400.00 – ₹600.00 | **79.0%** |
| **Seedance 2.0 Cinematic** | `bytedance/seedance-2.0`<br>*(Canonical: `seedance-2`)* | 720p, 1080p<br>(4s–15s, auto) | $0.150 | ₹13.95 | **80 Credits** | ₹800.00 – ₹1,200.00 | **81.0%** |

#### Video Model Billing Rules & Conditioning Constraints:
1. **Google Omni 1.1 Flash (20 Credits)**:
   - Supports multimodal conditioning (up to 3 inline reference images) and conversational video modification (`previous_interaction_id`).
   - Storage & delivery policy: `store: true, delivery: 'uri'` for session continuity. Does not support explicit start/end keyframe interpolation.
2. **Google Veo 3.1 Pro (40 Credits)**:
   - Full motion interpolation between Start Keyframe and End Keyframe.
   - Up to 3 subject consistency reference images.
   - 1080p and 4K outputs enforce 8-second sequence duration.
3. **Google Veo 3.1 Fast (20 Credits)**:
   - Single Start Frame animation or direct text-to-video.
   - End-frame interpolation and subject reference conditioning are bypassed to achieve low latency.
4. **Google Veo 3.1 Lite (10 Credits)**:
   - Lowest-cost draft model designed for instant storyboard prototyping in 720p. Text-to-video only; image references disabled.
5. **Kling 3.0 Standard (40 Credits)**:
   - Start & End frame control, native 1:1 social square format, and element injection (`@Element1` .. `@Element4`).
   - Native audio generation (lip-sync and environmental sound) included in base credit cost.
6. **Seedance 2.0 Cinematic (80 Credits)**:
   - Rich multimodal choreography board: up to 9 image references with semantic roles, up to 3 video guides, and up to 3 audio timing tracks.
   - Native synchronized audio synthesis included with zero auxiliary fee.


---

### 6. 🎙️ Voiceover & Audio Studio (`voiceover-audio` / Audio Gem)
Generates humanlike broadcast voiceovers and original AI musical compositions tailored to brand mood and tempo.

| Audio Service | Provider Engine / Voice Family | Spec / Duration | Provider Cost ($) | Provider Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Voiceover (TTS)** | Google Cloud Neural2 / Studio / Journey | Up to 1,000 characters | $0.008 | ₹0.74 | **2 Credits** | ₹20.00 – ₹30.00 | **~96%** |
| **Two-Speaker Dialog TTS** | Google Cloud Multi-Speaker Journey | Dual voice script | $0.016 | ₹1.49 | **3 Credits** | ₹30.00 – ₹45.00 | **~95%** |
| **Music Clip (Short-Form)** | Google DeepMind Lyria / MusicFX | 30s audio loop/clip | $0.025 | ₹2.33 | **3 Credits** | ₹30.00 – ₹45.00 | **~92%** |
| **Music Pro (Full Track)** | Google DeepMind Lyria Pro | Full track composition | $0.080 | ₹7.44 | **10 Credits** | ₹100.00 – ₹150.00 | **~93%** |
| **Audio Auto-Write Idea** | `gemini-2.5-flash` | Script & brief ideator | $0.0005 | ₹0.05 | **0c (Free)** | In-App Assist | 100% |

---

### 7. 📊 Corporate Presentations (`corporate-presentations` / PPT Gem)
Generates complete, brand-styled enterprise presentation slide decks with structured JSON content compilation, typography matching, and instant `.pptx` / PDF export.

| Action / Model | Provider Engine | Specs | Provider Cost ($) | Provider Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Full Slide Deck Generation** | `gemini-2.5-pro` + PptxGenJS | 5 – 12 slides compiled | $0.045 | ₹4.19 | **10 Credits** | ₹100.00 – ₹150.00 | **~96%** |
| **Slide Content Regeneration** | `gemini-2.5-flash` | Single slide rewrite | $0.002 | ₹0.19 | **1 Credit** | ₹10.00 – ₹15.00 | **~98%** |

---

### 8. 📖 Storyline Generator (`storyline-generator` / Storyline Gem)
Breaks narrative arcs into keyframe storyboards, scene prompts, and multi-asset sequences with downloadable ZIP archives.

| Action / Model | Provider Engine | Specs | Provider Cost ($) | Provider Cost (₹) | User Credits Charged | Effective User Value (₹) | Gross Margin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Story Arc & Storyboard Compilation** | `gemini-2.5-pro` + `fal-ai/flux/schnell` | Narrative + keyframe prompts | $0.055 | ₹5.12 | **15 Credits** | ₹150.00 – ₹225.00 | **~97%** |

---

## 3. 💳 Top-Up Booster Packs (On-Demand)

Users who experience a credit shortfall or need extra capacity without changing their monthly plan can purchase immediate booster packs via Razorpay.

| Booster Pack Name | Credits Granted | Price (INR) | Price (USD) | Effective Cost / Credit | Output Equivalence | Primary Target Use Case |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Starter Booster** | **100 Credits** | **₹1,500** | **$17** | ₹15.00 / $0.17 | 50 Fast Images or 10 Fast Videos or 20 Strategies | Immediate task unblocking; rapid top-up |
| **Power Booster** *(Most Popular)* | **500 Credits** | **₹6,250** | **$66** | ₹12.50 / $0.13 | 250 Fast Images or 50 Fast Videos or 20 Full Decks | Medium agency workflow; active campaigns |
| **Super Booster** *(Max Saver)* | **1,100 Credits** | **₹11,000** | **$115** | ₹10.00 / $0.10 | 550 Fast Images or 110 Fast Videos or 110 Strategies | High-volume studios; 100 bonus credits included |

---

## 4. 🏢 Subscription Plans & Tiers

Subscriptions grant monthly recurring credit allowances, seat limits, and storage retention windows. All plans support both Monthly and Annual (with 10% discount) billing.

| Plan Tier | Monthly Price | Annual Price (per month) | Monthly Credits | Annual Credits (Total/yr) | Cost / Credit | Seats | Storage & Retention | Dedicated Support |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Free Starter** | **₹0 / $0** | **₹0 / $0** | **50 Credits** *(one-time)* | — | Free | 1 User | 250 MB / 7 days | Community |
| **Pilot Tier** | **₹1,950 / $22** | **₹1,755 / $19.80** *(₹21,060 / $237.60 billed annually)* | **130 Credits** | **1,560 Credits** | ₹15.00 / $0.11 | 1 User | 1 GB / 1 Month | Standard Email |
| **Plus Tier** *(Growth)* | **₹10,000 / $106** | **₹9,000 / $95.40** *(₹108,000 / $1,144.80 billed annually)* | **800 Credits** | **9,600 Credits** | ₹12.50 / $0.12 | 3 Users | 5 GB / 3 Months | Priority Queue |
| **Pro Tier** *(Best Value)* | **₹25,000 / $265** | **₹22,500 / $238.50** *(₹270,000 / $2,862 billed annually)* | **2,500 Credits** | **30,000 Credits** | ₹10.00 / $0.10 | 5 Users | 100 GB / 6 Months | Dedicated Account Mgr |
| **Enterprise Tier** | **Custom Quote** | **Custom Quote** | **Custom / Unlimited** | Custom | Negotiated | Unlimited | Unlimited / Infinite | 24/7 Dedicated + Team Training |

---

## 5. 🛡️ Operational Guardrails & Invariants

1. **Atomic Two-Phase Reservations**:
   - `reserve_credits_for_ai`: Performs row-lock on PostgreSQL `credit_balances` using `SELECT ... FOR UPDATE`.
   - On success: Hold is finalized into permanent `credit_ledger` ledger.
   - On provider error or HTTP 402/500 failure: Stored procedure `release_credit_hold` triggers immediately.
   - **Strict Invariant**: User credit balances **NEVER decrease** on failed, cancelled, or aborted operations.
2. **Idempotency Protection**:
   - All generation requests require an `X-Idempotency-Key` or payload UUID. Duplicate incoming network requests return cached generation results without re-billing credits.
3. **No Duplicate Catalog Architecture**:
   - `CREDIT_SERVICE_REGISTRY` in `packages/types/billing.ts` maintains display identities and human-friendly titles only.
   - The authoritative credit deduction is determined exclusively by the server-side Gem/model resolver, ensuring zero discrepancy between client and backend.
4. **Context-Preserving Credit Gating**:
   - When a balance shortfall occurs, the server responds with standardized HTTP 402 (`INSUFFICIENT_CREDITS`).
   - The frontend `CreditGateContext` retains draft inputs, active route, and active gem in memory while routing the user to `CreditTopUp`. Upon top-up completion, users are safely returned to their exact active context with 1 click.

