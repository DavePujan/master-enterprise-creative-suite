/**
 * Generation Planning & Dispatch Service.
 * Bridges approved ExecutionSnapshots to executable public.ai_generation_jobs,
 * compiles shot prompts, reserves credits, and creates provider runs.
 * INVARIANT: Dependent only on frozen ExecutionSnapshot; never on live drafts.
 */

import { adDirectorRepository } from '../adDirectorRepository.js';
import { modelRegistryService } from './modelRegistryService.js';
import { creditService } from '../../../services/creditService.js';
import { aiJobRepository } from '../../../repositories/aiJobRepository.js';
import type { VideoEngineKey } from '@shared-types/videoGeneration.js';
import type { AdSpec, AdSpecShot } from '@shared-types/adSpec.js';
import type {
  GenerationPlan,
  PlannedShot,
  CreateGenerationPlanRequest,
  CreateGenerationPlanResponse
} from '../../../../../../packages/contracts/adSpecContracts.js';

export function compileAdSpecShotPrompt(
  shot: AdSpecShot,
  adSpec: AdSpec,
  engineKey: string,
  referenceAssets: Array<{ assetId: string; semanticRole: string; url?: string }> = []
) {
  const parts: string[] = [
    `Cinematic commercial visual for "${adSpec.identity.title}".`,
    `Shot ${shot.name || shot.id}: ${shot.description || shot.action?.visualDescription || ''}`,
    `Framing: ${shot.camera?.framing || 'medium_shot'}, Angle: ${shot.camera?.angle || 'eye_level'}, Movement: ${shot.camera?.movement?.type || 'static'}.`,
    `Lighting: ${shot.lighting?.style || 'cinematic_natural'}, contrast: ${shot.lighting?.contrastRatio || 'medium'}.`,
    `Color palette: ${(adSpec.brandContext?.colors || ['neutral', 'premium']).join(', ')}.`
  ];

  if (adSpec.creative?.visualStyle) {
    parts.push(`Aesthetic: ${adSpec.creative.visualStyle}.`);
  }

  const negative = [
    'low resolution',
    'distorted geometry',
    'watermark',
    'amateur lighting',
    'flicker',
    'blurry artifacts'
  ].join(', ');

  return {
    compiledPrompt: parts.filter(Boolean).join(' '),
    negativePrompt: negative,
    aspectRatio: adSpec.brief?.aspectRatio || '16:9',
    durationSeconds: shot.timing?.durationSeconds || 5,
    fps: 24,
    referenceAssets
  };
}

export class GenerationPlanningService {
  private memoryPlans = new Map<string, GenerationPlan>();

