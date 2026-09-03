/**
 * Production-Hardened Authentication & Authorization Middleware.
 * Enforces strict Default-Deny policy across all server endpoints using the Universal Auth Bridge.
 * Zero mock bypasses. Cryptographic bearer token verification is mandatory for all protected routes.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken, type AuthContextUser } from "../infrastructure/supabase/serverAuth.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthContextUser;
    }
  }
}

// Explicitly allowlisted public endpoints (landing, sales inquiry, safe media proxy)
const PUBLIC_ROUTE_PREFIXES = [
  "/api/contact-sales",
  "/api/proxy",
  "/api/proxy-image",
  "/contact-sales",
  "/proxy",
  "/proxy-image",
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
    return res.status(401).json({
      error: "Unauthorized: Invalid or expired authentication token.",
      code: "AUTH_TOKEN_INVALID",
    });
  }

  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({
      error: "Forbidden: Administrator privileges required.",
      code: "FORBIDDEN_ADMIN_REQUIRED",
    });
  }
  next();
}
