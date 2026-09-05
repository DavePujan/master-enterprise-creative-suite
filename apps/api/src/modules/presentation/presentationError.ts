/**
 * Presentation Error Classification and Normalization.
 * Implements fine-grained classification to ensure deterministic 400 errors fail immediately
 * while transient 5xx/timeouts have bounded retries and 429/404 trigger model rotation.
 */

export type PresentationErrorKind =
  | 'VALIDATION'
  | 'AUTH'
  | 'QUOTA'
  | 'TRANSIENT'
  | 'MODEL_UNAVAILABLE'
  | 'PROVIDER'
  | 'UNKNOWN';

export interface ClassifiedGeminiError {
  kind: PresentationErrorKind;
  statusCode: number;
  code: string;
  message: string;
  retryable: boolean;
  shouldFallback: boolean;
  retryDelayMs?: number;
  isFreeTierExhausted?: boolean;
  originalError: any;
}

/**
 * Standardized Presentation Error returned by API routes and service layers.
 */
export class PresentationError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly kind: PresentationErrorKind;
  readonly details?: any;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    kind: PresentationErrorKind;
    retryable?: boolean;
    details?: any;
  }) {
    super(params.message);
    this.name = 'PresentationError';
    this.status = params.status;
    this.code = params.code;
    this.kind = params.kind;
    this.retryable = params.retryable ?? false;
    this.details = params.details;
  }
}

/**
 * Classifies an error from the Google GenAI SDK into explicit operational buckets.
 */
export function classifyGeminiError(err: any): ClassifiedGeminiError {
  const status = Number(err?.status || err?.code || err?.statusCode || 0);
  const rawMessage = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || '');
  const msgLower = rawMessage.toLowerCase();

  // 1. Validation / Programming errors (HTTP 400, schema violations, invalid SDK arguments)
  // CRITICAL: Must FAIL FAST. Never mask programming bugs behind fallback loops.
  if (
    status === 400 ||
    msgLower.includes('invalid_argument') ||
    msgLower.includes('must be a value') ||
    msgLower.includes('bad request') ||
    msgLower.includes('schema validation') ||
    msgLower.includes('response_format')
  ) {
    return {
      kind: 'VALIDATION',
      statusCode: 400,
      code: 'PRESENTATION_INVALID_REQUEST',
      message: rawMessage || 'Invalid request parameter or schema specification.',
      retryable: false,
      shouldFallback: false,
      originalError: err
    };
  }

  // 2. Authentication & Authorization errors
  if (
    status === 401 ||
    status === 403 ||
    msgLower.includes('unauthenticated') ||
    msgLower.includes('permission_denied') ||
    msgLower.includes('api_key_invalid') ||
    msgLower.includes('unauthorized')
  ) {
    return {
      kind: 'AUTH',
      statusCode: status === 403 ? 403 : 401,
      code: 'PRESENTATION_AUTH_ERROR',
      message: 'Authentication failed for the AI provider. Please verify API configuration.',
      retryable: false,
      shouldFallback: false,
      originalError: err
    };
  }

  // 3. Model Unavailable / Not Found (404)
  if (
    status === 404 ||
    msgLower.includes('not_found') ||
    msgLower.includes('is not found') ||
    msgLower.includes('does not exist')
  ) {
    return {
      kind: 'MODEL_UNAVAILABLE',
      statusCode: 404,
      code: 'PRESENTATION_MODEL_UNAVAILABLE',
      message: 'The requested presentation model is unavailable in this project.',
      retryable: false,
      shouldFallback: true,
      originalError: err
    };
  }

  // 4. Quota / Rate Limiting (429)
  if (
    status === 429 ||
    msgLower.includes('resource_exhausted') ||
    msgLower.includes('quota exceeded') ||
    msgLower.includes('rate limit')
  ) {
    const isFreeTierExhausted = msgLower.includes('free_tier') || msgLower.includes('freetier');

    // Extract Retry-After if available
    let retryDelayMs: number | undefined;
    const retryMatch = rawMessage.match(/retry in ([\d\.]+)s/i);
    if (retryMatch && retryMatch[1]) {
      const seconds = parseFloat(retryMatch[1]);
      if (seconds <= 60) {
        retryDelayMs = Math.ceil(seconds * 1000);
      }
    }

    const quotaMessage = isFreeTierExhausted
      ? 'Google AI Studio Free Tier rate limit reached. Rotate to configured alternate model or attach a Pay-As-You-Go API key.'
      : 'Presentation model quota is currently exhausted. Falling over to configured alternate model.';

    return {
      kind: 'QUOTA',
      statusCode: 429,
      code: isFreeTierExhausted ? 'PRESENTATION_FREE_TIER_QUOTA_EXHAUSTED' : 'PRESENTATION_QUOTA_EXHAUSTED',
      message: quotaMessage,
      retryable: Boolean(retryDelayMs && retryDelayMs <= 5000),
      retryDelayMs,
      isFreeTierExhausted,
      shouldFallback: true,
      originalError: err
    };
  }

  // 5. Transient Server Errors & Timeouts (500, 502, 503, 504, fetch abort)
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msgLower.includes('high demand') ||
    msgLower.includes('unavailable') ||
    msgLower.includes('internal error') ||
    msgLower.includes('timeout') ||
    msgLower.includes('aborted') ||
    msgLower.includes('aborterror') ||
    msgLower.includes('econnreset') ||
    msgLower.includes('etimedout')
  ) {
    return {
      kind: 'TRANSIENT',
      statusCode: status >= 500 ? status : 503,
      code: 'PRESENTATION_TRANSIENT_FAILURE',
      message: 'AI provider is temporarily experiencing high demand or transient timeout.',
      retryable: true,
      retryDelayMs: 1000,
      shouldFallback: true,
      originalError: err
    };
  }

  // 6. Unknown / Unclassified
  return {
    kind: 'UNKNOWN',
    statusCode: 500,
    code: 'PRESENTATION_GENERATION_FAILED',
    message: rawMessage || 'An unexpected error occurred during presentation generation.',
    retryable: false,
    shouldFallback: false,
    originalError: err
  };
}
