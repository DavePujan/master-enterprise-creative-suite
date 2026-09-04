/**
 * Provider-agnostic Voiceover / TTS Abstractions.
 * Decouples application domain logic from provider-specific APIs (Google vs fal.ai).
 */

export interface VoicePerformance {
  emotion?: string;
  pace?: string;
  accent?: string;
  style?: string;
  tags?: string[];
  tagsEnabled?: boolean;
}

export interface VoiceProviderSpeaker {
  name: string;
  voice: string;
}

export interface VoiceProviderRequest {
  transcript: string;
  speakers: VoiceProviderSpeaker[];
  speakerMode: 'single' | 'two-speaker';
  performance: VoicePerformance;
  language?: string;
  outputFormat?: 'mp3' | 'wav' | 'ogg_opus';
  brandContext?: {
    name?: string;
    location?: string;
  };
  clientKey?: string;
}

export interface VoiceGenerationResult {
  audio: {
    bytes: Buffer;
    mimeType: string;
    durationSeconds: number;
  };
  provider: 'google' | 'fal';
  model: string;
  requestId?: string;
  voice: string;
  language?: string;
  providerCost?: {
    amount: number;
    currency: string;
    billingUnit: string;
  };
  metadata?: Record<string, unknown>;
}

export interface TtsFailoverState {
  primaryProvider: 'google' | 'fal';
  primaryModel: string;
  fallbackUsed: boolean;
  fallbackProvider?: 'google' | 'fal';
  fallbackModel?: string;
  fallbackReason?: string;
  retryCount: number;
  providerRequestId?: string;
}

export interface VoiceProvider {
  readonly providerName: 'google' | 'fal';
  readonly modelId: string;
  synthesize(request: VoiceProviderRequest): Promise<VoiceGenerationResult>;
}
