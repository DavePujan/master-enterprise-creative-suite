/**
 * Model Capability & Prompt Compiler Contracts for Video Gem.
 * Provider-neutral specifications for model capabilities, pre-flight validation,
 * provider-specific execution payloads, and project execution plans.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import { z } from 'zod';

export type VideoProviderId =
  | 'google'
  | 'fal'
  | 'runway'
  | 'kling'
  | 'luma'
  | 'seedance'
  | 'minimax';

export type VideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
export type VideoResolution = '720p' | '1080p' | '4k';

export interface ModelCapability {
  provider: VideoProviderId;
  model: string; // e.g. "veo_3_1_pro", "kling_v3", "runway_gen3"
  displayName: string;
  supported_durations: number[]; // e.g. [4, 6, 8] or [5, 10]
  aspect_ratios: VideoAspectRatio[];
  resolutions: VideoResolution[];
  max_references: number;
  image_to_video: boolean;
  first_frame: boolean;
  last_frame: boolean;
  character_reference: boolean;
  audio: boolean; // native generation
  camera_control: boolean;
  motion_strength: boolean;
  negative_prompt: boolean;
  max_prompt_length: number; // character limit
  credit_cost: number;
  status: 'AVAILABLE' | 'CONFIGURED' | 'DEPRECATED';
  other_capabilities?: Record<string, any>;
}

export type CompatibilityViolationSeverity = 'blocker' | 'warning';

export interface CompatibilityViolation {
  code: string;
  severity: CompatibilityViolationSeverity;
  shotId?: string;
  message: string;
  requirement?: any;
  capability?: any;
  actionSuggestion?: string;
}

export interface ShotCompatibilityReport {
  shotId: string;
  compatible: boolean;
  blockers: CompatibilityViolation[];
  warnings: CompatibilityViolation[];
}

export interface ProjectCompatibilityReport {
  projectId: string;
  specVersion: number;
  modelId: string;
  provider: string;
  compatible: boolean;
  totalShots: number;
  compatibleShotsCount: number;
  blockers: CompatibilityViolation[];
  warnings: CompatibilityViolation[];
  shotReports: Record<string, ShotCompatibilityReport>;
}

export interface CompiledReferenceBinding {
  assetId: string;
  url: string;
  role: 'first_frame' | 'last_frame' | 'character_ref' | 'product_ref' | 'location_ref' | 'style_ref';
  type: 'character' | 'product' | 'location' | 'prop' | 'style';
  label: string;
  targetEntityId?: string;
}

export interface CompiledShotExecutionPayload {
  provider: string;
  model: string;
  shotId: string;
  sequence: number;
  prompt: string;
  negativePrompt?: string;
  references: CompiledReferenceBinding[];
  duration: number;
  aspectRatio: string;
  resolution: string;
  settings: Record<string, any>;
  directorPrompt: {
    humanReadableExplanation: string;
    creativeIntent: string;
  };
}

export interface AdProjectExecutionPlan {
  projectId: string;
  adId: string;
  specVersion: number;
  targetModel: string;
  targetProvider: string;
  shots: CompiledShotExecutionPayload[];
  totalDurationSeconds: number;
  readiness: 'READY' | 'BLOCKED' | 'WARNINGS';
  blockers: CompatibilityViolation[];
  warnings: CompatibilityViolation[];
  compiledAt: string;
  estimatedCreditCost: number;
}

// =============================================================================
// ZOD SCHEMAS FOR VALIDATION & REQUESTS
// =============================================================================

export const ModelCapabilityZodSchema = z.object({
  provider: z.enum(['google', 'fal', 'runway', 'kling', 'luma', 'seedance', 'minimax']),
  model: z.string().min(1),
  displayName: z.string().min(1),
  supported_durations: z.array(z.number().positive()),
  aspect_ratios: z.array(z.enum(['16:9', '9:16', '1:1', '4:5', '21:9'])),
  resolutions: z.array(z.enum(['720p', '1080p', '4k'])),
  max_references: z.number().int().nonnegative(),
  image_to_video: z.boolean(),
  first_frame: z.boolean(),
  last_frame: z.boolean(),
  character_reference: z.boolean(),
  audio: z.boolean(),
  camera_control: z.boolean(),
  motion_strength: z.boolean(),
  negative_prompt: z.boolean(),
  max_prompt_length: z.number().int().positive(),
  credit_cost: z.number().nonnegative(),
  status: z.enum(['AVAILABLE', 'CONFIGURED', 'DEPRECATED']),
  other_capabilities: z.record(z.any()).optional()
});

export const ValidateCompatibilityRequestZodSchema = z.object({
  modelId: z.string().min(1)
});

export const CompileExecutionPlanRequestZodSchema = z.object({
  modelId: z.string().min(1),
  resolution: z.enum(['720p', '1080p', '4k']).optional().default('1080p'),
  userPromptOverrides: z.record(z.string()).optional()
});
