/**
 * Presentation Model Policy & Resolver.
 * Connects the Presentation Engine to verified Gemini production models.
 * Uses gemini-3.8-flash as primary GA model with verified fallback chain (3.7-flash -> 2.5-flash).
 * Note: gemini-3.5-flash is omitted as it is not part of this project's verified production chain.
 */

import { getServerAI } from '../../infrastructure/gemini/serverGeminiClient.js';
import { serverConfig } from '../../config/env.js';

export type PresentationPolicyName = 'production' | 'pay_as_you_go' | 'enterprise' | 'cost_optimized' | 'high_quality';

export interface PresentationModelPolicy {
  name: PresentationPolicyName;
  primary: string;
  fallbacks: string[];
  tier?: 'free' | 'pay_as_you_go' | 'enterprise';
  maxRpm?: number;
}

export const PRESENTATION_MODEL_POLICIES: Record<PresentationPolicyName, PresentationModelPolicy> = {
  production: {
    name: 'production',
    primary: 'gemini-3.8-flash',
    fallbacks: ['gemini-3.7-flash', 'gemini-2.5-flash'],
    tier: 'free',
    maxRpm: 15
  },
  pay_as_you_go: {
    name: 'pay_as_you_go',
    primary: 'gemini-3.8-flash',
    fallbacks: ['gemini-3.7-flash', 'gemini-2.5-flash'],
    tier: 'pay_as_you_go',
    maxRpm: 1000
  },
  enterprise: {
    name: 'enterprise',
    primary: 'gemini-3.8-flash',
    fallbacks: ['gemini-3.7-flash'],
    tier: 'enterprise',
    maxRpm: 4000
  },
  cost_optimized: {
    name: 'cost_optimized',
    primary: 'gemini-3.7-flash',
    fallbacks: ['gemini-2.5-flash'],
    tier: 'pay_as_you_go',
    maxRpm: 1000
  },
  high_quality: {
    name: 'high_quality',
    primary: 'gemini-3.8-flash',
    fallbacks: ['gemini-3.7-flash'],
    tier: 'pay_as_you_go',
    maxRpm: 1000
  }
};

export const PRESENTATION_MODELS = PRESENTATION_MODEL_POLICIES.production;

export interface ResolvedPresentationModelConfig {
  stage: 'strategy' | 'content';
  policy: PresentationModelPolicy;
  model: string;
  fallbacks: string[];
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
  creditsRequired: number;
  maxOutputTokens: number;
  isPayAsYouGo: boolean;
}

export function resolvePresentationConfig(
  stage: 'strategy' | 'content',
  policyName?: PresentationPolicyName
): ResolvedPresentationModelConfig {
  // If no explicit policy specified, automatically pick pay_as_you_go when configured in env
  const effectivePolicyName: PresentationPolicyName =
    policyName ||
    (serverConfig.geminiBillingTier === 'pay_as_you_go' || serverConfig.geminiBillingTier === 'enterprise'
      ? serverConfig.geminiBillingTier
      : 'production');

  const policy = PRESENTATION_MODEL_POLICIES[effectivePolicyName] || PRESENTATION_MODEL_POLICIES.production;
  const isPayAsYouGo = policy.tier === 'pay_as_you_go' || policy.tier === 'enterprise';

  return {
    stage,
    policy,
    model: policy.primary,
    fallbacks: [...policy.fallbacks],
    // High thinking level unlocked for strategy stage on pay-as-you-go
    thinkingLevel: isPayAsYouGo ? (stage === 'strategy' ? 'high' : 'medium') : (stage === 'strategy' ? 'medium' : 'low'),
    creditsRequired: stage === 'strategy' ? 3 : 2, // Combined total = 5 credits
    maxOutputTokens: isPayAsYouGo ? 8192 : (stage === 'strategy' ? 4096 : 8192),
    isPayAsYouGo
  };
}

export interface ModelAvailabilityReport {
  model: string;
  status: 'available' | 'unavailable';
  latencyMs?: number;
  error?: string;
}

/**
 * Diagnostic utility to verify availability of configured presentation models with the active API key.
 */
export async function verifyPresentationModelAvailability(
  policyName: PresentationPolicyName = 'production'
): Promise<ModelAvailabilityReport[]> {
  const policy = PRESENTATION_MODEL_POLICIES[policyName] || PRESENTATION_MODEL_POLICIES.production;
  const models = [policy.primary, ...policy.fallbacks];
  const ai = getServerAI();
  const results: ModelAvailabilityReport[] = [];

  for (const model of models) {
    const start = Date.now();
    try {
      await ai.models.generateContent({
        model,
        contents: 'ping'
      });
      results.push({
        model,
        status: 'available',
        latencyMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        model,
        status: 'unavailable',
        latencyMs: Date.now() - start,
        error: err?.message || String(err)
      });
    }
  }

  return results;
}
