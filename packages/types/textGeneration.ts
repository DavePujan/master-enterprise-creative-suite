/**
 * Pure domain contracts for the Text Generation V2 Engine.
 * Framework-free: MUST NOT import React, Express, Supabase, or vendor SDKs.
 */

export type TextTask =
  | 'caption'
  | 'copy'
  | 'strategy'
  | 'manifesto'
  | 'brief'
  | 'title'
  | 'general';

export type TextQuality = 'fast' | 'standard' | 'premium';

export type TextThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export type TextOutputFormat = 'text' | 'json';

export interface TextAssetReference {
  id?: string;
  type: 'image' | 'doc' | 'product_context' | 'face_context' | 'ingredient_context';
  name?: string;
  data?: string; // base64 / data URL
  url?: string;
  mimeType?: string;
}

export interface BrandContextSnapshot {
  name?: string;
  industry?: string;
  tone?: string;
  pillars?: string[];
  colors?: string[];
  location?: string;
  targetAudience?: string;
  approvedTerminology?: string[];
  prohibitedTerms?: string[];
  visualEthnicityStyle?: string;
  voiceAccentStyle?: string;
}

export interface NormalizedTextRequest {
  task: TextTask;
  input: string;
  quality?: TextQuality;
  outputFormat?: TextOutputFormat;
  schema?: Record<string, unknown>;
  thinkingLevel?: TextThinkingLevel;
  stream?: boolean;
  conversationId?: string;
  targetLanguage?: string;
  platform?: string; // e.g. 'instagram', 'linkedin', 'twitter', 'email'
  brandContext?: BrandContextSnapshot;
  multimodalAssets?: TextAssetReference[];
  systemInstructionHint?: string;
}

export interface TextUsageMetadata {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  providerCostMicrounits?: number;
}

export interface NormalizedTextResult {
  id: string;
  task: TextTask;
  text: string;
  structuredData?: unknown;
  modelUsed: string;
  quality: TextQuality;
  thinkingLevel: TextThinkingLevel;
  creditsCharged: number;
  usage?: TextUsageMetadata;
  latencyMs: number;
  groundingMetadata?: unknown;
  streamed?: boolean;
}
