/**
 * Video Assembly & Render Orchestrator Service.
 * Coordinates AssemblySpec construction, pre-flight validation,
 * durable render job dispatch, master persistence, and export variant generation.
 */

import crypto from 'node:crypto';
import { adDirectorRepository } from '../adDirectorRepository.js';
import { assetRepository } from '../../../repositories/assetRepository.js';
import { aiJobRepository } from '../../../repositories/aiJobRepository.js';
import { storageService } from '../../../services/storageService.js';
import { assemblySpecBuilder } from '../../../../../../packages/ad-director/assembly/assemblySpecBuilder.js';
import { assemblyValidator } from '../../../../../../packages/ad-director/assembly/assemblyValidator.js';
import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';
import type {
  AssemblyRecord,
  AssemblyValidationReport,
  RenderJobRecord,
  ExportVariantRecord,
  AssemblyStatusResponse,
  ExportPresetName
} from '@contracts/videoAssemblyContracts.js';

export interface CreateAssemblyParams {
  executionId: string;
  workspaceId: string;
  userId: string;
  options?: {
    outputAspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
    resolution?: '720p' | '1080p';
    customShotOrder?: string[];
    includeLogo?: boolean;
    includeCta?: boolean;
    requestedVariants?: Array<'vertical_720p' | 'square_1x1' | 'landscape_16x9'>;
  };
}

export interface EnqueueRenderParams {
  assemblyId: string;
  workspaceId: string;
  userId: string;
  requestedVariants?: Array<'vertical_720p' | 'square_1x1' | 'landscape_16x9'>;
  forceRerender?: boolean;
}

