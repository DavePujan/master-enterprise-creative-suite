/**
 * Server AI Orchestrator.
 * Coordinates input validation, policy resolution, resilience execution, and SDK invocation.
 */

import { Modality } from "@google/genai";
import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { resolveModelFallbackChain } from "./aiPolicy.js";
import { classifyAIError } from "./aiResilience.js";
import type { ValidatedGenerateContentPayload, ValidatedTTSPayload, ValidatedVideoPayload } from "./aiSchemas.js";

export interface AIResponsePayload {
  text?: string;
  candidates?: any[];
  modelUsed: string;
}

export async function orchestrateGenerateContent(
  payload: ValidatedGenerateContentPayload,
  userIdentifier = "authenticated"
): Promise<AIResponsePayload> {
  const ai = getServerAI();
  const { primary, fallbacks } = resolveModelFallbackChain(payload.model);
  const modelsToTry = [primary, ...fallbacks];

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    let attempt = 0;
    const maxModelAttempts = 2;

    while (attempt < maxModelAttempts) {
      try {
        console.log(`[AI Orchestrator] Executing generateContent (model: ${currentModel}, user: ${userIdentifier}, attempt: ${attempt + 1})`);

        const response = await ai.models.generateContent({
          model: currentModel,
          contents: payload.contents,
          config: payload.config
        });

        if (currentModel !== primary) {
          console.log(`[AI Orchestrator] ✅ Successfully recovered with fallback model: ${currentModel}`);
        }

        return {
          text: response.text,
          candidates: response.candidates,
          modelUsed: currentModel
        };
      } catch (err: any) {
        lastError = err;
        const classification = classifyAIError(err, attempt);

        console.warn(`[AI Orchestrator Warning] Model "${currentModel}" failed (${classification.type}):`, err?.message || err);

        // 1. If fatal client error (400/401/403/invalid arg), fail fast immediately without retries or fallback
        if (classification.type === 'FATAL_CLIENT_ERROR' || classification.type === 'QUOTA_EXHAUSTION') {
          throw {
            status: err?.status || err?.code || 400,
            message: err?.message || "Invalid AI generation request",
            code: "AI_REQUEST_REJECTED"
          };
        }

        // 2. If 404 (model not found), break immediately to the next fallback model (no retry on same model)
        if (classification.type === 'MODEL_NOT_FOUND') {
          break;
        }

        // 3. If retryable on same model, wait with backoff & jitter
        if (classification.shouldRetrySameModel && attempt + 1 < maxModelAttempts) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, classification.retryDelayMs));
          continue;
        }

        // 4. Otherwise, proceed to next fallback model if allowed
        if (!classification.shouldFallbackNextModel) {
          break;
        }

        break;
      }
    }
  }

  console.error("[AI Orchestrator] All model attempts failed:", lastError?.message || lastError);

  throw {
    status: 503,
    message: "AI service is temporarily experiencing high demand. Please try again shortly.",
    code: "AI_SERVICE_BUSY"
  };
}

export async function orchestrateTTS(payload: ValidatedTTSPayload): Promise<{ audioPcmBase64: string }> {
  const ai = getServerAI();

  // Structured prompt with explicit director instructions & transcript delimiters
  const formattedPrompt = `DIRECTOR INSTRUCTIONS: Speak naturally in a ${payload.emotion || 'professional'} tone with clean pronunciation.\nTRANSCRIPT: <<< ${payload.text} >>>`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: formattedPrompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: payload.voice || "Kore" }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw {
      status: 500,
      message: "No audio data produced by TTS model",
      code: "TTS_NO_AUDIO_OUTPUT"
    };
  }

  return { audioPcmBase64: base64Audio };
}

export async function orchestrateVideoGeneration(payload: ValidatedVideoPayload): Promise<any> {
  const ai = getServerAI();

  const operation = await ai.models.generateVideos({
    model: payload.model,
    prompt: payload.prompt,
    image: payload.image,
    config: payload.config
  });

  return {
    name: operation.name,
    done: operation.done,
    response: operation.response
  };
}
