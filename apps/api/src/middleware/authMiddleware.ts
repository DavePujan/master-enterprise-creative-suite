/**
 * Centralized Authentication & Authorization Middleware.
 * Enforces Default-Deny policy across all server endpoints using the Universal Auth Bridge.
 */

import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken, type AuthContextUser } from "../infrastructure/supabase/serverAuth.js";
import { serverConfig } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthContextUser;
    }
  }
}

// Explicitly allowlisted public endpoints
const PUBLIC_ROUTE_PREFIXES = [
  "/api/contact-sales",
  "/api/proxy",
  "/api/proxy-image",
  "/contact-sales",
  "/proxy",
  "/proxy-image"
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const fullPath = req.originalUrl.split("?")[0];
  const subPath = req.path;

  // Check if route is public
  const isPublic = PUBLIC_ROUTE_PREFIXES.some(prefix => fullPath.startsWith(prefix) || subPath.startsWith(prefix));
  if (isPublic) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // In local development mode without token, allow mock user if in development environment
    if (serverConfig.nodeEnv === "development" && !process.env.STRICT_PROD_AUTH) {
      req.user = {
        uid: "dev_local_user",
        email: "developer@writopedia.local",
        admin: true,
        workspaceId: "ws_dev_local",
      };
      return next();
    }
    return res.status(401).json({ error: "Missing or invalid Authorization header. Bearer token required." });
  }

  const token = authHeader.split("Bearer ")[1].trim();
  const user = await verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired authentication token." });
  }

  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
  }
  next();
}
