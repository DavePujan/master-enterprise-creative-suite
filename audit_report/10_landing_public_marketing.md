# Domain 10: Landing & Public Marketing Portal - Verification Report

## Verification Methodology
- Grepped `apps/web/src/features/marketing` and `apps/web/src/features/billing` for pricing logic, checking how product costs are resolved and displayed.
- Examined `PricingPage.tsx` and `EnterprisePlan.tsx` to verify if they share a centralized source of truth for pricing strings and numerical amounts.

## Findings Verification

### 1. Pricing Information Can Become Desynchronized
- **Audit Claim:** Landing-page pricing and pricing-page/checkout information are not guaranteed to share one source of truth.
- **Status:** **TRUE**
- **Evidence:** Code analysis reveals that numerical pricing logic is entirely hardcoded multiple times across different React components. For example, the `1950` INR Pilot plan is hardcoded in `PricingPage.tsx` (`amount: curr === 'INR' ? 1950 : 22`) and independently duplicated again in `EnterprisePlan.tsx` (`createRazorpayOrder(1950, ...)`). Because there is no centralized `pricingConfig.ts` or database-driven Stripe/Razorpay product registry, updating a price requires hunting down and manually synchronizing multiple frontend files.

### 2. Product Demonstration Coverage Is Limited
- **Audit Claim:** The public portal lacks strong live demonstrations and visual proof of the creative workflows.
- **Status:** **TRUE**
- **Evidence:** The `LandingPage.tsx` relies exclusively on static Lucide icons (e.g., `<Rocket>`, `<Star>`, `<Sparkles>`) and textual marketing copy to describe features. There are no interactive workspace iframes, embedded video walk-throughs, or dynamic showcase components that visually demonstrate the platform's multi-modal capabilities to unauthenticated users.

### 3. Responsive Layout Has Vertical Constraints
- **Audit Claim:** Some layouts can become cramped on laptops and smaller screens.
- **Status:** **TRUE**
- **Evidence:** The application layout uses restrictive vertical constraints (e.g., `h-screen` with `overflow-hidden`) that prevent natural scrolling on smaller laptop displays. When complex UI components like the video director or pricing tables stack vertically, they overflow their containers or become un-scrollable without utilizing flexible `min-h-screen` patterns.
