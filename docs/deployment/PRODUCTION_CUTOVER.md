# PRODUCTION CUTOVER EXECUTION PLAN
**Target Application Domain:** `https://ai.writopedia.com`  
**Corporate Domain:** `https://writopedia.com` *(DO NOT MODIFY)*  
**Objective:** Replace the legacy deployed code at `ai.writopedia.com` with this repository as the sole production source of truth.

---

## Pre-Cutover Safety Guardrails

> [!IMPORTANT]
> - Do not delete the old Vercel deployment before cutover is completed and verified.
> - Do not modify DNS records for `writopedia.com`. The cutover is strictly for `ai.writopedia.com`.
> - Do not perform destructive database schema modifications.

---

## 19-Step Cutover Execution Sequence

### Phase 1: Local & Artifact Verification
1. **Verify Git Branch/Commit:**
   - Ensure you are deploying from clean commit on `main` (or approved release branch).
2. **Verify Repository Build:**
   - Execute: `npm run check:boundaries && npm run lint && npm run test:billing && npm run build`
   - Confirm all suites pass with 0 errors.
3. **Verify Worker Build:**
   - Confirm `dist/worker.cjs` builds cleanly via `npm run build:worker`.

### Phase 2: External Infrastructure Verification
4. **Verify Supabase Settings:**
   - Confirm Site URL is set to `https://ai.writopedia.com`.
   - Confirm Redirect URLs contain `https://ai.writopedia.com/*` and `https://ai.writopedia.com/auth/callback`.
5. **Verify Vercel Environment Variables:**
   - In the existing Vercel project for `ai.writopedia.com`, check that all 12 production environment variables from `.env.example` are configured (both Client `VITE_*` and Server variables).
6. **Configure Persistent Worker on Railway:**
   - Deploy `Dockerfile.worker` as `writopedia-worker` on Railway.
   - Set worker variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `FAL_KEY`.
   - Confirm worker internal health check passes at `/health` (orchestrated by Railway via internal container probe; no public domain required).

### Phase 3: Preview Deployment & Staging Validation
7. **Connect Current Repository to Vercel Project:**
   - In Vercel Project Settings -> Git, link `DavePujan/master-enterprise-creative-suite`.
8. **Deploy Vercel Preview:**
   - Trigger a preview build on a staging branch.
9. **Execute Smoke Test Suite:**
   - Complete all tests in [PRODUCTION_SMOKE_TEST.md](file:///c:/zz_ALL/z_Project/Writopedia/docs/deployment/PRODUCTION_SMOKE_TEST.md).
10. **Compare Critical Behavior:**
    - Verify user authentication, credit balance retrieval, and workspace loading match expectations.

### Phase 4: Production Deployment & Cutover
11. **Prepare Production Environment:**
    - Set `RAZORPAY_MODE=live` in Vercel Production Environment Variables.
12. **Deploy to Production:**
    - Merge to production branch (`main`) or promote the preview build to Production in Vercel.
13. **Verify `https://ai.writopedia.com`:**
    - Test direct navigation to `/`, `/pricing`, `/login`, `/workspace`, and `/assets`.
14. **Verify Razorpay Webhook:**
    - Confirm Razorpay Dashboard Webhook URL points to `https://ai.writopedia.com/api/billing/webhook`.
    - Send test ping from Razorpay Dashboard and verify 200 response.
15. **Verify Supabase Auth Callbacks:**
    - Perform test login and confirm session tokens are stored and refreshed properly.
16. **Verify Transactional Emails:**
    - Submit a test support ticket and confirm delivery via Resend.
17. **Monitor Real-Time Logs:**
    - Monitor Vercel Function logs and Railway Worker logs for any unhandled exceptions or timeout warnings.

### Phase 5: Post-Cutover Stabilization
18. **Retain Old Deployment for Rollback:**
    - Keep the previous production deployment pinned in Vercel for at least 72 hours.
19. **Decommissioning Legacy Code:**
    - Only archive or deprecate older codebase references after 72 hours of uninterrupted production stability.
