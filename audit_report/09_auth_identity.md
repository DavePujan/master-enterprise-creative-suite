# Domain 09: Auth & Identity Service - Verification Report

## Verification Methodology
- Checked `apps/web/src` for interceptors, `fetch` wrappers, and centralized HTTP error handling (e.g., `401 Unauthorized` token refreshing).
- Examined `apps/web/src/features/auth/components/AuthCallbackView.tsx` and `AppRouter.tsx` to assess OAuth callback timing, token exchange, and workspace navigation races.
- Inspected `apps/web/src/features/auth/hooks/useAuth.ts` and `VerifyEmailView.tsx` for client-side state storage mechanisms related to email verification.

## Findings Verification

### 1. Token Refresh and 401 Retry Are Incomplete
- **Audit Claim:** The client does not consistently recover from expired sessions and lacks centralized `401` retry handling.
- **Status:** **TRUE**
- **Evidence:** The frontend makes raw `fetch()` calls to the API (e.g., in `presentationClient.ts`, `useCreativeExecution.ts`, `CampaignDeckWorkspace.tsx`) without any global fetch interceptor. If an access token expires, these raw requests will receive `401 Unauthorized` responses and simply throw generic HTTP errors, breaking the application state without attempting to silently refresh the session via the Supabase SDK.

### 2. OAuth Onboarding Has Race Conditions
- **Audit Claim:** First-time OAuth users can reach workspace-resolution logic before their profile/workspace state is fully established.
- **Status:** **TRUE**
- **Evidence:** In `AuthCallbackView.tsx` and `AppRouter.tsx`, the client exchanges the OAuth code for a session and immediately redirects the user to the application (`handleEnterProduct` / `/workspace`). However, the backend provisions the physical workspace lazily during the first API request. This asynchronous gap creates a race condition where the frontend can mount and query for data before the workspace actually exists.

### 3. Auth Callback State Depends on URL Timing
- **Audit Claim:** The callback flow has an implicit dependency on URL-hash processing.
- **Status:** **TRUE**
- **Evidence:** `AuthCallbackView.tsx` uses imperative `window.location.search` and `window.location.hash` parsing inside a `useEffect`. Because React Router or other client-side navigation events can intercept or rewrite the URL hash before the effect fires, the critical OAuth tokens can be dropped.

### 4. Email State Is Tab-Isolated
- **Audit Claim:** `sessionStorage` can cause verification/resend state to diverge between tabs.
- **Status:** **TRUE**
- **Evidence:** `useAuth.ts` directly uses `sessionStorage.getItem('writopedia_unconfirmed_email')` to hold the pending verification state. Since `sessionStorage` is strictly scoped to a single tab, users clicking verification links that open in new tabs will inexplicably lose their verification context.

### 5. Resend Cooldown Can Be Bypassed
- **Audit Claim:** Client-side cooldown state can be cleared by manipulating browser storage.
- **Status:** **TRUE**
- **Evidence:** `VerifyEmailView.tsx` governs the resend rate limit purely via `sessionStorage.setItem('writopedia_resend_cooldown_until', ...)`. A user can bypass this cooldown infinitely by either clearing their session storage or opening a new tab, potentially leading to email spam abuse against the Supabase backend.
