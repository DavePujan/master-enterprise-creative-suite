/**
 * Centralized Operational Tier Policy.
 * Decouples product rules and infrastructure capabilities from provider plan constraints.
 * Pure domain interfaces: zero vendor SDK dependencies.
 */

export interface QuotaEscalationPolicy {
  warningThresholdPercent: number;    // 80%: Operational alert
  highWarningThresholdPercent: number; // 90%: Aggressive alert
  criticalThrottlePercent: number;    // 95%: Throttle nonessential background jobs
  emergencyUpgradePercent: number;    // 100%: Read-only protection / upgrade required
}

export interface TierOperationalPolicy {
  // Product-defined rules
  productMaxVideoBytes: number;
  productMaxImageBytes: number;
  productMaxAudioBytes: number;
  productMaxDocBytes: number;

  // Provider-plan capabilities (Supabase Free Tier)
  providerMaxFileBytes: number;
  providerMaxDbDiskBytes: number;
  providerMaxStorageBytes: number;
  providerMaxEgressBytes: number;
  providerMaxConcurrentRealtime: number;

  // Effective runtime limits: min(Product, Provider)
  effectiveMaxVideoBytes: number;
  effectiveMaxImageBytes: number;
  effectiveMaxAudioBytes: number;
  effectiveMaxDocBytes: number;

  // Client resource budgets
  maxRealtimeChannelsPerClient: number;
  historyRetentionDays: number;

  // Multi-tier escalation thresholds
  quotaEscalation: QuotaEscalationPolicy;
}

const PRODUCT_MAX_VIDEO = 200 * 1024 * 1024; // 200 MB product policy
const PRODUCT_MAX_IMAGE = 25 * 1024 * 1024;  // 25 MB product policy
const PRODUCT_MAX_AUDIO = 50 * 1024 * 1024;  // 50 MB product policy
const PRODUCT_MAX_DOC = 10 * 1024 * 1024;    // 10 MB product policy

const SUPABASE_FREE_MAX_FILE = 50 * 1024 * 1024; // 50 MB global upload ceiling on Free Tier

/**
 * Active Operational Limits for Supabase Free Tier.
 * Easily adjusted or relaxed via environment/configuration upon plan upgrade without changing business logic.
 */
export const CURRENT_TIER_POLICY: TierOperationalPolicy = {
  productMaxVideoBytes: PRODUCT_MAX_VIDEO,
  productMaxImageBytes: PRODUCT_MAX_IMAGE,
  productMaxAudioBytes: PRODUCT_MAX_AUDIO,
  productMaxDocBytes: PRODUCT_MAX_DOC,

  providerMaxFileBytes: SUPABASE_FREE_MAX_FILE,
  providerMaxDbDiskBytes: 500 * 1024 * 1024,      // 500 MB DB disk
  providerMaxStorageBytes: 1 * 1024 * 1024 * 1024, // 1 GB object storage
  providerMaxEgressBytes: 10 * 1024 * 1024 * 1024, // 10 GB total (5 GB cached + 5 GB uncached)
  providerMaxConcurrentRealtime: 200,             // 200 peak concurrent connections

  // Effective runtime limit = min(product, provider)
  effectiveMaxVideoBytes: Math.min(PRODUCT_MAX_VIDEO, SUPABASE_FREE_MAX_FILE), // 50 MB
  effectiveMaxImageBytes: Math.min(PRODUCT_MAX_IMAGE, SUPABASE_FREE_MAX_FILE), // 25 MB
  effectiveMaxAudioBytes: Math.min(PRODUCT_MAX_AUDIO, SUPABASE_FREE_MAX_FILE), // 25 MB
  effectiveMaxDocBytes: Math.min(PRODUCT_MAX_DOC, SUPABASE_FREE_MAX_FILE),     // 10 MB

  maxRealtimeChannelsPerClient: 1, // Conserves 200 concurrent connection budget
  historyRetentionDays: 90,        // Operational protection against DB disk growth

  quotaEscalation: {
    warningThresholdPercent: 80,
    highWarningThresholdPercent: 90,
    criticalThrottlePercent: 95,
    emergencyUpgradePercent: 100,
  },
};
