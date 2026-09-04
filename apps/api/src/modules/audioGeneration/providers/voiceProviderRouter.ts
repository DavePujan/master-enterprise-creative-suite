/**
 * VoiceProviderRouter.
 * Deterministic, auditable TTS provider hierarchy:
 * 1. Google Gemini 3.1 Flash TTS (Primary)
 * 2. Bounded retry for transient errors (429, 5xx, timeouts)
 * 3. fal.ai Gemini 3.1 Flash TTS (First-Class Production Fallback)
 * 4. Legacy Google 2.5 Flash TTS (Tertiary, only if explicitly enabled in config)
 * 5. Graceful failure
 * 
 * Strict non-fallback policy: Never fall back on client errors (400, invalid voice, >2 speakers, policy rejections).
 * Records complete audit trail in TtsFailoverState.
 */

import { googleTtsProvider } from "./googleTtsProvider.js";
import { falGeminiTtsProvider } from "./falGeminiTtsProvider.js";
import { legacyGoogleTtsProvider } from "./legacyGoogleTtsProvider.js";
import type {
  VoiceProviderRequest,
  VoiceGenerationResult,
  TtsFailoverState,
} from "./types.js";

export interface VoiceRouterExecutionResult {
  result: VoiceGenerationResult;
  failoverState: TtsFailoverState;
}

export class VoiceProviderRouter {
  private isTransientError(err: any): boolean {
    if (!err) return false;
    const msg = String(err?.message || err || "").toLowerCase();
    const status = err?.status || err?.statusCode || err?.code;

    // Explicit non-transient conditions (NEVER FALLBACK)
    if (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      status === "EXCESSIVE_SPEAKERS" ||
      status === "INVALID_VOICE" ||
      msg.includes("excessive_speakers") ||
      msg.includes("invalid_voice") ||
      msg.includes("safety") ||
      msg.includes("policy") ||
      msg.includes("bad request") ||
      msg.includes("unauthorized")
    ) {
      return false;
    }

    // Transient conditions (QUALIFIES FOR RETRY & FALLBACK)
    if (
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      msg.includes("429") ||
      msg.includes("resource_exhausted") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("overloaded") ||
      msg.includes("unavailable") ||
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout")
    ) {
      return true;
    }

    return false;
  }

  async synthesize(
    request: VoiceProviderRequest,
    options: { allowLegacyFallback?: boolean } = {}
  ): Promise<VoiceRouterExecutionResult> {
    const failoverState: TtsFailoverState = {
      primaryProvider: "google",
      primaryModel: googleTtsProvider.modelId,
      fallbackUsed: false,
      retryCount: 0,
    };

    // 1. Primary Attempt: Google Gemini 3.1 Flash TTS
    try {
      console.log(`[VoiceProviderRouter] Attempt 1: ${googleTtsProvider.providerName} (${googleTtsProvider.modelId})`);
      const result = await googleTtsProvider.synthesize(request);
      return { result, failoverState };
    } catch (primaryErr: any) {
      const isTransient = this.isTransientError(primaryErr);
      console.warn(`[VoiceProviderRouter] Primary provider failed (transient: ${isTransient}):`, primaryErr?.message || primaryErr);

      if (!isTransient) {
        // Non-transient client/validation error: Fail immediately without fallback
        throw primaryErr;
      }

      // 2. Bounded Transient Retry (1 retry with exponential backoff delay)
      failoverState.retryCount = 1;
      try {
        console.log(`[VoiceProviderRouter] Attempt 2 (Bounded retry): ${googleTtsProvider.modelId}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const retryResult = await googleTtsProvider.synthesize(request);
        return { result: retryResult, failoverState };
      } catch (retryErr: any) {
        console.warn(`[VoiceProviderRouter] Primary bounded retry failed:`, retryErr?.message || retryErr);
        failoverState.fallbackReason = `Primary Google TTS transient failure: ${primaryErr?.message || "Rate limit or quota exhausted"}`;
      }

      // 3. First-Class Fallback: fal.ai Gemini 3.1 Flash TTS
      try {
        console.log(`[VoiceProviderRouter] Attempt 3 (Fallback): ${falGeminiTtsProvider.providerName} (${falGeminiTtsProvider.modelId})`);
        const falResult = await falGeminiTtsProvider.synthesize(request);

        failoverState.fallbackUsed = true;
        failoverState.fallbackProvider = "fal";
        failoverState.fallbackModel = falGeminiTtsProvider.modelId;
        failoverState.providerRequestId = falResult.requestId;

        return { result: falResult, failoverState };
      } catch (falErr: any) {
        console.warn(`[VoiceProviderRouter] Fallback provider fal.ai failed:`, falErr?.message || falErr);

        // 4. Optional Tertiary Fallback: Legacy Google 2.5 Flash TTS (only if explicitly enabled)
        if (options.allowLegacyFallback) {
          try {
            console.log(`[VoiceProviderRouter] Attempt 4 (Legacy Google fallback): ${legacyGoogleTtsProvider.modelId}`);
            const legacyResult = await legacyGoogleTtsProvider.synthesize(request);

            failoverState.fallbackUsed = true;
            failoverState.fallbackProvider = "google";
            failoverState.fallbackModel = legacyGoogleTtsProvider.modelId;
            failoverState.fallbackReason += ` -> fal.ai failed: ${falErr?.message || "Error"}`;

            return { result: legacyResult, failoverState };
          } catch (legacyErr: any) {
            console.warn(`[VoiceProviderRouter] Legacy Google fallback failed:`, legacyErr?.message || legacyErr);
          }
        }

        // 5. All providers exhausted
        throw {
          statusCode: 429,
          code: "TTS_ALL_PROVIDERS_UNAVAILABLE",
          message: "All speech synthesis providers (Google Gemini TTS and fal.ai TTS) are currently unavailable. No credits were deducted. Please try again shortly.",
          failoverState,
        };
      }
    }
  }
}

export const voiceProviderRouter = new VoiceProviderRouter();
