/**
 * Provider Error Normalization & Retry Classification for Video Gem.
 * Standardizes raw vendor errors, status codes, and network exceptions into
 * user-safe NormalizedProviderError envelopes without leaking secrets.
 */

import type {
  NormalizedErrorCode,
  NormalizedProviderError,
  ProviderId
} from '@contracts/providerAdapterContracts.js';

export class AdapterErrorNormalizer {
  /**
   * Sanitizes strings to eliminate potential credential leaks (API keys, bearer tokens).
   */
  public scrubSecrets(input: string): string {
    if (!input) return '';
    return input
      .replace(/AIzaSy[A-Za-z0-9_-]{10,}/gi, '[REDACTED_GEMINI_KEY]')
      .replace(/fal_[A-Za-z0-9_-]{10,}/gi, '[REDACTED_FAL_KEY]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/(?:key|token|secret|password|credential)=['"]?[^'"\s&]+['"]?/gi, '$1=[REDACTED]');
  }

  /**
   * Normalizes an exception from a provider into a canonical NormalizedProviderError.
   */
  public normalize(err: any, provider: ProviderId, model: string): NormalizedProviderError {
    const rawMsg = err?.message || String(err || 'Unknown error');
    const scrubbedMsg = this.scrubSecrets(rawMsg);
    const status = err?.status || err?.statusCode || err?.code;

    // 1. Content Safety / Moderation
    if (
      /safety|moderation|blocked|prohibited|content filter|harmful|nsfw|sensitive/i.test(rawMsg) ||
      err?.error?.status === 'SAFETY_VIOLATION'
    ) {
      return {
        code: 'CONTENT_REJECTED',
        message: 'The requested scene or visual was blocked by provider content safety filters. Please adjust the scene description.',
        rawError: scrubbedMsg,
        retryable: false,
        provider,
        model
      };
    }

    // 2. Authentication & Credential Errors
    if (
      status === 401 ||
      status === 403 ||
      /\b(401|403)\b/i.test(rawMsg) ||
      /unauthorized|invalid.*api.*key|invalid.*key|api_key_invalid|permission denied|forbidden/i.test(rawMsg)
    ) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message: `Authentication with ${provider.toUpperCase()} failed. Please verify provider credentials and workspace permissions.`,
        rawError: scrubbedMsg,
        retryable: false,
        provider,
        model
      };
    }

    // 3. Rate Limits & Quotas
    if (
      status === 429 ||
      /\b429\b/i.test(rawMsg) ||
      /rate limit|quota exceeded|resource_exhausted|too many requests|throttled/i.test(rawMsg)
    ) {
      const retryMatch = rawMsg.match(/retry[- ]after[: ]+(\d+)/i) || rawMsg.match(/in ([\d.]+)s/i);
      const retryAfterSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 30;

      return {
        code: 'RATE_LIMITED',
        message: `Provider ${provider.toUpperCase()} rate limit reached. Generation will retry shortly.`,
        rawError: scrubbedMsg,
        retryable: true,
        provider,
        model,
        retryAfterSeconds
      };
    }

    // 4. Unsupported Engine Configuration
    if (
      /unsupported|invalid resolution|invalid aspect ratio|not support|unsupported duration|duration.*not supported/i.test(rawMsg)
    ) {
      return {
        code: 'UNSUPPORTED_CONFIGURATION',
        message: `Configuration not supported by ${model}: ${scrubbedMsg}`,
        rawError: scrubbedMsg,
        retryable: false,
        provider,
        model
      };
    }

    // 5. Invalid Request / Bad Parameters
    if (
      status === 400 ||
      /invalid argument|bad request|missing parameter|validation error/i.test(rawMsg)
    ) {
      return {
        code: 'INVALID_REQUEST',
        message: `Invalid generation payload sent to ${provider.toUpperCase()}: ${scrubbedMsg}`,
        rawError: scrubbedMsg,
        retryable: false,
        provider,
        model
      };
    }

    // 6. Timeouts
    if (
      /timeout|timed out|deadline exceeded|econnaborted|etimedout/i.test(rawMsg)
    ) {
      return {
        code: 'TIMEOUT',
        message: `Generation request to ${provider.toUpperCase()} timed out. The provider queue may be congested.`,
        rawError: scrubbedMsg,
        retryable: true,
        provider,
        model
      };
    }

    // 7. Provider Unavailable / Service Outages
    if (
      status === 502 ||
      status === 503 ||
      status === 504 ||
      /unavailable|service unavailable|bad gateway|gateway timeout|econnrefused|enotfound/i.test(rawMsg)
    ) {
      return {
        code: 'PROVIDER_UNAVAILABLE',
        message: `${provider.toUpperCase()} service is temporarily unavailable or experiencing connectivity issues.`,
        rawError: scrubbedMsg,
        retryable: true,
        provider,
        model
      };
    }

    // 8. Fallback Unknown
    return {
      code: 'UNKNOWN_PROVIDER_ERROR',
      message: `An unexpected error occurred during ${provider.toUpperCase()} video generation.`,
      rawError: scrubbedMsg,
      retryable: false,
      provider,
      model
    };
  }
}

export const adapterErrorNormalizer = new AdapterErrorNormalizer();
