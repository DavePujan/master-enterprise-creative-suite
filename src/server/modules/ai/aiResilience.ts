/**
 * Server-Side AI Resilience & Error Classification Engine.
 * Implements exponential backoff with jitter and cost-aware model fallback.
 */

export interface ErrorClassification {
  type: 'FATAL_CLIENT_ERROR' | 'MODEL_NOT_FOUND' | 'RATE_LIMIT_TRANSIENT' | 'QUOTA_EXHAUSTION' | 'SERVICE_UNAVAILABLE' | 'UNKNOWN';
  shouldRetrySameModel: boolean;
  shouldFallbackNextModel: boolean;
  retryDelayMs: number;
}

export function classifyAIError(err: any, attempt = 0): ErrorClassification {
  const status = err?.status || err?.code || 0;
  const message = String(err?.message || "").toUpperCase();

  // 1. Client / Parameter / Auth Errors: NEVER retry or fallback
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    message.includes("INVALID_ARGUMENT") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("BAD REQUEST")
  ) {
    return {
      type: 'FATAL_CLIENT_ERROR',
      shouldRetrySameModel: false,
      shouldFallbackNextModel: false,
      retryDelayMs: 0
    };
  }

  // 2. Model Not Found (404): Fallback immediately without repeating against the invalid model
  if (
    status === 404 ||
    message.includes("NOT FOUND") ||
    message.includes("NOT_FOUND") ||
    message.includes("MODEL NOT FOUND")
  ) {
    return {
      type: 'MODEL_NOT_FOUND',
      shouldRetrySameModel: false,
      shouldFallbackNextModel: true,
      retryDelayMs: 100
    };
  }

  // 3. Quota / Rate Limiting (429)
  if (status === 429 || message.includes("RESOURCE_EXHAUSTED") || message.includes("RATE LIMIT")) {
    if (message.includes("EXCEEDED ITS SPENDING CAP") || message.includes("QUOTA EXCEEDED")) {
      return {
        type: 'QUOTA_EXHAUSTION',
        shouldRetrySameModel: false,
        shouldFallbackNextModel: false,
        retryDelayMs: 0
      };
    }
    // Short-term RPM rate limit: exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, attempt), 4000);
    const jitter = Math.floor(Math.random() * 500);
    return {
      type: 'RATE_LIMIT_TRANSIENT',
      shouldRetrySameModel: attempt < 1,
      shouldFallbackNextModel: true,
      retryDelayMs: baseDelay + jitter
    };
  }

  // 4. Service Unavailable / High Demand Spikes (503 / 500)
  if (
    status === 503 ||
    status === 500 ||
    message.includes("UNAVAILABLE") ||
    message.includes("HIGH DEMAND") ||
    message.includes("TEMPORARY") ||
    message.includes("OVERLOADED")
  ) {
    const baseDelay = Math.min(600 * Math.pow(1.5, attempt), 2000);
    const jitter = Math.floor(Math.random() * 300);
    return {
      type: 'SERVICE_UNAVAILABLE',
      shouldRetrySameModel: attempt < 1,
      shouldFallbackNextModel: true,
      retryDelayMs: baseDelay + jitter
    };
  }

  return {
    type: 'UNKNOWN',
    shouldRetrySameModel: false,
    shouldFallbackNextModel: false,
    retryDelayMs: 0
  };
}
