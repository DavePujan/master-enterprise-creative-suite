/**
 * Centralized Security-Event Audit Logging Service.
 * Implements a normalized, privacy-hardened security telemetry stream.
 * 
 * CRITICAL ARCHITECTURAL GUARANTEES:
 * 1. Best-effort delivery: An audit logging failure MUST NEVER fail-open or bypass authorization.
 * 2. Privacy & Zero-Knowledge: Tokens, API keys, passwords, cookies, and full user prompts are strictly redacted.
 * 3. Serverless safety: Events are persisted within the request lifecycle without background buffer leaks.
 * 4. Admin Isolation: Stored in public.security_audit_logs with strict RLS (admin-only read, zero public write).
 */

import type { Request } from "express";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export type SecurityEventType =
  | "AUTH_TOKEN_REQUIRED"
  | "AUTH_TOKEN_EMPTY"
  | "AUTH_TOKEN_INVALID"
  | "FORBIDDEN_ADMIN_REQUIRED"
  | "WORKSPACE_ACCESS_DENIED"
  | "EXPORT_ACCESS_DENIED"
  | "CORS_ORIGIN_BLOCKED"
  | "SSRF_BLOCKED"
  | "RATE_LIMIT_SECURITY_EVENT"
  | "SECURITY_VALIDATION_FAILED";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEventInput {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string | null;
  workspaceId?: string | null;
  resourceType?: string;
  resourceId?: string;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityAuditLogRow {
  id: string;
  created_at: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  workspace_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  route: string | null;
  method: string | null;
  ip: string | null;
  user_agent: string | null;
  reason: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
}

// Regex to detect sensitive credential / prompt / secret keys in metadata
const SENSITIVE_KEY_PATTERN = /token|secret|password|key|bearer|cookie|authorization|prompt|credential/i;

/**
 * Deeply sanitizes metadata to guarantee that no secrets, authorization headers,
 * access tokens, API keys, or raw prompts leak into security audit records.
 */
export function sanitizeMetadata(data?: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};

  const clean: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = "[REDACTED]";
      continue;
    }

    if (val === null || val === undefined) {
      clean[key] = val;
    } else if (typeof val === "string") {
      // Limit length to avoid log-injection / memory attacks
      clean[key] = val.length > 500 ? `${val.slice(0, 500)}...[TRUNCATED]` : val;
    } else if (typeof val === "number" || typeof val === "boolean") {
      clean[key] = val;
    } else if (Array.isArray(val)) {
      clean[key] = val.slice(0, 20).map((item) => {
        if (typeof item === "object" && item !== null) {
          return sanitizeMetadata(item as Record<string, unknown>);
        }
        return typeof item === "string" && item.length > 200 ? `${item.slice(0, 200)}...` : item;
      });
    } else if (typeof val === "object") {
      clean[key] = sanitizeMetadata(val as Record<string, unknown>);
    } else {
      clean[key] = String(val);
    }
  }

  return clean;
}

/**
 * Safely extracts client IP address respecting trusted reverse proxy setup.
 */
export function extractClientIp(req?: Request | null): string {
  if (!req) return "unknown";
  
  // If req.ip is populated by Express (with trust proxy enabled), use it
  if (req.ip) {
    return req.ip.slice(0, 64);
  }

  // Fallback to socket remoteAddress
  const remote = req.socket?.remoteAddress || "unknown";
  return remote.slice(0, 64);
}

/**
 * Safely logs a normalized security event.
 * NEVER throws an error to the caller — if persistence fails, authorization remains authoritative.
 */
export async function logSecurityEvent(
  req: Request | null,
  event: SecurityEventInput
): Promise<void> {
  try {
    const requestId =
      event.requestId ||
      (req?.headers?.["x-request-id"] as string) ||
      crypto.randomUUID();

    const route = (event.route || (req ? req.originalUrl?.split("?")[0] || req.path : "")).slice(0, 255);
    const method = (event.method || req?.method || "UNKNOWN").slice(0, 16);
    const ip = (event.ip || extractClientIp(req)).slice(0, 64);
    const userAgent = (event.userAgent || (req?.headers?.["user-agent"] as string) || "").slice(0, 512);

    const safeMeta = sanitizeMetadata(event.metadata);

    const payload = {
      event_type: event.eventType,
      severity: event.severity || "medium",
      user_id: event.userId || req?.user?.id || null,
      workspace_id: event.workspaceId || null,
      resource_type: event.resourceType?.slice(0, 64) || null,
      resource_id: event.resourceId?.slice(0, 255) || null,
      route: route || null,
      method: method || null,
      ip: ip || null,
      user_agent: userAgent || null,
      reason: event.reason?.slice(0, 500) || null,
      request_id: requestId,
      metadata: safeMeta,
    };

    // Attempt authoritative database write via service role
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { error } = await supabase.from("security_audit_logs").insert(payload);
      if (error) {
        console.warn(`[SecurityAudit] DB insert warning: ${error.message}`);
      }
    } else {
      // In standalone or test environments without live DB, emit safe structured telemetry
      if (process.env.NODE_ENV !== "test") {
        console.info(`[SecurityAudit] ${JSON.stringify(payload)}`);
      }
    }
  } catch (err) {
    // Non-blocking catch: Security controls must remain authoritative
    console.warn("[SecurityAudit] Best-effort security log recording failed:", err);
  }
}
