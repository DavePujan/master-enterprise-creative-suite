/**
 * Canonical Video Generation Domain Types & Contracts.
 * Provider-neutral interfaces for multimodal video generation, conversational editing,
 * capability registry, and asynchronous job tracking.
 */

export type VideoCreationMode =
  | 'text_to_video'
  | 'image_to_video'
  | 'reference_to_video'
  | 'edit_video'
  | 'extend_video'
  | 'multi_shot';

export type VideoProductTier =
  | 'auto'
  | 'fast'
  | 'standard'
  | 'pro'
  | 'plus'
  | 'cinematic';

export type VideoEngineKey =
  | 'google-omni'
  | 'veo-pro'
  | 'veo-fast'
  | 'veo-lite'
  | 'kling-v3'
  | 'seedance-2';

export type VideoReferenceType =
  | 'product'
  | 'character'
  | 'person'
  | 'wardrobe'
  | 'object'
  | 'environment'
  | 'style'
  | 'motion_video'
  | 'audio'
  | 'brand_asset';

export interface VideoReference {
  assetId: string;
  type: VideoReferenceType;
  label: string;
  role?: string;
  url?: string;
  mimeType?: string;
}

export interface VideoScene {
  id: string;
  durationSeconds: number;
  timeRange: string;
  description: string;
  camera: string;
  subjectAction: string;
  environment?: string;
  audio?: string;
  transition?: string;
}

export type VideoAudioIntent =
  | 'none'
  | 'ambient'
  | 'music'
  | 'sfx'
  | 'dialogue'
  | 'dialogue_sfx'
  | 'cinematic_soundscape';

export interface VideoEngineCapability {
  engineKey: VideoEngineKey;
  modelId: string;
  provider: 'google' | 'fal';
  displayName: string;
  productTier: VideoProductTier;
  supportedModes: VideoCreationMode[];
  aspectRatios: string[];
  supportedDurations: (number | 'auto')[];
  supportedResolutions: ('720p' | '1080p' | '4k')[];
  supportsAudio: boolean;
  supportsDialogue: boolean;
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
  supportsReferenceVideos: boolean;
  maxReferenceVideos: number;
  supportsReferenceAudios: boolean;
  maxReferenceAudios: number;
  supportsElements: boolean;
  supportsMultiShot: boolean;
  supportsExtension: boolean;
  supportsConversationalEditing: boolean;
  supportsSeed: boolean;
  creditCost: number;
  status: 'AVAILABLE' | 'CONFIGURED' | 'UNAVAILABLE';
}

export interface VideoGenerationRequest {
  mode: VideoCreationMode;
  prompt: string;
  productTier?: VideoProductTier;
  selectedEngine?: VideoEngineKey;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9' | '4:3' | '3:4' | 'auto';
  durationSeconds?: number | 'auto';
  resolution?: '720p' | '1080p' | '4k';
  startFrameAssetId?: string;
  endFrameAssetId?: string;
  references?: VideoReference[];
  audioIntent?: VideoAudioIntent;
  generateAudio?: boolean;
  scenes?: VideoScene[];
  previousInteractionId?: string;
  editInstruction?: string;
  seed?: number;
}

export type VideoJobStatus =
  | 'queued'
  | 'preparing_references'
  | 'generating_motion'
  | 'synthesizing_audio'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'cancel_requested';

export type VideoCreditState = 'held' | 'captured' | 'released';

export interface VideoJob {
  jobId: string;
  id?: string;
  workspaceId: string;
  userId: string;
  mode: VideoCreationMode;
  engine: VideoEngineKey;
  productTier: VideoProductTier;
  provider: 'google' | 'fal';
  providerJobId?: string;
  reservationId: string;
  reservedCredits: number;
  creditState: VideoCreditState;
  status: VideoJobStatus;
  progress?: number;
  outputAssetId?: string;
  outputUrl?: string;
  resultUrl?: string;
  interactionId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoGenerationResult {
  assetId: string;
  url: string;
  provider: 'google' | 'fal';
  engine: VideoEngineKey;
  model: string;
  durationSeconds: number;
  aspectRatio: string;
  resolution: string;
  hasAudio: boolean;
  jobId: string;
  generationId: string;
  parentGenerationId?: string;
  interactionId?: string;
  metadata?: Record<string, any>;
  concept?: {
    visualPrompt: string;
    voiceOver?: string;
    musicStyle?: string;
    cinematographyNotes?: string;
  };
}

export interface VideoPlan {
  conceptTitle: string;
  creativeConcept: string;
  cinematicPrompt: string;
  recommendedEngine: VideoEngineKey;
  recommendedProductTier: VideoProductTier;
  recommendationReason: string;
  shotPlan: VideoScene[];
  cameraDirection: string;
  lightingDirection: string;
  subjectMotion: string;
  environmentMotion?: string;
  audioDirection?: string;
  dialogue?: string;
  suggestedAspectRatio: '16:9' | '9:16' | '1:1';
  suggestedDurationSeconds: number;
  constraints: string[];
}

export interface VideoAutoWriteRequest {
  topic: string;
  creativeTone?: string;
  platform?: 'instagram_reels' | 'tiktok' | 'youtube_shorts' | 'youtube_landscape' | 'cinema' | 'commercial';
  productName?: string;
  targetAudience?: string;
  idempotencyKey?: string;
}
