/**
 * Execution Queue & Durable Orchestrator Contracts for Video Gem.
 * Standardized interfaces for execution snapshots, shot-level jobs,
 * aggregated execution state, and lifecycle operations.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import { z } from 'zod';
import type { ProviderId } from './providerAdapterContracts.js';

export type ExecutionStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'partial_failure'
  | 'cancelled';

export type ShotJobExecutionState =
  | 'queued'
  | 'submitting'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ShotJobDetail {
  jobId: string;
  shotId: string;
  sequence: number;
  name: string;
  status: ShotJobExecutionState;
  provider: ProviderId;
  model: string;
  attemptCount: number;
  providerRequestId?: string;
  outputAssetId?: string;
  outputUrl?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  startedAt?: string;
  completedAt?: string;
}

export interface LaunchExecutionRequest {
  modelId: string;
  options?: {
    resolution?: '720p' | '1080p' | '4k';
    userPromptOverrides?: Record<string, string>;
    idempotencyKey?: string;
  };
}

export interface LaunchExecutionResponse {
  executionId: string;
  projectId: string;
  specVersion: number;
  specHash: string;
  status: ExecutionStatus;
  targetModel: string;
  targetProvider: ProviderId;
  totalDurationSeconds: number;
  creditCostEstimate: number;
  shotsCount: number;
  jobIds: string[];
  createdAt: string;
}

export interface ExecutionStatusResponse {
  executionId: string;
  projectId: string;
  specVersion: number;
  specHash: string;
  status: ExecutionStatus;
  targetModel: string;
  targetProvider: ProviderId;
  totalShots: number;
  completedShots: number;
  failedShots: number;
  progress: number;
  shots: ShotJobDetail[];
  createdAt: string;
  completedAt?: string;
}

export interface ExecutionSummaryItem {
  executionId: string;
  projectId: string;
  specVersion: number;
  status: ExecutionStatus;
  targetModel: string;
  targetProvider: ProviderId;
  shotsCount: number;
  completedShots: number;
  createdAt: string;
  completedAt?: string;
}

export interface CancelExecutionResponse {
  executionId: string;
  cancelledJobsCount: number;
  status: 'cancelled';
  creditsReleased: number;
}

export interface RetryShotResponse {
  executionId: string;
  shotId: string;
  newJobId: string;
  status: 'queued';
  attemptCount: number;
}

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

export const LaunchExecutionRequestZodSchema = z.object({
  modelId: z.string().min(1, 'modelId is required'),
  options: z
    .object({
      resolution: z.enum(['720p', '1080p', '4k']).optional(),
      userPromptOverrides: z.record(z.string()).optional(),
      idempotencyKey: z.string().optional()
    })
    .optional()
});

export const ExecutionStatusZodSchema = z.enum([
  'queued',
  'processing',
  'completed',
  'failed',
  'partial_failure',
  'cancelled'
]);

export const ShotJobExecutionStateZodSchema = z.enum([
  'queued',
  'submitting',
  'submitted',
  'processing',
  'completed',
  'failed',
  'cancelled'
]);
