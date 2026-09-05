/**
 * Presentation Gemini Client Wrapper.
 * Single authoritative execution gateway for all Presentation Engine LLM requests.
 * Manages model resolution, native system instructions, JSON structured outputs,
 * fine-grained error classification, bounded transient retries, model fallbacks,
 * application-level semantic validation, and structured telemetry.
 */

import {
  getServerAI,
  getGeminiBillingContext,
  rotateGeminiClient
} from '../../infrastructure/gemini/serverGeminiClient.js';
import {
  resolvePresentationConfig,
  PresentationPolicyName
} from './presentationModelResolver.js';
import {
  classifyGeminiError,
  PresentationError,
  PresentationErrorKind
} from './presentationError.js';

export interface StructuredExecutionTelemetry {
  generationId: string;
  stage: 'strategy' | 'content';
  requestedModel: string;
  actualModel: string;
  attempt: number;
  totalAttempts: number;
  latencyMs: number;
  errorKind?: PresentationErrorKind;
  fallbackUsed: boolean;
  success: boolean;
  billingTier?: 'free' | 'pay_as_you_go' | 'enterprise';
  keySource?: string;
}

export interface ExecuteStructuredParams<T> {
  generationId: string;
  stage: 'strategy' | 'content';
  policyName?: PresentationPolicyName;
  userInput: string;
  systemInstruction: string;
  responseSchema?: any;
  semanticValidator?: (parsed: any) => { isValid: boolean; errors?: string[] };
  timeoutMs?: number;
}

export interface StructuredExecutionResult<T> {
  data: T;
  modelUsed: string;
  latencyMs: number;
  telemetry: StructuredExecutionTelemetry[];
}

export class PresentationGeminiClient {
  // Hard execution invariants to prevent runaway cascade loops
  private readonly MAX_MODELS = 3;
  private readonly MAX_RETRIES_PER_MODEL = 1;
  private readonly MAX_TOTAL_ATTEMPTS = 6;
  private readonly DEFAULT_TIMEOUT_MS = 180000; // 180 seconds global budget across fallbacks
  private readonly PER_ATTEMPT_TIMEOUT_MS = 90000; // 90 seconds per individual LLM call

