# Token Usage Architecture & Costing (INR)

This document outlines the token budget and real-world cost estimation in Indian Rupees (INR) for the Studio AI application.

## 💸 Economic Overview
Studio AI leverages Google's Gemini models for high-impact brand intelligence. Prices below are calculated based on a premium exchange rate as requested.
**Current Exchange Rate**: 1 USD = ₹93.00

### 🟢 Model Unit Costs
| Model Tier | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) |
| :--- | :--- | :--- |
| **Gemini 1.5 Flash** (Standard) | **₹6.975** ($0.075) | **₹27.90** ($0.30) |
| **Gemini 1.5 Pro** (High Quality) | **₹116.25** ($1.25) | **₹465.00** ($5.00) |

---

## 📥 Input Stage (Context Costing)

### 1. Fixed Context Overhead (~500 - 800 Tokens)
Static instructions including system persona, brand guidelines, and JSON schemas.
- **Cost (Flash Tier)**: ~₹0.0035 - ₹0.0056 per request.
- **Cost (Pro Tier)**: ~₹0.058 - ₹0.093 per request.

### 2. Multi-modal Context & Visual Analysis
Visual assets require specialized processing tokens.
- **Image/Logo Processing**: Fixed at **~258 tokens** per image.
- **Cost (Flash Tier)**: **₹0.0018** per image.
- **Cost (Pro Tier)**: **₹0.030** per image.

---

## 📊 Estimated Total Cost per Feature (Standard Flash)

| Feature Service | Avg. Input Tokens | Avg. Output Tokens | Total Est. Cost (INR) |
| :--- | :---: | :---: | :--- |
| **Social Caption Pack** | 600 | 800 | **₹0.027** |
| **Strategy & Reasoning**| 800 | 1,200 | **₹0.039** |
| **Initial Brand Setup** | 200 | 1,500 | **₹0.043** |
| **Agentic Campaign Mix**| 3,000 | 5,000 | **₹0.160** |

---

## 🧠 Model Logic & Optimization
- **Efficiency Layer**: **Gemini 1.5 Flash** is the default workhorse for 95% of tasks, keeping average campaign generation costs under ₹0.20 per run.
- **Intelligence Layer**: **Gemini 1.5 Pro** provides deeper nuance for complex strategy docs at roughly **16.6x** the cost profile.
- **Context Window**: Both models support up to 1M+ tokens, allowing massive document uploads (brand bibles, market research) for highly grounded results.

---

## 🛡 Quota & Operational Guardrails
- **Backoff Handling**: The system automatically retries on 429 errors using an exponential backoff strategy (up to 5 retries).
- **Cost Control**: Users can switch between standard and high-quality models via the Settings menu to manage their credit burn rate.