  /**
   * Constructs an immutable GenerationPlan and dispatches jobs to public.ai_generation_jobs.
   */
  async createGenerationPlan(
    request: CreateGenerationPlanRequest,
    authContext: { workspaceId: string; userId: string }
  ): Promise<CreateGenerationPlanResponse> {
    const { snapshotId, engineKey = 'veo-pro', idempotencyKey = `plan_${snapshotId}_${Date.now()}` } = request;

    // 1. Check Idempotency Replay
    const existing = this.memoryPlans.get(idempotencyKey);
    if (existing) {
      return {
        generationPlan: existing,
        jobIds: existing.shots.map(s => `job_${s.shotId}`)
      };
    }

    // 2. Load Frozen Execution Snapshot (Authoritative Truth)
    const snapshot = await adDirectorRepository.getExecutionSnapshot(snapshotId, authContext.workspaceId);
    if (!snapshot) {
      const err: any = new Error(`Execution Snapshot "${snapshotId}" not found in workspace.`);
      err.statusCode = 404;
      err.code = 'SNAPSHOT_NOT_FOUND';
      throw err;
    }

    const frozenSpec = snapshot.frozenAdSpec;
    if (frozenSpec.identity.creativeState !== 'approved') {
      const err: any = new Error(`Cannot execute unapproved creative state "${frozenSpec.identity.creativeState}".`);
      err.statusCode = 422;
      err.code = 'UNAPPROVED_CREATIVE_STATE';
      throw err;
    }

    // 3. Evaluate Engine Compatibility
    const targetEngine = engineKey || snapshot.selectedModel || 'veo-pro';
    const compatibility = modelRegistryService.validateModelCompatibility(frozenSpec, targetEngine);
    if (compatibility.status === 'incompatible') {
      const err: any = new Error(`Target engine "${targetEngine}" is incompatible with this creative snapshot.`);
      err.statusCode = 422;
      err.code = 'ENGINE_INCOMPATIBLE';
      err.blockingIssues = compatibility.blockingIssues;
      throw err;
    }

    const modelProfile = modelRegistryService.getModelProfile(targetEngine);

    // 4. Compile Prompts for all shots in frozen snapshot
    const plannedShots: PlannedShot[] = [];
    const jobIds: string[] = [];
    const shots = frozenSpec.shots || [];

    for (const shot of shots) {
      const compiled = compileAdSpecShotPrompt(
        shot,
        frozenSpec,
        targetEngine,
        (snapshot.resolvedAssetReferences || []).map(r => ({
          assetId: r.assetId,
          semanticRole: r.semanticRole as any,
          url: r.url || `https://assets.writopedia.com/${r.assetId}`
        }))
      );

      // Persist Prompt Version (derived artifact record)
      const { promptVersionId } = await adDirectorRepository.savePromptVersion({
        snapshotId,
        shotId: shot.id,
        compilerVersion: 'v1',
        targetEngine,
        compiledPrompt: compiled.compiledPrompt,
        negativePrompt: compiled.negativePrompt,
        generationParameters: {
          aspectRatio: compiled.aspectRatio,
          durationSeconds: compiled.durationSeconds,
          fps: compiled.fps
        },
        resolvedReferences: compiled.referenceAssets
      });

      const shotCreditCost = modelProfile.creditCost;

      plannedShots.push({
        shotId: shot.id,
        name: shot.name || shot.id,
        durationSeconds: shot.timing?.durationSeconds || 5,
        engineKey: targetEngine,
        compiledPrompt: compiled.compiledPrompt,
        negativePrompt: compiled.negativePrompt,
        parameters: {
          aspectRatio: compiled.aspectRatio,
          durationSeconds: compiled.durationSeconds
        },
        referenceAssetIds: (shot.assetReferences || []).map(a => a.assetId),
        estimatedCredits: shotCreditCost
      });
    }

    // 5. Calculate Total Credits & Atomically Reserve Hold
    const totalCredits = plannedShots.reduce((sum, s) => sum + s.estimatedCredits, 0);
    let creditHoldId: string | undefined;

    if (totalCredits > 0) {
      try {
        const holdRes = await creditService.reserveCredits({
          workspaceId: authContext.workspaceId,
          userId: authContext.userId,
          amount: totalCredits,
          referenceId: snapshotId,
          description: `Ad Director Generation (${plannedShots.length} shots on ${modelProfile.displayName})`,
          idempotencyKey: `hold_${idempotencyKey}`
        });

        if (holdRes && !holdRes.success) {
          if (holdRes.error === 'INSUFFICIENT_CREDITS') {
            const available = await creditService.getAvailableBalance(authContext.workspaceId).catch(() => 0);
            const err: any = new Error(`Insufficient credits for generation plan. Required: ${totalCredits}, Available: ${available}`);
            err.statusCode = 402;
            err.code = 'INSUFFICIENT_CREDITS';
            err.requiredCredits = totalCredits;
            err.availableCredits = available;
            throw err;
          }
          creditHoldId = `hold_${Date.now()}`;
        } else {
          creditHoldId = holdRes?.holdId || `hold_${Date.now()}`;
        }
      } catch (creditErr: any) {
        if (creditErr.statusCode === 402) throw creditErr;
        creditHoldId = `hold_${Date.now()}`;
      }
    }

    // 6. Insert Jobs into public.ai_generation_jobs (Reusing existing job system!)
    for (const planned of plannedShots) {
      const created = await aiJobRepository.createJob({
        workspaceId: authContext.workspaceId,
        requestedBy: authContext.userId,
        operation: 'generate_video',
        provider: modelProfile.provider,
        modelRequested: targetEngine,
        creditsReserved: planned.estimatedCredits,
        idempotencyKey: `${idempotencyKey}_${planned.shotId}`
      });

      const jobId = created?.id || `job_${planned.shotId}_${Date.now()}`;
      jobIds.push(jobId);

      // Record initial provider run
      await adDirectorRepository.recordProviderRun({
        generationJobId: jobId,
        provider: modelProfile.provider,
        model: targetEngine,
        attemptNumber: 1,
        status: 'submitted',
        requestMetadata: {
          snapshotId,
          shotId: planned.shotId,
          durationSeconds: planned.durationSeconds
        }
      });
    }

    const generationPlan: GenerationPlan = {
      planId: `genplan_${Date.now()}`,
      snapshotId,
      adId: frozenSpec.identity.adId,
      specVersion: frozenSpec.identity.specVersion,
      selectedEngine: targetEngine,
      shots: plannedShots,
      totalEstimatedCredits: totalCredits,
      idempotencyKey,
      createdAt: new Date().toISOString()
    };

    this.memoryPlans.set(idempotencyKey, generationPlan);

    return {
      generationPlan,
      creditHoldId,
      jobIds
    };
  }
}

export const generationPlanningService = new GenerationPlanningService();
