# Production Deployment Documentation Index

This directory centralizes all operational, verification, cutover, and disaster recovery procedures for deploying Writopedia to **Vercel + Supabase**.

---

## 📑 Documents & Guides

| Document | Purpose | Scope |
| :--- | :--- | :--- |
| **[DEPLOYMENT.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/DEPLOYMENT.md)** | Core Deployment Blueprint | Architecture, environment configuration, serverless API constraints, and Railway background worker deployment. |
| **[VERCEL_READINESS_REPORT.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/VERCEL_READINESS_REPORT.md)** | Production Readiness Audit | Detailed technical audit of frontend, backend, routing, security, dependencies, and environment parity. |
| **[PRODUCTION_CUTOVER.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/PRODUCTION_CUTOVER.md)** | 19-Step Cutover Runbook | Pre-cutover guardrails, staging preview, DNS validation for `ai.writopedia.com`, and cutover execution. |
| **[PRODUCTION_SMOKE_TEST.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/PRODUCTION_SMOKE_TEST.md)** | Post-Deployment Verification | Step-by-step test matrix covering auth, billing, credit mutations, AI generation, proxy SSRF checks, and media exports. |
| **[ROLLBACK.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/ROLLBACK.md)** | Emergency Recovery & Rollback | < 60-second instant redeployment procedure, Supabase state isolation, and incident communication protocol. |

---

## 🎯 Target Production Environment

- **Production URL**: `https://ai.writopedia.com`
- **Frontend & API Hosting**: Vercel (`Node.js 22.x`, serverless Express handler)
- **Authoritative Backend**: Supabase (Auth, PostgreSQL + RLS, Storage)
- **Background Worker**: Dedicated Containerized Worker on Railway (`Dockerfile.worker`)
