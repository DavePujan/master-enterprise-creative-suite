/**
 * Execution Snapshot Service for Video Gem.
 * Freezes the exact approved creative state (AdSpec, spec hash, compiler version,
 * model capabilities, settings, resolved references, and prompt payloads) into an
 * immutable, tamper-proof ExecutionSnapshot.
 *
 * Invariant: Once an ExecutionSnapshot is created, later revisions or modifications
 * to the live project/draft will never mutate the active execution.
 */

import crypto from 'node:crypto';
import type { ExecutionSnapshot, AdSpec } from '@shared-types/adSpec.js';
import type { AdProjectExecutionPlan } from '@contracts/adSpecContracts.js';
import { videoAdProjectRepository } from '../repositories/videoAdProjectRepository.js';
import { adDirectorRepository } from '../adDirectorRepository.js';
import { calculateAdSpecHash } from './videoAdHashService.js';
import { promptCompilerService } from './promptCompilerService.js';
import { adSpecCapabilityValidator } from '../../../../../../packages/ad-director/capabilities/adSpecCapabilityValidator.js';
import { MODEL_CAPABILITY_REGISTRY } from '../../../../../../packages/ad-director/capabilities/modelCapabilityRegistry.js';
import { providerAdapterRegistry } from '../adapters/providerAdapterRegistry.js';

export interface CreateSnapshotParams {
  projectId: string;
  workspaceId: string;
  modelId: string;
  userId?: string;
  options?: {
    resolution?: '720p' | '1080p' | '4k';
    userPromptOverrides?: Record<string, string>;
  };
}

export class ExecutionSnapshotService {
  private memorySnapshots = new Map<string, { snapshot: ExecutionSnapshot; executionPlan: AdProjectExecutionPlan }>();

  /**
   * Freezes the current approved AdSpec into an immutable ExecutionSnapshot.
   */
  public async createSnapshot(params: CreateSnapshotParams): Promise<{
    snapshot: ExecutionSnapshot;
    executionPlan: AdProjectExecutionPlan;
  }> {
    const { projectId, workspaceId, modelId, userId, options } = params;

    // 1. Retrieve Project & Validate Existence and Workspace Ownership
    const project = await videoAdProjectRepository.getProject(projectId, workspaceId);
    if (!project) {
      const err: any = new Error(`Video ad project "${projectId}" not found in workspace.`);
      err.statusCode = 404;
      err.code = 'PROJECT_NOT_FOUND';
      throw err;
    }

    const adSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!adSpec) {
      const err: any = new Error(`Active AdSpec for project "${projectId}" not found.`);
      err.statusCode = 404;
      err.code = 'ADSPEC_NOT_FOUND';
      throw err;
    }

    const shots = (adSpec.shots && adSpec.shots.length > 0) ? adSpec.shots : (adSpec.production?.shots || []);
    if (shots.length === 0) {
      const err: any = new Error(`Project "${projectId}" has no storyboard shots to generate.`);
      err.statusCode = 422;
      err.code = 'NO_SHOTS_FOUND';
      throw err;
    }

    // 2. Pre-flight Capability & Compatibility Validation
    const capability = MODEL_CAPABILITY_REGISTRY[modelId];
    if (capability) {
      const compReport = adSpecCapabilityValidator.validateProject(adSpec, capability);
      if (!compReport.compatible && compReport.blockers.length > 0) {
        const err: any = new Error(
          `Target model "${modelId}" is incompatible with this Director's Plan. ` +
          compReport.blockers.map(b => `[${b.code}] ${b.message}`).join('; ')
        );
        err.statusCode = 422;
        err.code = 'ENGINE_INCOMPATIBLE';
        err.blockers = compReport.blockers;
        err.warnings = compReport.warnings;
        throw err;
      }
    }

    // 3. Compile Model-Tuned Execution Plan (Phase 6 Compiler)
    const executionPlan = await promptCompilerService.compileExecutionPlan(
      projectId,
      workspaceId,
      modelId,
      options
    );

    // 4. Compute Deterministic Hash of the Creative Spec State
    const specHash = calculateAdSpecHash(adSpec);

    // 5. Resolve Target Provider Adapter (Google, Fal, or Seedance via Fal)
    const adapter = providerAdapterRegistry.getAdapterForModel(modelId);
    const provider = adapter.provider;

    // 6. Build Immutable Execution Snapshot
    const snapshotId = crypto.randomUUID();
    const now = new Date().toISOString();

    const snapshot: ExecutionSnapshot = {
      snapshotId,
      adId: projectId,
      specVersion: adSpec.identity.specVersion,
      specHash,
      approvedAt: now,
      approvedBy: userId || 'system',
      selectedProvider: provider,
      selectedModel: modelId,
      resolvedAssetReferences: executionPlan.shots.flatMap(s =>
        s.references.map(r => ({
          assetId: r.assetId,
          semanticRole: r.role,
          url: r.url
        }))
      ),
      frozenAdSpec: JSON.parse(JSON.stringify(adSpec)), // Pure frozen snapshot
      jobIds: [],
      requesterId: userId,
      creditCostEstimate: executionPlan.estimatedCreditCost
    };

    // 7. Persist Snapshot Record
    await adDirectorRepository.saveExecutionSnapshot(snapshot, workspaceId);

    // 8. Persist Compiled Prompt Versions for each Shot
    for (const shot of executionPlan.shots) {
      await adDirectorRepository.savePromptVersion({
        snapshotId,
        shotId: shot.shotId,
        compilerVersion: 'v1',
        targetEngine: modelId,
        compiledPrompt: shot.prompt,
        negativePrompt: shot.negativePrompt,
        generationParameters: {
          aspectRatio: shot.aspectRatio,
          durationSeconds: shot.duration,
          resolution: shot.resolution,
          settings: shot.settings
        },
        resolvedReferences: shot.references
      });
    }

    // 9. Cache in memory for fast retrieval & offline unit test harness
    this.memorySnapshots.set(snapshotId, { snapshot, executionPlan });

    return { snapshot, executionPlan };
  }

  /**
   * Retrieves an immutable execution snapshot by ID.
   */
  public async getSnapshot(snapshotId: string, workspaceId?: string): Promise<ExecutionSnapshot | null> {
    const cached = this.memorySnapshots.get(snapshotId);
    if (cached) {
      if (workspaceId && cached.snapshot.frozenAdSpec.identity.workspaceId && cached.snapshot.frozenAdSpec.identity.workspaceId !== workspaceId) {
        return null;
      }
      return cached.snapshot;
    }

    return adDirectorRepository.getExecutionSnapshot(snapshotId, workspaceId);
  }

  /**
   * Retrieves the compiled execution plan associated with a snapshot.
   */
  public async getSnapshotExecutionPlan(snapshotId: string): Promise<AdProjectExecutionPlan | null> {
    const cached = this.memorySnapshots.get(snapshotId);
    if (cached) {
      return cached.executionPlan;
    }
    return null;
  }
}

export const executionSnapshotService = new ExecutionSnapshotService();
