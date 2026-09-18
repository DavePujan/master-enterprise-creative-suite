/**
 * Provider Adapter Registry & Factory for Video Gem.
 * Routes execution requests to the appropriate provider adapter based on provider or model ID.
 * Validates consistency with the Model Capability Registry.
 */

import type {
  ProviderAdapter,
  ProviderId,
  ProviderStatusReport
} from '@contracts/providerAdapterContracts.js';
import { googleAdapter, GoogleAdapter } from './google/googleAdapter.js';
import { falAdapter, FalAdapter } from './fal/falAdapter.js';
import { seedanceAdapter, SeedanceAdapter } from './seedance/seedanceAdapter.js';

export class ProviderAdapterRegistry {
  private adapters: Map<ProviderId, ProviderAdapter> = new Map();

  constructor() {
    this.registerAdapter(googleAdapter);
    this.registerAdapter(falAdapter);
    this.registerAdapter(seedanceAdapter);
  }

  public registerAdapter(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  public getAdapterForProvider(provider: ProviderId): ProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No provider adapter registered for provider "${provider}". Registered providers: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return adapter;
  }

  public getAdapterForModel(modelId: string): ProviderAdapter {
    for (const adapter of this.adapters.values()) {
      if (adapter.supportsModel(modelId)) {
        return adapter;
      }
    }

    // Default heuristics based on recognized model naming
    if (modelId.startsWith('veo_') || modelId.includes('google')) {
      return this.getAdapterForProvider('google');
    }
    if (modelId.startsWith('seedance') || modelId.includes('seedance')) {
      return this.getAdapterForProvider('seedance');
    }
    if (
      modelId.startsWith('kling') ||
      modelId.startsWith('runway') ||
      modelId.startsWith('luma') ||
      modelId.startsWith('minimax') ||
      modelId.startsWith('haiper')
    ) {
      return this.getAdapterForProvider('fal');
    }

    throw new Error(`No provider adapter registered for model "${modelId}". Supported providers: google (veo), fal (kling, runway, luma, minimax), seedance (via fal).`);
  }

  public getAllAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Returns operational status reports for each provider without leaking secrets.
   */
  public getProviderStatusReports(): ProviderStatusReport[] {
    const hasGoogleKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
    const hasFalKey = Boolean(process.env.FAL_KEY || process.env.FAL_API_KEY);

    return [
      {
        provider: 'google',
        displayName: 'Google Veo (DeepMind)',
        isConfigured: hasGoogleKey,
        supportedModels: ['veo_3_1_pro', 'veo_3_1_fast', 'veo_lite'],
        features: ['First-frame keyframe', 'Last-frame guidance', 'Native audio', 'Camera control']
      },
      {
        provider: 'fal',
        displayName: 'Fal.ai Video Queue',
        isConfigured: hasFalKey,
        supportedModels: ['kling_v3', 'runway_gen3', 'luma_dream_machine_1_6', 'minimax_hailuo'],
        features: ['Kling 3.0 Ultra', 'Runway Gen-3 Alpha', 'Motion control', 'Negative prompt']
      },
      {
        provider: 'seedance',
        displayName: 'ByteDance Seedance 2.0 (via Fal.ai API)',
        isConfigured: hasFalKey,
        supportedModels: ['seedance_2_0'],
        features: ['Multimodal array references (up to 9)', 'E-commerce product focus', 'Fal API gateway']
      }
    ];
  }
}

export const providerAdapterRegistry = new ProviderAdapterRegistry();
