/**
 * Execution Snapshot Engine for AdSpec v1.
 * Freezes approved AdSpecs into immutable execution snapshots that generation jobs
 * in public.ai_generation_jobs can reference without risk of future drafts corrupting
 * the exact creative state launched.
 *
 * Framework-free: MUST NOT import React, Express, Firebase, or vendor SDKs.
 */

import type { AdSpec, ExecutionSnapshot } from '@shared-types/adSpec.js';

export interface CreateExecutionSnapshotOptions {
  approvedBy?: string;
  selectedProvider?: string;
  selectedModel?: string;
  requesterId?: string;
  creditCostEstimate?: number;
}

export function createExecutionSnapshot(
  adSpec: AdSpec,
  optionsOrApprovedBy: string | CreateExecutionSnapshotOptions = 'system'
): ExecutionSnapshot {
  if (!adSpec) {
    throw new Error('Cannot create execution snapshot from a null or undefined AdSpec');
  }

  const options: CreateExecutionSnapshotOptions =
    typeof optionsOrApprovedBy === 'string'
      ? { approvedBy: optionsOrApprovedBy }
      : (optionsOrApprovedBy || {});

  const approvedBy = options.approvedBy || 'system';

  // Deep clone to ensure total detachment from any live in-memory working draft
  const frozenAdSpec: AdSpec = JSON.parse(JSON.stringify(adSpec));
  frozenAdSpec.identity.creativeState = 'approved';

  // Resolve semantic asset references
  const resolvedAssetReferences = (frozenAdSpec.assets?.assets || []).map((a) => ({
    assetId: a.assetId,
    semanticRole: a.semanticRole,
    url: a.url
  }));

  // Resolve provider-neutral generation requirements
  const resolvedRequirements = frozenAdSpec.generationRequirements || {
    durationSeconds: frozenAdSpec.generationIntent?.desiredDurationSeconds || 6,
    aspectRatio: frozenAdSpec.generationIntent?.aspectRatio || '16:9',
    audioRequired: frozenAdSpec.generationIntent?.audioRequired || false,
    firstFrameRequired: frozenAdSpec.generationIntent?.modelRequirements?.requiresFirstFrame || false,
    lastFrameRequired: frozenAdSpec.generationIntent?.modelRequirements?.requiresLastFrame || false,
    minimumReferenceCount: frozenAdSpec.generationIntent?.modelRequirements?.minimumReferenceCount || 0,
    continuityPriority: frozenAdSpec.generationIntent?.continuityPriority || 'strict',
    qualityPriority: frozenAdSpec.generationIntent?.qualityIntent || 'cinematic_pro',
    preferredProvider: options.selectedProvider,
    preferredModel: options.selectedModel
  };

  const snapshot: ExecutionSnapshot = {
    snapshotId: `snap_${adSpec.identity.adId}_v${adSpec.identity.specVersion}_${Date.now()}`,
    adId: adSpec.identity.adId,
    specVersion: adSpec.identity.specVersion,
    specHash: `hash_${adSpec.identity.adId}_v${adSpec.identity.specVersion}`,
    approvedAt: new Date().toISOString(),
    approvedBy,
    selectedProvider: options.selectedProvider || 'google',
    selectedModel: options.selectedModel || 'veo-2.0',
    resolvedRequirements,
    resolvedAssetReferences,
    frozenAdSpec,
    jobIds: [],
    requesterId: options.requesterId,
    creditCostEstimate: options.creditCostEstimate
  };

  return Object.freeze(snapshot);
}
