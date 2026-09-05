/**
 * Provider-Neutral Structured LLM Gateway for Campaign Strategist 2.0.
 * Orchestrates multi-model Google Gemini execution with billing-tier awareness,
 * pool rotation, and automatic failover to Fal AI structured inference.
 */

import {
  getServerAI,
  getGeminiBillingContext,
  rotateGeminiClient
} from '../../infrastructure/gemini/serverGeminiClient.js';
import { resolveFalKey } from '../../infrastructure/fal/falClient.js';
import { serverConfig } from '../../config/env.js';

export interface CampaignLLMParams<T> {
  generationId: string;
  stage: 'discovery' | 'territories' | 'synthesis' | 'critic';
  systemInstruction: string;
  userInput: string;
  responseSchema?: any;
  semanticValidator?: (parsed: any) => { isValid: boolean; errors?: string[] };
  temperature?: number;
  timeoutMs?: number;
}

export interface CampaignLLMResult<T> {
  data: T;
  provider: 'google' | 'fal';
  modelUsed: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

export class CampaignLLMGateway {
  private readonly GOOGLE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.7-flash',
    'gemini-2.5-flash'
  ];
  private readonly DEFAULT_TIMEOUT_MS = 120000; // 120s budget
  private readonly PER_ATTEMPT_TIMEOUT_MS = 60000;

  async executeStructured<T>(params: CampaignLLMParams<T>): Promise<CampaignLLMResult<T>> {
    const {
      generationId,
      stage,
      systemInstruction,
      userInput,
      responseSchema,
      semanticValidator,
      temperature = 0.7,
      timeoutMs = this.DEFAULT_TIMEOUT_MS
    } = params;

    const startTime = Date.now();
    const billing = getGeminiBillingContext();
    const globalDeadline = startTime + timeoutMs;

    console.log(
      `[CampaignLLMGateway] [gen:${generationId.slice(0, 8)}] Starting stage: ${stage} (Billing Tier: ${billing.tier}, Key: ${billing.keySource})`
    );

    let lastError: any = null;

    // 1. Primary Chain: Google Gemini with model fallbacks
    for (let i = 0; i < this.GOOGLE_MODELS.length; i++) {
      if (Date.now() >= globalDeadline) break;

      const model = this.GOOGLE_MODELS[i];
      const isFallback = i > 0;
      const attemptStart = Date.now();

      try {
        console.log(
          `[CampaignLLMGateway] Trying Google model: ${model}${isFallback ? ' (FALLBACK)' : ''}`
        );

        const ai = getServerAI();
        const abortController = new AbortController();
        const timeoutHandle = setTimeout(() => abortController.abort(), this.PER_ATTEMPT_TIMEOUT_MS);

        const config: any = {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature,
          abortSignal: abortController.signal
        };
        if (responseSchema) {
          config.responseSchema = responseSchema;
        }

        const response = await ai.models.generateContent({
          model,
          contents: userInput,
          config
        });

        clearTimeout(timeoutHandle);
        const text = response.text;
        if (!text || !text.trim()) {
          throw new Error(`Empty response returned from Google model ${model}`);
        }

        const parsed = this.cleanAndParseJSON(text);

        if (semanticValidator) {
          const validation = semanticValidator(parsed);
          if (!validation.isValid) {
            throw new Error(`Semantic validation failed: ${(validation.errors || []).join('; ')}`);
          }
        }

        const latencyMs = Date.now() - attemptStart;
        console.log(`[CampaignLLMGateway] Success with Google model ${model} (${latencyMs}ms)`);

        return {
          data: parsed as T,
          provider: 'google',
          modelUsed: model,
          latencyMs,
          fallbackUsed: isFallback
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[CampaignLLMGateway] Google model ${model} failed: ${errMsg}`);

        // Rotate key if quota or rate limit
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.log('[CampaignLLMGateway] Rate limit detected, rotating Gemini client...');
          rotateGeminiClient();
        }
      }
    }

    // 2. Secondary Chain: Fal AI Structured LLM Inference Fallback
    const falKey = resolveFalKey();
    if (falKey) {
      console.log('[CampaignLLMGateway] Google chain exhausted. Attempting Fal AI fallback...');
      const falStart = Date.now();
      try {
        const falResult = await this.executeFalLLM<T>({
          falKey,
          systemInstruction,
          userInput,
          temperature,
          semanticValidator
        });

        const latencyMs = Date.now() - falStart;
        console.log(`[CampaignLLMGateway] Success with Fal AI provider (${latencyMs}ms)`);

        return {
          data: falResult,
          provider: 'fal',
          modelUsed: 'fal-ai/any-llm',
          latencyMs,
          fallbackUsed: true
        };
      } catch (falErr: any) {
        console.error('[CampaignLLMGateway] Fal AI fallback failed:', falErr?.message || falErr);
        lastError = falErr;
      }
    }

    throw new Error(
      `Campaign LLM generation failed across all providers. Last error: ${lastError?.message || 'Unknown'}`
    );
  }

  private cleanAndParseJSON(raw: string): any {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = 0;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace !== -1) {
        cleaned = cleaned.slice(startIdx, lastBrace + 1);
      }
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      const lastBracket = cleaned.lastIndexOf(']');
      if (lastBracket !== -1) {
        cleaned = cleaned.slice(startIdx, lastBracket + 1);
      }
    }

    return JSON.parse(cleaned);
  }

  private async executeFalLLM<T>(options: {
    falKey: string;
    systemInstruction: string;
    userInput: string;
    temperature: number;
    semanticValidator?: (parsed: any) => { isValid: boolean; errors?: string[] };
  }): Promise<T> {
    const { falKey, systemInstruction, userInput, temperature, semanticValidator } = options;

    const payload = {
      prompt: `${systemInstruction}\n\nUser Request:\n${userInput}\n\nIMPORTANT: Return ONLY valid JSON matching the requested structure. No markdown fences.`,
      model: 'openai/gpt-4o-mini',
      temperature,
      max_tokens: 4096
    };

    const response = await fetch('https://fal.run/fal-ai/any-llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${falKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fal Any-LLM call failed (${response.status}): ${errText}`);
    }

    const jsonRes = await response.json();
    const outputText = jsonRes.output || jsonRes.text || jsonRes.choices?.[0]?.message?.content || jsonRes.message;
    if (!outputText) {
      throw new Error('Fal Any-LLM returned empty output payload');
    }

    const parsed = this.cleanAndParseJSON(outputText);
    if (semanticValidator) {
      const validation = semanticValidator(parsed);
      if (!validation.isValid) {
        throw new Error(`Fal LLM semantic validation failed: ${(validation.errors || []).join('; ')}`);
      }
    }

    return parsed as T;
  }
}

export const campaignLLMGateway = new CampaignLLMGateway();
