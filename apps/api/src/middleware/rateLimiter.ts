/**
 * Route-Specific Rate Limiting Middleware.
 * Applies adaptive request quotas across AI, billing, proxy, and public contact endpoints.
 */

import type { Request, Response, NextFunction } from "express";

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, RateLimitBucket>();

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const { windowMs, max, message = "Too many requests. Please try again later." } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.user?.uid || req.ip || req.headers["x-forwarded-for"] || "anonymous";
    const bucketKey = `${req.baseUrl || req.path}:${identifier}`;
    const now = Date.now();

    let bucket = buckets.get(bucketKey);
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + windowMs };
      buckets.set(bucketKey, bucket);
      return next();
    }

    bucket.count++;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds
      });
    }

    next();
  };
}

export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "AI generation rate limit exceeded. Please wait a moment."
});

export const billingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Payment order rate limit reached. Please wait a moment."
});

export const proxyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Proxy request rate limit reached. Please wait a moment."
});

export const salesRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Sales inquiry rate limit reached. Please wait before submitting again."
});
