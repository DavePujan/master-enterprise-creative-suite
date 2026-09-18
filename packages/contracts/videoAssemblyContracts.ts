/**
 * Video Gem — AI Advertising Director
 * Phase 10: Final Assembly + Render + Export Contracts & Schemas
 */

import { z } from 'zod';

export type AssemblyTransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe';
export type AssemblyAudioType = 'voiceover' | 'music' | 'sfx';
export type OriginalAudioMode = 'keep' | 'mute' | 'mix';
export type LogoPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
export type CtaType = 'text' | 'end_card_asset' | 'composite';
export type RenderJobStatus = 'queued' | 'claimed' | 'rendering' | 'validating' | 'completed' | 'failed' | 'cancelled';
export type AssemblyStatus = 'draft' | 'validated' | 'rendering' | 'completed' | 'failed' | 'cancelled';
export type ExportPresetName = 'master_1080x1920' | 'master_1920x1080' | 'vertical_720p' | 'square_1x1' | 'landscape_16x9';

export interface AssemblyShotItem {
  shotId: string;
  sequence: number;
  order: number;
  acceptedResultId: string;
  acceptedAttemptId?: string;
  attemptNumber: number;
  outputAssetId: string;
  storagePath: string;
  sourceDurationSeconds: number;
  trimStartSeconds: number;
  trimStart?: number;
  trimEndSeconds: number;
  trimEnd?: number;
  playbackDurationSeconds: number;
  playbackDuration?: number;
  originalAudioMode: OriginalAudioMode;
  originalAudioVolume?: number; // 0.0 - 1.0 (default 1.0 if mix/keep)
}

export interface AssemblyTransitionItem {
  fromShotId: string;
  toShotId: string;
  type: AssemblyTransitionType;
  durationSeconds: number; // e.g. 0.5s (0 for cut)
  duration?: number;
}

export interface AssemblyAudioTrack {
  id: string;
  type: AssemblyAudioType;
  assetId?: string;
  storagePath?: string;
  url?: string;
  startTimeSeconds: number;
  endTimeSeconds?: number;
  volume: number; // 0.0 - 1.0 (default 1.0)
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  loop?: boolean;
  ducking?: {
    enabled: boolean;
    duckVolume: number; // e.g. 0.25 (reduce to 25% while voiceover speaks)
    fadeDurationSeconds: number; // e.g. 0.3s
  };
}

export interface AssemblyStructuredAudio {
  voiceover?: {
    enabled: boolean;
    volume: number;
    assetId?: string;
  };
  music?: {
    enabled: boolean;
    volume: number;
    fadeOutDuration?: number;
    assetId?: string;
  };
  originalShotAudio: string;
  soundEffects: Array<{
    id: string;
    assetId?: string;
    startTimeSeconds: number;
    volume?: number;
  }>;
}

export interface AssemblyTimingSummary {
  totalTargetDuration: number;
  calculatedDuration: number;
}

export interface AssemblyCaptionItem {
  id: string;
  text: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  position?: 'bottom' | 'center' | 'top';
  style?: {
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
  };
}

export interface AssemblyLogoOverlay {
  enabled: boolean;
  assetId?: string;
  storagePath?: string;
  position: LogoPosition;
  scalePercent: number; // 1 - 100 (e.g. 15%)
  scale?: number; // alias
  opacity: number; // 0.0 - 1.0 (default 1.0)
  startTimeSeconds: number;
  endTimeSeconds?: number; // optional, defaults to entire video duration
}

export interface AssemblyCtaCard {
  enabled: boolean;
  type: CtaType;
  text?: string;
  headline?: string; // alias
  subheadline?: string;
  actionIntent?: string;
  assetId?: string;
  storagePath?: string;
  startTimeSeconds?: number;
  durationSeconds?: number; // e.g. 3.0s
  duration?: number; // alias
}

export interface AssemblyOutputConfig {
  width: number;
  height: number;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  frameRate: number; // e.g. 30
  fps?: number; // alias
  videoCodec: 'h264' | 'h265';
  audioCodec: 'aac';
  container: 'mp4' | 'webm';
  targetBitrateKbps?: number;
  targetDurationSeconds: number;
}

export interface AssemblySpec {
  id: string;
  projectId: string;
  executionId: string;
  sourceExecutionSnapshotId: string;
  specVersion: number;
  specHash: string;
  adSpecVersion: number;
  adSpecHash: string;
  shots: AssemblyShotItem[];
  transitions: AssemblyTransitionItem[];
  audioTracks: AssemblyAudioTrack[];
  audio?: AssemblyStructuredAudio;
  timing?: AssemblyTimingSummary;
  captions: AssemblyCaptionItem[];
  logo?: AssemblyLogoOverlay;
  cta?: AssemblyCtaCard;
  output: AssemblyOutputConfig;
  requestedVariants: Array<'vertical_720p' | 'square_1x1' | 'landscape_16x9'>;
  createdAt: string;
}

