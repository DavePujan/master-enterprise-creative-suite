/**
 * Text Model & Thinking Policy Resolver.
 * Centralizes approved model configurations, task tiering, and server-authoritative credit rates.
 */

import type { TextTask, TextQuality, TextThinkingLevel } from "@shared-types/textGeneration.js";

export interface ResolvedTextConfig {
  task: TextTask;
  quality: TextQuality;
  model: string;
  fallbacks: string[];
  thinkingLevel: TextThinkingLevel;
  creditsRequired: number;
  maxOutputTokens: number;
}

export const TEXT_MODELS = {
  // Fast tier: Lightweight, fast transformations & short metadata
  fast: "gemini-3.5-flash",
  // Standard tier: Production default for captions, copy, briefs
  standard: "gemini-3.8-flash",
  // Premium tier: Deep strategy, complex multi-angle planning
  premium: "gemini-3.8-flash",
} as const;

export const TEXT_FALLBACKS: Record<string, string[]> = {
  "gemini-3.8-flash": ["gemini-3.7-flash", "gemini-3.5-flash"],
  "gemini-3.7-flash": ["gemini-3.5-flash"],
  "gemini-3.5-flash": ["gemini-3.7-flash"],
};

/**
 * Server-authoritative mapping of task and requested quality to exact model,
 * thinking budget, and non-negotiable credit cost.
 */
export function resolveTextConfig(
  task: TextTask,
  requestedQuality?: TextQuality,
  requestedThinking?: TextThinkingLevel
): ResolvedTextConfig {
  // 1. Resolve Quality Tier
  let quality: TextQuality = requestedQuality || "standard";
  if (task === "title") {
    quality = "fast";
  } else if (task === "strategy") {
    quality = requestedQuality === "fast" ? "standard" : "premium";
  }

  // 2. Resolve Primary Model and Fallback Chain
  const primaryModel = TEXT_MODELS[quality] || TEXT_MODELS.standard;
  const fallbacks = TEXT_FALLBACKS[primaryModel] || ["gemini-3.7-flash", "gemini-3.5-flash"];

  // 3. Server-Controlled Thinking Level (clients cannot arbitrarily request max thinking)
  let thinkingLevel: TextThinkingLevel = "low";
  if (task === "title") {
    thinkingLevel = "minimal";
  } else if (task === "caption") {
    thinkingLevel = requestedThinking === "minimal" ? "minimal" : "low";
  } else if (task === "copy" || task === "manifesto") {
    thinkingLevel = requestedThinking === "medium" ? "medium" : "low";
  } else if (task === "strategy" || task === "brief") {
    thinkingLevel = quality === "premium" ? "medium" : "low";
  }

  // 4. Server-Authoritative Credits Required
  let creditsRequired = 1;
  if (quality === "premium" || task === "strategy") {
    creditsRequired = 2;
  }

  // 5. Output Bounds based on Task
  let maxOutputTokens = 2048;
  switch (task) {
    case "title":
      maxOutputTokens = 128;
      break;
    case "caption":
      maxOutputTokens = 1024;
      break;
    case "copy":
    case "manifesto":
      maxOutputTokens = 2048;
      break;
    case "strategy":
    case "brief":
      maxOutputTokens = 4096;
      break;
    default:
      maxOutputTokens = 2048;
  }

  return {
    task,
    quality,
    model: primaryModel,
    fallbacks,
    thinkingLevel,
    creditsRequired,
    maxOutputTokens,
  };
}
