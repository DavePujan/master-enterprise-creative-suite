/**
 * Centralized Operational Tier Policy.
 * Decouples product rules and infrastructure capabilities from provider plan constraints.
 * Pure domain interfaces: zero vendor SDK dependencies.
 */

export interface TierOperationalPolicy {
  maxImageUploadBytes: number;
  maxVideoUploadBytes: number;
  maxAudioUploadBytes: number;
  maxDocUploadBytes: number;
  maxRealtimeChannelsPerClient: number;
  historyRetentionDays: number;
  storageWarningThresholdPercent: number;
  databaseWarningThresholdPercent: number;
}

/**
 * Active Operational Limits for Supabase Free Tier.
 * Easily adjusted or relaxed via environment/configuration upon plan upgrade without changing business logic.
 */
export const CURRENT_TIER_POLICY: TierOperationalPolicy = {
  maxImageUploadBytes: 10 * 1024 * 1024,      // 10 MB
  maxVideoUploadBytes: 50 * 1024 * 1024,      // 50 MB (Free Tier object ceiling)
  maxAudioUploadBytes: 25 * 1024 * 1024,      // 25 MB
  maxDocUploadBytes: 5 * 1024 * 1024,         // 5 MB
  maxRealtimeChannelsPerClient: 1,            // Conserves 200 concurrent connection budget
  historyRetentionDays: 90,                   // Operational protection for 500 MB DB disk
  storageWarningThresholdPercent: 80,         // Alert at 800 MB
  databaseWarningThresholdPercent: 80         // Alert at 400 MB
};
