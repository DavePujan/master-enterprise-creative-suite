/**
 * Provider Adapter Contracts for Video Gem.
 * Standardized interfaces for provider-specific execution requests, normalized generation
 * results, error classifications, and adapter abstraction boundaries.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import { z } from 'zod';
import type {
  VideoAspectRatio,
  VideoResolution,
  CompiledReferenceBinding
} from './modelCapabilityContracts.js';

export type ProviderId = 'google' | 'fal' | 'seedance';

export type ProviderJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type NormalizedErrorCode =
  | 'INVALID_REQUEST'
  | 'UNSUPPORTED_CONFIGURATION'
  | 'AUTHENTICATION_ERROR'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'TIMEOUT'
  | 'CONTENT_REJECTED'
  | 'UNKNOWN_PROVIDER_ERROR';

export interface NormalizedProviderError {
  code: NormalizedErrorCode;
  message: string;
  rawError?: string;
  retryable: boolean;
  provider: ProviderId;
  model: string;
  retryAfterSeconds?: number;
}

export interface ProviderExecutionRequest {
  projectId: string;
  adId?: string;
  shotId: string;
  sequence: number;
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string;
  duration: number;
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  references: CompiledReferenceBinding[];
  settings?: Record<string, any>;
  workspaceId: string;
  idempotencyKey?: string;
}

export interface ProviderGenerationResult {
  provider: ProviderId;
  model: string;
  providerRequestId: string;
  status: ProviderJobStatus;
  outputUrl?: string;
  outputAssetId?: string;
  error?: NormalizedProviderError;
  progress?: number;
  metadata?: Record<string, any>;
}

export interface ProviderAdapter {
  readonly provider: ProviderId;
  supportsModel(modelId: string): boolean;
  submit(request: ProviderExecutionRequest): Promise<ProviderGenerationResult>;
  checkStatus(providerRequestId: string, model: string): Promise<ProviderGenerationResult>;
  cancel(providerRequestId: string, model: string): Promise<boolean>;
}

export interface ProviderStatusReport {
  provider: ProviderId;
  displayName: string;
  isConfigured: boolean;
  supportedModels: string[];
  features: string[];
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const NormalizedErrorCodeZodSchema = z.enum([
  'INVALID_REQUEST',
  'UNSUPPORTED_CONFIGURATION',
  'AUTHENTICATION_ERROR',
  'RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'TIMEOUT',
  'CONTENT_REJECTED',
  'UNKNOWN_PROVIDER_ERROR'
]);

export const NormalizedProviderErrorZodSchema = z.object({
  code: NormalizedErrorCodeZodSchema,
  message: z.string(),
  rawError: z.string().optional(),
  retryable: z.boolean(),
  provider: z.enum(['google', 'fal', 'seedance']),
  model: z.string(),
  retryAfterSeconds: z.number().optional()
});

export const ProviderExecutionRequestZodSchema = z.object({
  projectId: z.string(),
  adId: z.string().optional(),
  shotId: z.string(),
  sequence: z.number().int().positive(),
  provider: z.enum(['google', 'fal', 'seedance']),
  model: z.string(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  duration: z.number().positive(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5', '21:9']),
  resolution: z.enum(['720p', '1080p', '4k']),
  references: z.array(
    z.object({
      assetId: z.string(),
      url: z.string(),
      role: z.enum(['first_frame', 'last_frame', 'character_ref', 'product_ref', 'location_ref', 'style_ref']),
      type: z.enum(['character', 'product', 'location', 'prop', 'style']),
      label: z.string(),
      targetEntityId: z.string().optional()
    })
  ),
  settings: z.record(z.any()).optional(),
  workspaceId: z.string(),
  idempotencyKey: z.string().optional()
});

export const ProviderGenerationResultZodSchema = z.object({
  provider: z.enum(['google', 'fal', 'seedance']),
  model: z.string(),
  providerRequestId: z.string(),
  status: z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled']),
  outputUrl: z.string().optional(),
  outputAssetId: z.string().optional(),
  error: NormalizedProviderErrorZodSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional()
});
