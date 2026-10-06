# AI Agent Platform: 04 — Orchestration & Model Fallback Architecture

## Orchestration Flowchart

```
                            [User Request]
                                   │
                                   ▼
                   [Campaign Orchestrator Stage]
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
          (Grounding Enabled)            (Grounding Disabled)
                   │                               │
                   ▼                               ▼
       Gemini 3.x Search + JSON          Structured JSON Prompt
                   │                               │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                      [Model Invocation Chain]
             gemini-3.8-flash (Primary GA)
                     │ 503 / 429
                     ▼
             gemini-3.7-flash (Secondary)
                     │ 503 / 429
                     ▼
             gemini-3.5-flash (Tertiary)
                     │ 503 / 429
                     ▼
             gemini-3.5-flash-lite (Cost / Fast Fallback)
                     │ 503 / 429
                     ▼
             gemini-2.5-flash (Legacy Escape Hatch)
                                   │
                                   ▼
                        [Output Validation]
                     Zod Schema / Type Guards
                                   │
                                   ▼
                   [Database & State Persistence]
                 videoAdProjectRepository / Cache
```

## Resilience Controls
1. **In-Memory Quota Caching**: Daily exhausted models (`RESOURCE_EXHAUSTED`) are cached in `exhaustedModels` map, bypassing repeated 15–30s timeouts.
2. **Key Pool Rotation**: Dual API key pool with automatic round-robin rotation on HTTP 429.
3. **Structured Validation**: Gateway validates output shape and degrades safely to prompt-mode JSON if an SDK tool constraint fails.
