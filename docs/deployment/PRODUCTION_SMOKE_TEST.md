# WRITOPEDIA PRODUCTION SMOKE TEST CHECKLIST
**Target Deployment:** `https://ai.writopedia.com`  
**Execution Phase:** Post-Preview / Pre-Cutover Verification

---

## 1. Public Routes & Navigation
- [ ] Direct browser navigation to `https://ai.writopedia.com/` renders landing page without console errors.
- [ ] Direct browser navigation to `https://ai.writopedia.com/pricing` renders plans and credit matrices accurately.
- [ ] Direct browser navigation to `https://ai.writopedia.com/legal` renders terms and privacy documentation.
- [ ] Deep refresh (F5 / Cmd+R) on `/pricing` does not trigger a Vercel 404.

---

## 2. Authentication & Verification
- [ ] **Sign Up:** Create a test user account with email/password.
- [ ] **Email Verification Route:** Verify that clicking the confirmation link redirects to `https://ai.writopedia.com/auth/callback` and activates session.
- [ ] **Unverified Access Protection:** Verify that unverified accounts cannot access `/workspace` and are routed to `/verify-email`.
- [ ] **Log In / Log Out:** Verify session establishment and clean session termination.
- [ ] **Password Recovery:** Request a password reset email and verify the reset token redirects correctly to `https://ai.writopedia.com`.
- [ ] **OAuth Authentication:** Test Google OAuth sign-in and ensure redirect returns to `https://ai.writopedia.com/auth/callback`.

---

## 3. Brand Intelligence
- [ ] Navigate to `/brand-init`.
- [ ] Run Brand Intelligence analysis on a public URL.
- [ ] Confirm Gemini multimodal extraction parses brand voice, color palette, and pillars.
- [ ] Save brand guidelines and confirm persistence to Supabase `brand_guidelines` table.
- [ ] Confirm guidelines load into workspace context.

---

## 4. Studio Workspace Operations
- [ ] **Image Generation:** Submit prompt and verify generated image is delivered and stored in Supabase `user-assets`.
- [ ] **Video Generation:** Submit video prompt. Verify job status progresses (`queued` -> `generating_motion` -> `completed`).
- [ ] **Presentation Generator:** Generate a 5-slide corporate deck. Verify slides render in real-time.
- [ ] **Presentation Export:** Trigger PPTX and PDF export. Verify export progress and download the finished presentation files.
- [ ] **Campaign Strategist:** Generate a multi-channel campaign strategy.

---

## 5. Asset Library & Storage
- [ ] Navigate to `https://ai.writopedia.com/assets`.
- [ ] Direct upload of an image asset (PNG/JPG) up to 10MB.
- [ ] Direct upload of a document asset (PDF) up to 50MB.
- [ ] Verify signed URL delivery for asset preview and secure download.
- [ ] Delete an asset and verify removal from both Supabase database and storage bucket.

---

## 6. History & Ledger
- [ ] Navigate to `/history/creative` and verify creative job history displays with accurate thumbnails.
- [ ] Navigate to `/history/credits` and verify ledger entries match credit debits and balance grants.

---

## 7. Human Touch Creative Curation
- [ ] Submit a Human Touch curation request from the studio.
- [ ] As an admin, navigate to `/admin` -> **Curation**.
- [ ] Review the request and attach a completed deliverable.
- [ ] Mark request **Completed**.
- [ ] Confirm completion email is dispatched via Resend to the requesting user (not the admin).
- [ ] Confirm email link directs to `https://ai.writopedia.com/assets`.
- [ ] Double-click "Complete" to verify email idempotency (zero duplicate emails dispatched).

---

## 8. Razorpay Billing & Webhooks
- [ ] Initiate Starter Booster checkout modal via Razorpay.
- [ ] Complete test payment in Razorpay checkout.
- [ ] Confirm immediate client-side payment verification call (`/api/billing/verify-payment`).
- [ ] Verify webhook receipt at `/api/billing/webhook` with HMAC-SHA256 signature check.
- [ ] Confirm credit balance is credited exactly once in `workspace_credits` and `credit_ledger`.

---

## 9. Admin Console & Security
- [ ] Navigate to `https://ai.writopedia.com/admin` as an unauthorized user -> verify 403 / Redirect.
- [ ] Log in with authorized admin credentials -> verify access to **Overview**, **Curation**, **Payments**, **Activity**, and **Settings**.
- [ ] In **Payments**, verify transactions reflect actual orders with zero PAN/CVV or secret key exposure.
- [ ] In **Activity**, verify system audit logs display structured actor/action events.

---

## 10. API & Background Worker Health
- [ ] `GET https://ai.writopedia.com/api/health` returns HTTP 200 `{ "status": "ok", "service": "writopedia-api" }`.
- [ ] In Railway Dashboard -> verify internal healthcheck (`/health` on `$PORT`) passed and container status is "Active" with zero crash loops.
