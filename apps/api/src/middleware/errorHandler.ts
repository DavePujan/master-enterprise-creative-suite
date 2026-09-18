import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../../packages/errors/AppError.js";

/**
 * Strips sensitive credentials, tokens, and authorization headers from logging payloads.
 */
function sanitizeLogPayload(data: any): any {
  if (!data || typeof data !== "object") return data;
  const sanitized = { ...data };
  const sensitiveKeys = [
    "authorization",
    "cookie",
    "password",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "service_role",
    "serviceRoleKey",
    "resendApiKey",
    "razorpayKeySecret"
  ];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    }
  }
  return sanitized;
}

/**
 * Centralized production error handling middleware.
 * Masks database internals, system paths, and unexpected 500 error messages in production.
 * Preserves status codes and safe error messages for known operational application errors.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Resolve status code
  let statusCode = 500;
  if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (typeof err.status === "number" && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  }

  const isKnownOperational =
    err instanceof AppError ||
    (statusCode >= 400 && statusCode < 500) ||
    err.code === "INSUFFICIENT_CREDITS" ||
    err.code === "AUTH_REQUIRED" ||
    err.code === "FORBIDDEN_WORKSPACE_ACCESS";

  // Safe server-side diagnostic logging (sanitized)
  const logInfo = sanitizeLogPayload({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    errorCode: err.code || err.name,
    message: err.message,
  });
  console.error("[CentralErrorHandler]", JSON.stringify(logInfo));

  // 1. Operational application errors (4xx) - return designated status and message
  if (isKnownOperational && statusCode < 500) {
    return res.status(statusCode).json({
      error: err.message || "Request failed.",
      code: err.code || err.name || "APPLICATION_ERROR",
      ...(err.availableCredits !== undefined && { availableCredits: err.availableCredits }),
      ...(err.requiredCredits !== undefined && { requiredCredits: err.requiredCredits }),
    });
  }

  // 2. Unexpected server errors (500) in production - mask internal details
  if (isProduction) {
    return res.status(500).json({
      error: "An internal server error occurred.",
      code: "INTERNAL_SERVER_ERROR"
    });
  }

  // 3. Development / test mode - provide diagnostic information
  return res.status(statusCode >= 500 ? 500 : statusCode).json({
    error: err.message || "An internal server error occurred.",
    code: err.code || "INTERNAL_SERVER_ERROR",
    stack: err.stack
  });
}