  /**
   * Executes a structured JSON LLM call with bounded retries and model fallbacks.
   */
  async executeStructured<T>(
    params: ExecuteStructuredParams<T>
  ): Promise<StructuredExecutionResult<T>> {
    const {
      generationId,
      stage,
      policyName = 'production',
      userInput,
      systemInstruction,
      responseSchema,
      semanticValidator,
      timeoutMs = this.DEFAULT_TIMEOUT_MS
    } = params;

    const resolved = resolvePresentationConfig(stage, policyName);
    const billingContext = getGeminiBillingContext();
    const isPayAsYouGo = resolved.isPayAsYouGo || billingContext.tier === 'pay_as_you_go' || billingContext.tier === 'enterprise';
    const effectiveMaxRetries = isPayAsYouGo ? 2 : this.MAX_RETRIES_PER_MODEL;
    const ai = getServerAI();

    // Enforce max 3 models in fallback sequence
    const modelChain = [resolved.model, ...resolved.fallbacks].slice(0, this.MAX_MODELS);
    const telemetryHistory: StructuredExecutionTelemetry[] = [];

    let totalAttempts = 0;
    const globalDeadline = Date.now() + timeoutMs;
    let lastError: any = null;

    for (let modelIdx = 0; modelIdx < modelChain.length; modelIdx++) {
      const currentModel = modelChain[modelIdx];
      let modelRetries = 0;

      while (modelRetries <= effectiveMaxRetries) {
        if (Date.now() >= globalDeadline) {
          throw new PresentationError({
            message: `Presentation generation timed out after ${timeoutMs}ms.`,
            status: 504,
            code: 'PRESENTATION_TIMEOUT',
            kind: 'TRANSIENT',
            retryable: false
          });
        }

        if (totalAttempts >= this.MAX_TOTAL_ATTEMPTS) {
          throw new PresentationError({
            message: `Maximum generation attempt budget (${this.MAX_TOTAL_ATTEMPTS}) exceeded.`,
            status: 503,
            code: 'PRESENTATION_ATTEMPT_BUDGET_EXCEEDED',
            kind: 'TRANSIENT',
            retryable: false
          });
        }

        totalAttempts++;
        const attemptStartTime = Date.now();
        const isFallback = modelIdx > 0;

        console.log(
          `[PresentationGeminiClient] [gen:${generationId.slice(0, 8)}] Stage:${stage} Attempt:${totalAttempts} (Model: ${currentModel}${isFallback ? ' [FALLBACK]' : ''}, Tier: ${billingContext.tier})`
        );

        // Per-attempt abort controller
        const remainingGlobalTime = globalDeadline - Date.now();
        const attemptTimeout = Math.min(this.PER_ATTEMPT_TIMEOUT_MS, remainingGlobalTime);
        const abortController = new AbortController();
        const timeoutHandle = setTimeout(() => abortController.abort(), attemptTimeout);

        try {
          // Standard Google GenAI call with strict separation: native systemInstruction + user input contents
          const config: any = {
            systemInstruction,
            responseMimeType: 'application/json',
            abortSignal: abortController.signal
          };
          if (responseSchema) {
            config.responseSchema = responseSchema;
          }

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: userInput,
            config
          });

          clearTimeout(timeoutHandle);
          const latencyMs = Date.now() - attemptStartTime;
          const rawText = response.text;

          if (!rawText || !rawText.trim()) {
            throw new PresentationError({
              message: 'Gemini model returned an empty text payload.',
              status: 502,
              code: 'PRESENTATION_EMPTY_RESPONSE',
              kind: 'TRANSIENT',
              retryable: true
            });
          }

          // Layer 1: JSON Parse
          const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
          let parsed: any;
          try {
            parsed = JSON.parse(cleanJson);
          } catch (jsonErr: any) {
            throw new PresentationError({
              message: `Malformed JSON returned by model: ${jsonErr?.message}`,
              status: 502,
              code: 'PRESENTATION_MALFORMED_JSON',
              kind: 'TRANSIENT',
              retryable: true,
              details: { preview: cleanJson.slice(0, 100) }
            });
          }

          // Layer 2: Application-level Semantic Invariant Validation
          if (semanticValidator) {
            const validation = semanticValidator(parsed);
            if (!validation.isValid) {
              const errDetails = validation.errors ? validation.errors.join('; ') : 'Unknown schema mismatch';
              throw new PresentationError({
                message: `Application-level semantic validation failed: ${errDetails}`,
                status: 502,
                code: 'PRESENTATION_SEMANTIC_VALIDATION_FAILED',
                kind: 'TRANSIENT',
                retryable: true,
                details: { errors: validation.errors }
              });
            }
          }

          // Record successful telemetry
          telemetryHistory.push({
            generationId,
            stage,
            requestedModel: modelChain[0],
            actualModel: currentModel,
            attempt: modelRetries + 1,
            totalAttempts,
            latencyMs,
            fallbackUsed: isFallback,
            success: true,
            billingTier: billingContext.tier,
            keySource: billingContext.keySource
          });

          return {
            data: parsed as T,
            modelUsed: currentModel,
            latencyMs,
            telemetry: telemetryHistory
          };
        } catch (err: any) {
          clearTimeout(timeoutHandle);
          const latencyMs = Date.now() - attemptStartTime;
          const classified = classifyGeminiError(err);
          lastError = classified;

          telemetryHistory.push({
            generationId,
            stage,
            requestedModel: modelChain[0],
            actualModel: currentModel,
            attempt: modelRetries + 1,
            totalAttempts,
            latencyMs,
            errorKind: classified.kind,
            fallbackUsed: isFallback,
            success: false,
            billingTier: billingContext.tier,
            keySource: billingContext.keySource
          });

          console.warn(
            `[PresentationGeminiClient] [gen:${generationId.slice(0, 8)}] Attempt on ${currentModel} failed: [${classified.kind}] ${classified.message}`
          );

          // CRITICAL INVARIANT: Programming & Validation errors MUST FAIL IMMEDIATELY.
          // Never retry or fallback to hide programming mistakes.
          if (!classified.shouldFallback) {
            throw new PresentationError({
              message: classified.message,
              status: classified.statusCode,
              code: classified.code,
              kind: classified.kind,
              retryable: false,
              details: err?.details || err
            });
          }

          // Key Pool Rotation on Quota: If multiple keys configured in pool, rotate key and retry on same model
          if (classified.kind === 'QUOTA' && billingContext.poolSize > 1) {
            rotateGeminiClient();
            console.log(
              `[PresentationGeminiClient] Key pool active: rotated to next API key and retrying ${currentModel}...`
            );
            modelRetries++;
            continue;
          }

          // Check if single retry on SAME model is warranted (e.g. transient 503/timeout or retryable quota)
          if (classified.retryable && modelRetries < effectiveMaxRetries) {
            const delay = isPayAsYouGo
              ? Math.min(600 * Math.pow(1.5, modelRetries) + Math.random() * 200, 2000)
              : classified.retryDelayMs || 1500;
            console.log(
              `[PresentationGeminiClient] Retrying transient failure on ${currentModel} in ${Math.round(delay)}ms...`
            );
            await new Promise((res) => setTimeout(res, delay));
            modelRetries++;
            continue; // Retry with same model
          }

          // If rotating to next model due to quota exhaustion:
          // In Pay-As-You-Go: low-latency rotation (300ms)
          // In Free Tier: pause briefly to clear burst window
          if (classified.kind === 'QUOTA' && modelIdx < modelChain.length - 1) {
            const delay = isPayAsYouGo ? 300 : classified.retryDelayMs || 2500;
            console.log(
              `[PresentationGeminiClient] Quota backoff (${billingContext.tier}): waiting ${delay}ms before rotating to next model...`
            );
            await new Promise((res) => setTimeout(res, delay));
          }

          // Otherwise break to next model in fallback chain
          break;
        }
      }
    }

    // If all models in the chain are exhausted
    throw new PresentationError({
      message: `Presentation ${stage} generation failed across all configured models: ${lastError?.message || 'Unknown error'}`,
      status: lastError?.statusCode || 503,
      code: lastError?.code || 'PRESENTATION_ALL_MODELS_EXHAUSTED',
      kind: lastError?.kind || 'PROVIDER',
      retryable: false,
      details: { telemetry: telemetryHistory }
    });
  }
}

export const presentationGeminiClient = new PresentationGeminiClient();
