PHASE 1 — Critical authorization
├── IDOR
├── workspace isolation
├── presentation isolation
├── video-job isolation
├── export isolation
├── admin escalation
└── storage isolation

PHASE 2 — Authentication
├── session/token tests
├── password reset
├── OAuth
├── logout/revocation
└── account lifecycle

PHASE 3 — Business logic
├── credit race
├── replay
├── negative/overflow values
├── generation abuse
├── export abuse
└── membership/invite abuse

PHASE 4 — Input/API
├── SQL injection
├── XSS
├── mass assignment
├── SSRF
├── path traversal
├── file upload
└── parameter tampering

PHASE 5 — AI security
├── prompt injection
├── indirect prompt injection
├── system-prompt leakage
├── cross-user data leakage
├── tool abuse
└── AI cost abuse

PHASE 6 — Infrastructure
├── CORS
├── headers
├── TLS
├── secrets
├── dependency vulnerabilities
├── debug endpoints
└── Vercel/Supabase configuration

PHASE 7 — Resilience
├── rate limits
├── concurrency
├── resource exhaustion
├── webhook replay
└── monitoring/alerting