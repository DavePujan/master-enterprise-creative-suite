/**
 * Production-Hardened Authentication & Authorization Middleware.
 * Enforces strict Default-Deny policy across all server endpoints using the Universal Auth Bridge.
 * Zero mock bypasses. Cryptographic bearer token verification is mandatory for all protected routes.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken, type AuthContextUser } from "../infrastructure/supabase/serverAuth.js";
import { logSecurityEvent } from "../services/securityAuditService.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthContextUser;
      rawBody?: Buffer;
    }
  }
}

// Explicitly allowlisted public endpoints (landing, sales inquiry, safe media proxy, health probes, payment webhooks)
const PUBLIC_ROUTE_PREFIXES = [
  "/api/health",
  "/health",
  "/api/payment/webhook",
  "/payment/webhook",
  "/api/billing/webhook",
  "/billing/webhook",
  "/api/contact-sales",
  "/api/proxy",
  "/api/proxy-image",
  "/contact-sales",
  "/proxy",
  "/proxy-image",
  "/api/presentation/health",
  "/presentation/health",
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const fullPath = req.originalUrl.split("?")[0];
  const subPath = req.path;

  // Check if route is public
  const isPublic = PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => fullPath.startsWith(prefix) || subPath.startsWith(prefix)
  );
  if (isPublic) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized: Missing or invalid Authorization header. Valid Bearer token required.",
      code: "AUTH_TOKEN_REQUIRED",
    });
  }

  const token = authHeader.split("Bearer ")[1].trim();
  if (!token) {
    return res.status(401).json({
      error: "Unauthorized: Bearer token is empty.",
      code: "AUTH_TOKEN_EMPTY",
    });
  }

  const user = await verifyAuthToken(token);
  if (!user) {
    await logSecurityEvent(req, {
      eventType: "AUTH_TOKEN_INVALID",
      severity: "medium",
      route: fullPath,
      method: req.method,
      reason: "Cryptographic bearer token verification failed or token is expired",
    });

    return res.status(401).json({
      error: "Unauthorized: Invalid or expired authentication token.",
      code: "AUTH_TOKEN_INVALID",
    });
  }

  req.user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.admin) {
    await logSecurityEvent(req, {
      eventType: "FORBIDDEN_ADMIN_REQUIRED",
      severity: "high",
      userId: req.user?.uid || req.user?.id || null,
      route: req.originalUrl.split("?")[0],
      method: req.method,
      reason: "Non-administrator user attempted to access administrator-restricted endpoint",
      metadata: {
        attemptedRole: req.user?.role || (req.user?.admin ? "admin" : "user") || "unauthenticated",
      },
    });

    return res.status(403).json({
      error: "Forbidden: Administrator privileges required.",
      code: "FORBIDDEN_ADMIN_REQUIRED",
    });
  }
  next();
}