export interface AssemblyValidationIssue {
  code: string;
  severity: 'BLOCKER' | 'WARNING';
  dimension: string;
  message: string;
  details?: Record<string, any>;
}

export interface AssemblyValidationReport {
  valid: boolean;
  isValid?: boolean; // alias for valid
  totalChecks: number;
  passedChecks: number;
  blockers: AssemblyValidationIssue[];
  errors?: AssemblyValidationIssue[]; // alias for blockers
  warnings: AssemblyValidationIssue[];
  validatedAt: string;
}

export interface AssemblyRecord {
  id: string;
  projectId: string;
  executionId: string;
  workspaceId: string;
  version: number;
  assemblyHash: string;
  status: AssemblyStatus;
  assemblySpec: AssemblySpec;
  spec?: AssemblySpec;
  sourceExecutionSnapshotId?: string;
  adSpecVersion?: number;
  adSpecHash?: string;
  validationReport: AssemblyValidationReport;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderJobRecord {
  id: string;
  assemblyId: string;
  jobId?: string;
  workerJobId?: string;
  workspaceId: string;
  renderType: 'master' | 'variant';
  status: RenderJobStatus;
  outputAssetId?: string;
  outputUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fileSizeBytes?: number;
  renderProgress: number; // 0 - 100
  progressPercent?: number;
  progressStep?: string;
  step?: string;
  errorMessage?: string;
  storagePath?: string;
  metadata?: Record<string, any>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ExportVariantRecord {
  id: string;
  renderId: string;
  workspaceId: string;
  presetName: ExportPresetName;
  preset?: ExportPresetName;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  outputAssetId?: string;
  outputUrl?: string;
  storagePath?: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileSizeBytes?: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AssemblyStatusResponse {
  assembly: AssemblyRecord;
  masterRender?: RenderJobRecord | null;
  masterAssetUrl?: string | null;
  exports: ExportVariantRecord[];
  variants?: ExportVariantRecord[];
  job?: RenderJobRecord;
  lineage: {
    projectId: string;
    executionSnapshotId: string;
    specVersion: number;
    specHash: string;
    assemblyVersion: number;
    assemblyHash: string;
    shotsCount: number;
    acceptedAttempts: Array<{ shotId: string; attemptNumber: number; assetId: string }>;
  };
}

export type ExportPreset = ExportPresetName;

export interface CreateAssemblyResponse {
  assembly: AssemblyRecord;
  validation: AssemblyValidationReport;
  activeRenderJob?: RenderJobRecord | null;
}

export interface RenderAssemblyRequest {
  requestedVariants?: Array<'vertical_720p' | 'square_1x1' | 'landscape_16x9'>;
  forceRerender?: boolean;
}

export interface RenderAssemblyResponse {
  job: RenderJobRecord;
}

export interface AssemblyRenderStatusResponse extends AssemblyStatusResponse {
  job?: RenderJobRecord;
  variants: ExportVariantRecord[];
}

export interface AssemblyExportsResponse {
  variants: ExportVariantRecord[];
  exports: ExportVariantRecord[];
}

export interface RequestExportVariantRequest {
  preset: ExportPresetName;
}

export interface CancelRenderResponse {
  success: boolean;
  status: string;
  job?: RenderJobRecord;
}

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

export const CreateAssemblyRequestZodSchema = z.object({
  options: z.object({
    outputAspectRatio: z.enum(['9:16', '16:9', '1:1', '4:5']).optional(),
    resolution: z.enum(['720p', '1080p']).optional(),
    customShotOrder: z.array(z.string()).optional(),
    includeLogo: z.boolean().optional(),
    includeCta: z.boolean().optional(),
    requestedVariants: z.array(z.enum(['vertical_720p', 'square_1x1', 'landscape_16x9'])).optional()
  }).optional()
});

export const EnqueueRenderRequestZodSchema = z.object({
  requestedVariants: z.array(z.enum(['vertical_720p', 'square_1x1', 'landscape_16x9'])).optional(),
  forceRerender: z.boolean().optional()
});

export const RequestExportVariantZodSchema = z.object({
  preset: z.enum(['vertical_720p', 'square_1x1', 'landscape_16x9'])
});
