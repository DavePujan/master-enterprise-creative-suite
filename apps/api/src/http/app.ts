/**
 * Express Application Setup & Route Registry.
 * Enforces unified middleware chain: CORS allowlist -> Auth -> Rate limiting -> Domain routers.
 */

import express, { type Express } from "express";
import helmet from "helmet";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { errorHandler } from "../middleware/errorHandler.js";
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
import { presentationRouter } from "../modules/presentation/presentationRoutes.js";
import { videoRouter } from "../modules/videoGeneration/videoRoutes.js";
import { adDirectorRouter } from "../modules/adDirector/adDirectorRoutes.js";

import { logSecurityEvent } from "../services/securityAuditService.js";

/**
 * Strict allowlist of trusted origins for credentialed Cross-Origin Resource Sharing (CORS).
 * Strictly excludes arbitrary *.vercel.app subdomains.
 * Allows Writopedia-owned canonical domains, development loopbacks, and explicit environment-configured origins.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // 1. Development loopbacks
  if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return true;
  }

  // 2. Canonical production domain
  if (origin === "https://writopedia.com") {
    return true;
  }

  // 3. Authorized Writopedia subdomains (e.g., https://ai.writopedia.com)
  if (/^https:\/\/[a-z0-9-]+\.writopedia\.com$/.test(origin)) {
    return true;
  }

  // 4. Configurable explicit allowlist via ALLOWED_ORIGINS (comma-separated exact matches)
  const envAllowed = process.env.ALLOWED_ORIGINS;
  if (envAllowed) {
    const list = envAllowed.split(",").map((s) => s.trim().toLowerCase());
    if (list.includes(origin.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function createExpressApp(): Express {
  const app = express();

  // Trust first reverse proxy hop (Vercel / Railway) for reliable client IP extraction
  app.set("trust proxy", 1);

  // 1. Explicit CORS configuration (never wildcard with credentials)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isOriginAllowed(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else if (origin && !isOriginAllowed(origin)) {
      // Best-effort audit log for blocked origins attempting CORS access
      logSecurityEvent(req, {
        eventType: "CORS_ORIGIN_BLOCKED",
        severity: "medium",
        route: req.originalUrl?.split("?")[0] || req.path,
        method: req.method,
        reason: `Origin "${origin}" is not in the authorized CORS allowlist`,
        metadata: { origin }
      }).catch(() => {});
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });

  // 1B. Standard HTTP Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "https://*.writopedia.com"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://checkout.razorpay.com",
            "https://apis.google.com"
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
          mediaSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "https://*.supabase.co",
            "wss://*.supabase.co",
            "https://api.razorpay.com",
            "https://generativelanguage.googleapis.com",
            "https://*.fal.run",
            "https://fal.run",
            "https://*.writopedia.com",
            "http://localhost:*",
            "http://127.0.0.1:*"
          ],
          frameSrc: [
            "'self'",
            "https://api.razorpay.com",
            "https://checkout.razorpay.com",
            "https://accounts.google.com"
          ],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      xFrameOptions: { action: "deny" },
      xContentTypeOptions: true,
      hsts:
        process.env.NODE_ENV === "production"
          ? { maxAge: 31536000, includeSubDomains: true }
          : false
    })
  );

  // 1C. Centralized Production Error Masking Interceptor (Guarantees zero internal error leakage on 500s)
  app.use((_req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      const origJson = res.json;
      res.json = function (body: any) {
        if (res.statusCode >= 500 && body && typeof body === "object" && typeof body.error === "string") {
          body.error = "An internal server error occurred.";
          body.code = body.code || "INTERNAL_SERVER_ERROR";
        }
        return origJson.call(this, body);
      };
    }
    next();
  });

  // 2. JSON and URL-encoded payload parsers with rawBody capture for cryptographic signature verification
  app.use(
    express.json({
      limit: "50mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // 2B. Lightweight API Health Check Probes (public, lightweight)
  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ status: "ok", service: "writopedia-api", timestamp: new Date().toISOString() });
  });

  // 3. Centralized Authentication Middleware (Default-Deny)
  app.use("/api", authMiddleware);

  // 4. Mount Domain Module Routers with Route-Specific Rate Limiters
  app.use("/api/ai", aiRateLimiter, aiRouter);
  app.use("/api/images", aiRateLimiter, imageRouter);
  app.use("/api/text", aiRateLimiter, textRouter);
  app.use("/api/audio", aiRateLimiter, audioRouter);
  app.use("/api/video", aiRateLimiter, videoRouter);
  app.use("/api/ad-director", aiRateLimiter, adDirectorRouter);
  app.use("/api/presentation", aiRateLimiter, presentationRouter);
  app.use("/api/campaign", aiRateLimiter, campaignRouter);
  // Webhooks are HMAC-verified server-to-server calls and must not be throttled by client rate limits
  app.use(
    "/api/payment",
    (req, res, next) => {
      if (req.path === "/webhook") return next();
      return billingRateLimiter(req, res, next);
    },
    billingRouter
  );
  app.use("/api/contact-sales", salesRateLimiter, salesRouter);
  app.use("/api/brand-guidelines", brandRouter);
  app.use("/api/history", historyRouter);
  app.use("/api/assets", assetRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/workspaces", workspaceRouter);
  app.use("/api", humanTouchRouter);
  app.use("/api", proxyRateLimiter, proxyRouter);

  // 5. Centralized Production Error Handler (Default-Mask in Production)
  app.use(errorHandler);

  return app;
}
