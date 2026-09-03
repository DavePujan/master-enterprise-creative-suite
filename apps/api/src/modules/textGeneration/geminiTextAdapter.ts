/**
 * Gemini Text Adapter.
 * Bridges Text Generation V2 to the Google GenAI Interactions API (@google/genai 2.x).
 * Supports standard generation, Server-Sent Events streaming, bounded retries,
 * model fallback chains, and accurate token tracking.
 */

import { getServerAI } from "../../infrastructure/gemini/serverGeminiClient.js";
import { resolveTextConfig } from "./textModelResolver.js";
import { buildTextPromptBundle } from "./textPromptBuilder.js";
import { sanitizeTextOutput, validateStructuredOutput } from "./textOutputValidator.js";
import type {
  NormalizedTextRequest,
  NormalizedTextResult,
  TextUsageMetadata,
} from "@shared-types/textGeneration.js";

export interface GeminiAdapterOptions {
  request: NormalizedTextRequest;
  workspaceId: string;
  userId: string;
}

/**
 * Executes a standard (non-streaming) text generation interaction.
 */
export async function generateTextInteraction(
  options: GeminiAdapterOptions
): Promise<NormalizedTextResult> {
  const { request } = options;
  const ai = getServerAI();
  const resolved = resolveTextConfig(request.task, request.quality, request.thinkingLevel);
  const bundle = buildTextPromptBundle(request);

  const modelsToTry = [resolved.model, ...resolved.fallbacks];
  let lastError: any = null;
  const startTime = Date.now();

  for (const modelId of modelsToTry) {
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        console.log(`[GeminiTextAdapter] Creating interaction (model: ${modelId}, task: ${request.task}, attempt: ${attempt + 1})`);

        // Interactions API Call
        const interaction = await ai.interactions.create({
          model: modelId,
          input: bundle.userInput,
          system_instruction: bundle.systemInstruction,
          previous_interaction_id: request.conversationId || undefined,
          response_format: bundle.responseFormat || undefined,
          response_mime_type: bundle.responseMimeType || undefined,
          generation_config: {
            thinking_level: resolved.thinkingLevel,
            max_output_tokens: resolved.maxOutputTokens,
          } as any,
        });

        const rawOutput = interaction.output_text || "";
        const latencyMs = Date.now() - startTime;

        // Parse usage metadata
        const usageRaw = (interaction as any).usage;
        const usage: TextUsageMetadata = {
          inputTokens: usageRaw?.total_input_tokens || usageRaw?.prompt_tokens || 0,
          outputTokens: usageRaw?.total_output_tokens || usageRaw?.candidates_tokens || 0,
          totalTokens: usageRaw?.total_tokens || 0,
        };

        // Output validation
        if (request.outputFormat === "json" || request.schema) {
          const validated = validateStructuredOutput(rawOutput, request.schema);
          if (!validated.isValid) {
            console.warn(`[GeminiTextAdapter] Structured output validation failed: ${validated.error}`);
            throw new Error(`Structured output validation failed: ${validated.error}`);
          }
          return {
            id: interaction.id || `txt_${Date.now()}`,
            task: request.task,
            text: validated.cleanText,
            structuredData: validated.structuredData,
            modelUsed: modelId,
            quality: resolved.quality,
            thinkingLevel: resolved.thinkingLevel,
            creditsCharged: resolved.creditsRequired,
            usage,
            latencyMs,
          };
        }

        const cleanText = sanitizeTextOutput(rawOutput);
        return {
          id: interaction.id || `txt_${Date.now()}`,
          task: request.task,
          text: cleanText,
          modelUsed: modelId,
          quality: resolved.quality,
          thinkingLevel: resolved.thinkingLevel,
          creditsCharged: resolved.creditsRequired,
          usage,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        const isQuota = err?.status === 429 || err?.message?.includes("RESOURCE_EXHAUSTED") || err?.message?.includes("quota");
        const isUnavailable = err?.status === 503 || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE");

        console.warn(`[GeminiTextAdapter] Model ${modelId} attempt ${attempt + 1} failed:`, err?.message || err);

        // If quota exhausted or service unavailable, try next fallback model immediately
        if (isQuota || isUnavailable) {
          break;
        }

        // Bounded retry for transient network glitches
        if (attempt + 1 < maxAttempts) {
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }

        break;
      }
    }
  }

  console.error("[GeminiTextAdapter] All text models failed:", lastError?.message || lastError);
  throw lastError || new Error("Text generation service is currently unavailable.");
}

/**
 * Async generator that yields text tokens from an Interactions API stream.
 * Filters out thought signatures and internal reasoning blocks.
 */
export async function* streamTextInteraction(
  options: GeminiAdapterOptions
): AsyncGenerator<{ text: string; done?: boolean; id?: string }> {
  const { request } = options;
  const ai = getServerAI();
  const resolved = resolveTextConfig(request.task, request.quality, request.thinkingLevel);
  const bundle = buildTextPromptBundle(request);

  const stream = await ai.interactions.create({
    model: resolved.model,
    input: bundle.userInput,
    system_instruction: bundle.systemInstruction,
    previous_interaction_id: request.conversationId || undefined,
    stream: true,
    generation_config: {
      thinking_level: resolved.thinkingLevel,
      max_output_tokens: resolved.maxOutputTokens,
    } as any,
  });

  let interactionId = "";

  for await (const chunk of stream as any) {
    if (chunk.event_type === "interaction.created" && chunk.interaction?.id) {
      interactionId = chunk.interaction.id;
    }

    // Yield delta text if present and not a thought signature
    if (chunk.delta) {
      if (chunk.delta.type === "thought_signature") {
        // Suppress internal model reasoning
        continue;
      }
      if (typeof chunk.delta.text === "string" && chunk.delta.text.length > 0) {
        yield { text: chunk.delta.text, id: interactionId };
      }
    }
  }

  yield { text: "", done: true, id: interactionId };
}
