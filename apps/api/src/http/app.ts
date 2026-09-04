/**
 * Express Application Setup & Route Registry.
 * Enforces unified middleware chain: CORS allowlist -> Auth -> Rate limiting -> Domain routers.
 */

import express, { type Express } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { aiRateLimiter, billingRateLimiter, proxyRateLimiter, salesRateLimiter } from "../middleware/rateLimiter.js";
import { aiRouter } from "../modules/ai/aiRoutes.js";
import { campaignRouter } from "../modules/campaigns/campaignRoutes.js";
import { billingRouter } from "../modules/billing/billingRoutes.js";
import { humanTouchRouter } from "../modules/humanTouch/humanTouchRoutes.js";
import { salesRouter } from "../modules/sales/salesRoutes.js";
import { proxyRouter } from "../modules/proxy/proxyRoutes.js";
import { brandRouter } from "../modules/brand/brandRoutes.js";
import { historyRouter } from "../modules/history/historyRoutes.js";
import { assetRouter } from "../modules/assets/assetRoutes.js";
import { adminRouter } from "../modules/admin/adminRoutes.js";
import { workspaceRouter } from "../modules/workspaces/workspaceRoutes.js";
import { imageRouter } from "../modules/imageGeneration/imageRoutes.js";
import { textRouter } from "../modules/textGeneration/textRoutes.js";
import { audioRouter } from "../modules/audioGeneration/audioRoutes.js";

const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/writopedia\.com$/,
  /^https:\/\/[a-z0-9-]+\.writopedia\.com$/
];

export function createExpressApp(): Express {
  const app = express();

  // 1. Explicit CORS configuration (never wildcard with credentials)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });


  // 2. JSON and URL-encoded payload parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // 3. Centralized Authentication Middleware (Default-Deny)
  app.use("/api", authMiddleware);

  // 4. Mount Domain Module Routers with Route-Specific Rate Limiters
  app.use("/api/ai", aiRateLimiter, aiRouter);
  app.use("/api/images", aiRateLimiter, imageRouter);
  app.use("/api/text", aiRateLimiter, textRouter);
  app.use("/api/audio", aiRateLimiter, audioRouter);
  app.use("/api/campaign", aiRateLimiter, campaignRouter);
  app.use("/api/payment", billingRateLimiter, billingRouter);
  app.use("/api/contact-sales", salesRateLimiter, salesRouter);
  app.use("/api/brand-guidelines", brandRouter);
  app.use("/api/history", historyRouter);
  app.use("/api/assets", assetRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/workspaces", workspaceRouter);
  app.use("/api", humanTouchRouter);
  app.use("/api", proxyRateLimiter, proxyRouter);

  return app;
}