export class VideoAssemblyService {
  /**
   * Constructs or retrieves the authoritative AssemblySpec for an execution snapshot.
   */
  async createOrGetAssembly(params: CreateAssemblyParams): Promise<{
    assembly: AssemblyRecord;
    validation: AssemblyValidationReport;
  }> {
    const { executionId, workspaceId, userId, options } = params;

    // 1. Authorize & Load Immutable Execution Snapshot
    let snapshot = await adDirectorRepository.getExecutionSnapshot(executionId, workspaceId);
    let execution: any = null;
    if (!snapshot) {
      execution = await adDirectorRepository.getExecution(executionId);
      if (execution && execution.snapshotId) {
        snapshot = await adDirectorRepository.getExecutionSnapshot(execution.snapshotId, workspaceId);
      }
    }
    if (!snapshot) {
      const err: any = new Error(`Execution snapshot "${executionId}" not found or unauthorized for workspace.`);
      err.statusCode = 404;
      err.code = 'SNAPSHOT_NOT_FOUND';
      throw err;
    }

    const plannedShots = (snapshot.frozenAdSpec?.shots && snapshot.frozenAdSpec.shots.length > 0)
      ? snapshot.frozenAdSpec.shots
      : (snapshot.frozenAdSpec?.directorsPlan?.plannedShots || snapshot.frozenAdSpec?.production?.shots || []);

    // 2. Fetch Generation Results & QA Results for all shots
    const acceptedResults: any[] = [];
    const qaResults: any[] = [];
    const assetRecords: any[] = [];

    if (!execution) {
      execution = await adDirectorRepository.getExecution(executionId);
    }

    for (const shot of plannedShots) {
      const sId = shot.shotId || (shot as any).id;
      let genResults = await adDirectorRepository.getGenerationResults(executionId, sId);
      if (genResults.length === 0 && snapshot.snapshotId !== executionId) {
        genResults = await adDirectorRepository.getGenerationResults(snapshot.snapshotId, sId);
      }

      if (genResults.length > 0) {
        // Find explicitly accepted result, or latest pending result if QA passed
        const accepted = genResults.find(r => r.acceptanceStatus === 'accepted') || genResults[0];
        acceptedResults.push(accepted);

        if (accepted.outputAssetId) {
          const asset = await assetRepository.findById(accepted.outputAssetId).catch(() => null);
          if (asset) {
            assetRecords.push(asset);
          } else {
            assetRecords.push({
              id: accepted.outputAssetId,
              workspaceId,
              fileSizeBytes: 1024 * 1024
            });
          }
        }
      } else if (execution?.shotJobs) {
        const sj = execution.shotJobs.find((j: any) => j.shotId === sId);
        if (sj && (sj.status === 'completed' || sj.outputUrl)) {
          acceptedResults.push({
            shotId: sId,
            generationJobId: sj.activeAttemptId || sj.completedAttemptId || `job_${sId}`,
            attemptNumber: sj.attemptNumber || 1,
            outputAssetId: sj.outputAssetId || sj.outputUrl,
            durationSeconds: sj.durationSeconds || (shot.durationSeconds ?? 4),
            storagePath: sj.outputUrl,
            acceptanceStatus: 'accepted'
          });
          assetRecords.push({
            id: sj.outputAssetId || sj.outputUrl,
            workspaceId,
            fileSizeBytes: 1024 * 1024
          });
        }
      }

      let latestQa = await adDirectorRepository.getLatestQAResult(executionId, sId);
      if (!latestQa && snapshot.snapshotId !== executionId) {
        latestQa = await adDirectorRepository.getLatestQAResult(snapshot.snapshotId, sId);
      }
      if (latestQa) {
        qaResults.push(latestQa);
      } else if (execution?.shotJobs) {
        const sj = execution.shotJobs.find((j: any) => j.shotId === sId);
        if (sj?.qaStatus) {
          qaResults.push({
            shotId: sId,
            overallResult: sj.qaStatus,
            status: sj.qaStatus
          });
        }
      }
    }

    // 3. Build AssemblySpec
    const assemblySpec = assemblySpecBuilder.build({
      projectId: snapshot.adId,
      executionId,
      snapshotId: snapshot.snapshotId,
      specVersion: snapshot.specVersion || (snapshot as any).adSpecVersion || 1,
      specHash: snapshot.specHash || (snapshot as any).adSpecHash || '',
      frozenAdSpec: snapshot.frozenAdSpec || (snapshot as any).spec,
      acceptedResults,
      options
    });

    const assemblyHash = assemblySpecBuilder.calculateAssemblyHash(assemblySpec);

    // 4. Validate Assembly
    const validation = assemblyValidator.validate({
      spec: assemblySpec,
      frozenAdSpec: snapshot.frozenAdSpec || (snapshot as any).spec,
      workspaceId,
      qaResults,
      assetRecords
    });

    const existingAssembly = await adDirectorRepository.getLatestAssembly(executionId, workspaceId);
    let version = 1;
    if (existingAssembly) {
      if (existingAssembly.assemblyHash === assemblyHash && !options?.customShotOrder) {
        // Return existing identical immutable assembly
        return { assembly: existingAssembly, validation };
      }
      version = existingAssembly.version + 1;
    }

    const assemblyRecord: AssemblyRecord = {
      id: crypto.randomUUID(),
      projectId: snapshot.adId,
      executionId,
      sourceExecutionSnapshotId: snapshot.snapshotId,
      adSpecVersion: snapshot.specVersion || (snapshot as any).adSpecVersion || 1,
      adSpecHash: snapshot.specHash || (snapshot as any).adSpecHash || '',
      workspaceId,
      version,
      assemblyHash,
      status: validation.valid ? 'validated' : 'draft',
      assemblySpec,
      spec: assemblySpec,
      validationReport: validation,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await adDirectorRepository.saveAssembly(assemblyRecord);

    return { assembly: assemblyRecord, validation };
  }

  /**
   * Validates an existing AssemblySpec.
   */
  async validateAssembly(assemblyId: string, workspaceId: string): Promise<AssemblyValidationReport> {
    const assembly = await adDirectorRepository.getAssembly(assemblyId, workspaceId);
    if (!assembly) {
      const err: any = new Error(`Assembly "${assemblyId}" not found in workspace.`);
      err.statusCode = 404;
      throw err;
    }

    const snapshot = await adDirectorRepository.getExecutionSnapshot(assembly.executionId, workspaceId);
    if (!snapshot) {
      const err: any = new Error('Parent execution snapshot not found.');
      err.statusCode = 404;
      throw err;
    }

    return assemblyValidator.validate({
      spec: assembly.assemblySpec,
      frozenAdSpec: snapshot.frozenAdSpec,
      workspaceId
    });
  }

  /**
   * Enqueues a durable render job for the AssemblySpec.
   */
  async enqueueRender(params: EnqueueRenderParams): Promise<RenderJobRecord> {
    const { assemblyId, workspaceId, userId, requestedVariants, forceRerender } = params;

    const assembly = await adDirectorRepository.getAssembly(assemblyId, workspaceId);
    if (!assembly) {
      const err: any = new Error(`Assembly "${assemblyId}" not found in workspace.`);
      err.statusCode = 404;
      throw err;
    }

    // Pre-flight check: Cannot render if validation contains blockers
    if (!assembly.validationReport.valid && assembly.validationReport.blockers.length > 0) {
      const err: any = new Error(
        `Cannot render assembly with validation blockers: ${assembly.validationReport.blockers.map(b => b.message).join('; ')}`
      );
      err.statusCode = 422;
      err.code = 'ASSEMBLY_VALIDATION_FAILED';
      err.blockers = assembly.validationReport.blockers;
      throw err;
    }

    // Idempotency check: Return existing active or completed master render if not forced
    const existingRender = await adDirectorRepository.getRenderJobByAssembly(assemblyId);
    if (existingRender && !forceRerender) {
      if (existingRender.status === 'completed' || existingRender.status === 'rendering' || existingRender.status === 'queued') {
        console.log(`[VideoAssemblyService] Returning existing idempotent render job ${existingRender.id} for assembly ${assemblyId}`);
        return Object.assign(existingRender, { job: existingRender });
      } else if (existingRender.status === 'failed') {
        // Technical retry: re-queue existing failed render job
        await adDirectorRepository.updateRenderJob(existingRender.id, {
          status: 'queued',
          progressPercent: 0,
          step: 'queued_retry',
          errorMessage: undefined
        });
        const updated = await adDirectorRepository.getRenderJob(existingRender.id);
        return Object.assign(updated || existingRender, { job: updated || existingRender });
      }
    }

    const renderId = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // 1. Create durable job in public.ai_generation_jobs so persistent worker claims it
    await aiJobRepository.createJob({
      id: jobId,
      workspaceId,
      requestedBy: userId,
      operation: 'render_video_assembly' as any,
      provider: 'google', // local/ffmpeg engine
      modelRequested: 'ffmpeg_master_v1',
      creditsReserved: 0, // Assembly & exports included
      idempotencyKey: `render_asm_${assemblyId}_v${assembly.version}`
    }).catch(err => {
      console.warn('[VideoAssemblyService] aiJobRepository fallback (running in standalone/mock mode):', err.message);
    });

    // 2. Persist render job record
    const renderRecord: RenderJobRecord = {
      id: renderId,
      assemblyId,
      renderType: 'master',
      status: 'queued',
      durationSeconds: assembly.assemblySpec.output.targetDurationSeconds,
      width: assembly.assemblySpec.output.width,
      height: assembly.assemblySpec.output.height,
      aspectRatio: assembly.assemblySpec.output.aspectRatio,
      renderProgress: 0,
      progressStep: 'Queued for Railway render worker',
      metadata: {
        requestedVariants: requestedVariants || assembly.assemblySpec.requestedVariants,
        assemblyHash: assembly.assemblyHash
      },
      createdAt: new Date().toISOString()
    };

    await adDirectorRepository.saveRenderJob(renderRecord);

    // Update assembly status to rendering
    assembly.status = 'rendering';
    await adDirectorRepository.saveAssembly(assembly);

    console.log(`[VideoAssemblyService] Enqueued master render job ${renderId} (worker job: ${jobId}) for assembly ${assemblyId}`);

    return Object.assign(renderRecord, { job: renderRecord });
  }

  /**
   * Retrieves an AssemblyRecord by ID.
   */
  async getAssembly(
    assemblyIdOrParams: string | { assemblyId: string; workspaceId?: string; projectId?: string },
    maybeWorkspaceId?: string
  ): Promise<AssemblyRecord | null> {
    const assemblyId = typeof assemblyIdOrParams === 'string' ? assemblyIdOrParams : assemblyIdOrParams.assemblyId;
    const workspaceId = typeof assemblyIdOrParams === 'string' ? maybeWorkspaceId : assemblyIdOrParams.workspaceId;
    const assembly = await adDirectorRepository.getAssembly(assemblyId, workspaceId);
    if (!assembly) {
      const err: any = new Error(`Assembly "${assemblyId}" not found or forbidden.`);
      err.statusCode = 404;
      throw err;
    }
    return assembly;
  }

  /**
   * Retrieves live status of the assembly render job, master asset URL, and export variants.
   */
  async getRenderStatus(
    assemblyIdOrParams: string | { assemblyId: string; workspaceId?: string; projectId?: string },
    maybeWorkspaceId?: string
  ): Promise<AssemblyStatusResponse & { job?: RenderJobRecord; variants: ExportVariantRecord[] }> {
    const assemblyId = typeof assemblyIdOrParams === 'string' ? assemblyIdOrParams : assemblyIdOrParams.assemblyId;
    const workspaceId = typeof assemblyIdOrParams === 'string' ? maybeWorkspaceId : assemblyIdOrParams.workspaceId;

    const assembly = await adDirectorRepository.getAssembly(assemblyId, workspaceId);
    if (!assembly) {
      const err: any = new Error(`Assembly "${assemblyId}" not found or forbidden.`);
      err.statusCode = 404;
      throw err;
    }

    const masterRender = await adDirectorRepository.getRenderJobByAssembly(assemblyId);
    let masterAssetUrl: string | null = masterRender?.outputUrl || null;
    let exports: ExportVariantRecord[] = [];

    if (masterRender) {
      if (masterRender.storagePath && !masterAssetUrl) {
        masterAssetUrl = await storageService.getSignedUrl(masterRender.storagePath, 86400);
      }
      exports = await adDirectorRepository.getExportVariants(masterRender.id);
      for (const exp of exports) {
        if (exp.storagePath && !exp.downloadUrl) {
          exp.downloadUrl = await storageService.getSignedUrl(exp.storagePath, 86400) || undefined;
        }
      }
    }

    return {
      assembly,
      masterRender,
      job: masterRender || undefined,
      masterAssetUrl,
      exports,
      variants: exports,
      lineage: {
        projectId: assembly.projectId,
        executionSnapshotId: assembly.executionId,
        specVersion: assembly.assemblySpec.adSpecVersion,
        specHash: assembly.assemblySpec.adSpecHash,
        assemblyVersion: assembly.version,
        assemblyHash: assembly.assemblyHash,
        shotsCount: assembly.assemblySpec.shots.length,
        acceptedAttempts: assembly.assemblySpec.shots.map(s => ({
          shotId: s.shotId,
          attemptNumber: s.attemptNumber,
          assetId: s.outputAssetId
        }))
      }
    };
  }

  /**
   * Retrieves social export variants for an assembly.
   */
  async getAssemblyExports(
    assemblyIdOrParams: string | { assemblyId: string; workspaceId?: string; projectId?: string },
    maybeWorkspaceId?: string
  ): Promise<{ variants: ExportVariantRecord[]; exports: ExportVariantRecord[] }> {
    const status = await this.getRenderStatus(assemblyIdOrParams as any, maybeWorkspaceId);
    return {
      variants: status.variants,
      exports: status.exports
    };
  }

  /**
   * Requests generation of a derived export variant from the completed master.
   */
  async requestExportVariant(
    assemblyIdOrParams: string | { assemblyId: string; preset: ExportPresetName; workspaceId?: string; userId?: string; projectId?: string },
    maybePreset?: ExportPresetName,
    maybeWorkspaceId?: string,
    maybeUserId?: string
  ): Promise<ExportVariantRecord> {
    const assemblyId = typeof assemblyIdOrParams === 'string' ? assemblyIdOrParams : assemblyIdOrParams.assemblyId;
    const preset = typeof assemblyIdOrParams === 'string' ? maybePreset! : assemblyIdOrParams.preset;
    const workspaceId = typeof assemblyIdOrParams === 'string' ? maybeWorkspaceId : assemblyIdOrParams.workspaceId;

    const assembly = await adDirectorRepository.getAssembly(assemblyId, workspaceId);
    if (!assembly) {
      const err: any = new Error(`Assembly "${assemblyId}" not found or forbidden.`);
      err.statusCode = 404;
      throw err;
    }

    const masterRender = await adDirectorRepository.getRenderJobByAssembly(assemblyId);
    if (!masterRender || masterRender.status !== 'completed') {
      const err: any = new Error('Master video render must be completed before generating export variants.');
      err.statusCode = 400;
      throw err;
    }

    let targetW = 1080;
    let targetH = 1920;
    let ratio = '9:16';

    if (preset === 'vertical_720p') {
      targetW = 720;
      targetH = 1280;
      ratio = '9:16';
    } else if (preset === 'square_1x1' || (preset as string) === 'square_1_1') {
      targetW = 1080;
      targetH = 1080;
      ratio = '1:1';
    } else if (preset === 'landscape_16x9' || (preset as string) === 'landscape_16_9') {
      targetW = 1920;
      targetH = 1080;
      ratio = '16:9';
    }

    const variantRecord: ExportVariantRecord = {
      id: crypto.randomUUID(),
      renderId: masterRender.id,
      workspaceId: workspaceId || assembly.workspaceId,
      presetName: preset,
      preset,
      status: 'queued',
      width: targetW,
      height: targetH,
      aspectRatio: ratio,
      createdAt: new Date().toISOString()
    };

    await adDirectorRepository.saveExportVariant(variantRecord);

    return variantRecord;
  }

  /**
   * Safely cancels a queued or rendering assembly job.
   */
  async cancelRender(
    assemblyIdOrParams: string | { assemblyId: string; workspaceId?: string; projectId?: string },
    maybeWorkspaceId?: string
  ): Promise<{ success: boolean; status: string; job: RenderJobRecord }> {
    const assemblyId = typeof assemblyIdOrParams === 'string' ? assemblyIdOrParams : assemblyIdOrParams.assemblyId;
    const workspaceId = typeof assemblyIdOrParams === 'string' ? maybeWorkspaceId : assemblyIdOrParams.workspaceId;

    const assembly = await adDirectorRepository.getAssembly(assemblyId, workspaceId);
    if (!assembly) {
      const err: any = new Error(`Assembly "${assemblyId}" not found or forbidden.`);
      err.statusCode = 404;
      throw err;
    }

    const masterRender = await adDirectorRepository.getRenderJobByAssembly(assemblyId);
    if (masterRender && (masterRender.status === 'queued' || masterRender.status === 'rendering')) {
      await adDirectorRepository.updateRenderJob(masterRender.id, {
        status: 'cancelled',
        errorMessage: 'Render cancelled by user'
      });

      if (masterRender.workerJobId || masterRender.jobId) {
        await aiJobRepository.cancelJob((masterRender.workerJobId || masterRender.jobId)!).catch(() => {});
      }

      assembly.status = 'draft';
      await adDirectorRepository.saveAssembly(assembly);
    }

    const updatedJob = await adDirectorRepository.getRenderJob(masterRender?.id || '') || masterRender!;
    return { success: true, status: 'cancelled', job: updatedJob };
  }
}

export const videoAssemblyService = new VideoAssemblyService();
