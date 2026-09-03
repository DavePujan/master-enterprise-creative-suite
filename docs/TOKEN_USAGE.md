# Token Usage Architecture & Costing (INR & Credits)

This document outlines the token budget, real-world cost estimation, and user credit deduction schedules for the Studio AI application.

---

## 🎨 Image Generation Credit Deduction Schedule

Image generation uses a two-phase credit hold reservation (`credit_holds`) in PostgreSQL, capturing upon verified generation and permanent Supabase Storage archival. Unsuccessful requests automatically release held credits with zero net deduction.

Credit rates are set strictly between **2 and 5 credits** based on provider inference compute:

| Model Product Key | Provider Model ID | Quality Tier | Credits Deducted | Est. Provider Cost | Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **`flux-schnell`** | `fal-ai/flux/schnell` | Fast | **2 Credits** | ~$0.003 | 4-step rapid photorealistic diffusion |
| **`gemini-preview`** | `gemini-2.5-flash-image` | Fast | **2 Credits** | ~$0.015 | Rapid multimodal concept ideation |
| **`nano-banana-2`** | `fal-ai/nano-banana-2` | Fast | **2 Credits** | ~$0.015 | Fast next-gen creative diffusion with resolution scaling |
| **`fal-studio`** | `openai/gpt-image-2` | Standard | **3 Credits** | ~$0.030 | High-fidelity commercial advertising visual engine |
| **`flux-pro`** | `fal-ai/flux/dev` | Premium | **4 Credits** | ~$0.045 | 28-step high-detail commercial advertising render |

---

## 💸 Economic Overview
Studio AI leverages Google's Gemini models for text reasoning and strategy intelligence, alongside Fal AI and Google for image synthesis.
**Current Exchange Rate**: 1 USD = ₹93.00

### 🟢 Text Model Unit Costs
| Model Tier | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | User Credits |
| :--- | :--- | :--- | :---: |
| **Gemini 2.5 Flash** (Standard) | **₹6.975** ($0.075) | **₹27.90** ($0.30) | 1c |
| **Gemini 2.5 Pro** (High Quality) | **₹116.25** ($1.25) | **₹465.00** ($5.00) | 5c |

---

## 📥 Context Stage Overhead
- **Static Context Overhead**: ~500 - 800 tokens (system instructions, brand guidelines, and schema enforcement).
- **Multi-modal Image Processing**: ~258 tokens per reference asset.

---

## 🛡 Credit Safety & Operational Guardrails
- **Two-Phase Holds**: Credits are reserved upfront via PostgreSQL `reserve_credits_for_ai` RPC. If generation succeeds, the hold is captured and immutably ledgered in `credit_ledger`. If provider generation fails or times out, `release_credit_hold` releases the reservation immediately.
- **Idempotency Protection**: Every generation request accepts an `X-Idempotency-Key` header, preventing duplicate credit deductions during network retries or tab reloads.
- **Model-Aware Capability Enforcement**: Invalid requests (e.g., requesting facial identity conditioning on models that do not support it) are rejected at validation time with HTTP 400 with 0 credit deduction.
