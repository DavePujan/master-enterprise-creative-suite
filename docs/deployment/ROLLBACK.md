# PRODUCTION ROLLBACK PROCEDURE
**Target Application:** `https://ai.writopedia.com`  
**Scope:** Contingency recovery instructions in the event of unforeseen post-cutover issues.

---

## 1. Instant Vercel Rollback (< 60 Seconds)

If a critical blocker is detected on the frontend or serverless API after cutover:

1. Log in to the [Vercel Dashboard](https://vercel.com).
2. Navigate to the project powering `ai.writopedia.com`.
3. Open the **Deployments** tab.
4. Locate the **previous stable deployment** (the deployment that was active immediately prior to cutover).
5. Click the three-dot menu `...` next to that deployment and select **Instant Rollback**.
6. Confirm the rollback. Vercel will instantly route 100% of incoming traffic for `ai.writopedia.com` back to the previous deployment.

---

## 2. Railway Background Worker Rollback (< 2 Minutes)

If the background worker experiences critical failures on Railway:

1. Log in to the [Railway Dashboard](https://railway.com).
2. Open the `writopedia-worker` service.
3. Click the **Deployments** tab.
4. Select the previously active deployment and click **Redeploy**.
5. Alternatively, scale the worker down to 0 replicas if job processing must be temporarily paused while investigating upstream provider issues.

---

## 3. Database Compatibility & Safety Invariant

> [!CAUTION]
> **DO NOT ROLL DATABASE MIGRATIONS BACKWARD.**

- All Supabase migrations introduced in this codebase are strictly **additive** (new tables, new nullable columns, non-breaking indexes).
- No columns or tables from the previous production deployment were dropped or modified destructively.
- The older production code will continue to function correctly against the database without running down-migrations.
- Rolling back database schema risks data loss for users who signed up or generated content during the cutover window.

---

## 4. External Service Considerations

- **Razorpay:**
  - If rolling back, do NOT rotate `RAZORPAY_KEY_SECRET` or change the webhook URL unless the webhook secret itself was compromised. The webhook endpoint `/api/billing/webhook` is compatible across versions.
- **Supabase Auth:**
  - The redirect URLs (`https://ai.writopedia.com/*` and `https://ai.writopedia.com/auth/callback`) are valid for both old and new codebases. Do not alter them during a rollback.
- **Resend:**
  - Sending domain verification on `writopedia.com` remains valid regardless of application deployment version.

---

## 5. Post-Rollback Diagnostics

1. Check Vercel Function logs under Deployments -> Functions.
2. Check Railway Worker logs for crash callstacks.
3. Check Supabase table `ai_generation_jobs` for recent error codes (`error_code`, `error_message`).
4. Re-verify billing idempotency logs in Supabase table `billing_orders` and `credit_holds`.
