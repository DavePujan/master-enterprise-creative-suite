/**
 * Presentation Domain Service.
 * Business orchestration layer for presentation generation, versioning, persistence,
 * and server-side export jobs.
 * Enforces transactional credit holds, atomic capture on success, and automatic release on failure.
 */

import {
  PresentationDocument,
  PresentationTheme,
  validatePresentationDocument
} from '@presentation-engine/index.js';
import { creditService } from '../../services/creditService.js';
import { presentationRepository, ExportJobRecord } from './presentationRepository.js';
import { planPresentationStrategy } from './presentationPlanner.js';
import { compilePresentationContent } from './presentationContentCompiler.js';
import { processExportJobAsync } from './jobs/exportJobQueue.js';
import { PresentationPolicyName } from './presentationModelResolver.js';
import { PresentationError } from './presentationError.js';

export interface GeneratePresentationParams {
  prompt: string;
  workspaceId: string;
  userId: string;
  brandGuidelines?: any;
  logoAssetId?: string;
  targetSlideCount?: number;
  productContext?: any;
  customTheme?: Partial<PresentationTheme>;
  generationId?: string;
  policyName?: PresentationPolicyName;
}

export class PresentationService {
  /**
   * Generates a complete presentation document via 2-stage planning and layout compilation.
   * Transactionally reserved with creditService.
   */
  async generatePresentation(
    params: GeneratePresentationParams
  ): Promise<{ document: PresentationDocument; newBalance?: number; generationId: string }> {
    const {
      prompt,
      workspaceId,
      userId,
      brandGuidelines,
      logoAssetId,
      targetSlideCount,
      productContext,
      customTheme,
      policyName
    } = params;

    const generationId =
      params.generationId || `pres_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Transactional Credit reservation (5 credits for Corporate Presentation generation)
    // Keyed by generationId for strict idempotency
    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: 5,
      referenceId: generationId,
      description: `Corporate Presentation Generation: ${prompt.slice(0, 40)}`,
      idempotencyKey: `hold_${generationId}`
    });

    if (!reservation.success) {
      throw new PresentationError({
        message: reservation.error || 'Insufficient credits for presentation generation.',
        status: 402,
        code: 'INSUFFICIENT_CREDITS',
        kind: 'AUTH',
        retryable: false,
        details: { available: reservation.available, required: 5 }
      });
    }

    try {
      // 2. Stage 1 Strategy Planning
      const strategyPlan = await planPresentationStrategy({
        prompt,
        brandGuidelines,
        targetSlideCount,
        productContext,
        generationId,
        policyName
      });

      // 3. Stage 2 Content Compilation & Layout Engine Execution
      const document = await compilePresentationContent({
        plan: strategyPlan,
        brandGuidelines,
        logoAssetId,
        customTheme,
        generationId,
        policyName
      });

      // 4. Persistence in Supabase DB & Storage
      const savedDoc = await presentationRepository.createPresentation(document, workspaceId, userId);

      // 5. Commit credit deduction (settle hold to credit_ledger)
      let newBalance: number | undefined;
      if (reservation.holdId) {
        const captureResult = await creditService.captureCredits(
          reservation.holdId,
          `cap_${generationId}`
        );
        newBalance = captureResult?.newBalance;
      }

      return { document: savedDoc, newBalance, generationId };
    } catch (err: any) {
      // Release credit hold immediately on failure
      if (reservation.holdId) {
        await creditService.releaseCredits(
          reservation.holdId,
          err?.message || 'Presentation generation failed'
        ).catch((relErr) => {
          console.error('[PresentationService] Failed to release credit hold:', relErr);
        });
      }
      throw err;
    }
  }

  /**
   * Fetches presentation by ID.
   */
  async getPresentation(id: string, workspaceId: string): Promise<PresentationDocument | null> {
    return presentationRepository.getPresentation(id, workspaceId);
  }

  /**
   * Updates an existing presentation with optimistic concurrency check.
   */
  async updatePresentation(
    document: PresentationDocument,
    expectedVersion: number,
    workspaceId: string,
    userId: string
  ): Promise<PresentationDocument> {
    const validation = validatePresentationDocument(document);
    if (!validation.isValid) {
      const err: any = new Error(`Presentation validation failed: ${validation.errors.join('; ')}`);
      err.status = 400;
      throw err;
    }

    return presentationRepository.updatePresentation(document, expectedVersion, workspaceId, userId);
  }

  /**
   * Queues a server-side PPTX or PDF export job.
   */
  async requestExport(
    presentationId: string,
    format: 'pptx' | 'pdf',
    workspaceId: string,
    userId: string
  ): Promise<ExportJobRecord> {
    const doc = await presentationRepository.getPresentation(presentationId, workspaceId);
    if (!doc) {
      const err: any = new Error(`Presentation ${presentationId} not found.`);
      err.status = 404;
      throw err;
    }

    // Create job record
    const job = await presentationRepository.createExportJob(presentationId, doc.version, format);

    // Trigger async processing
    processExportJobAsync({
      exportId: job.id,
      document: doc,
      format,
      workspaceId
    });

    return job;
  }

  /**
   * Retrieves status and download URL for an export job.
   */
  async getExportStatus(exportId: string): Promise<ExportJobRecord | null> {
    return presentationRepository.getExportJob(exportId);
  }
}

export const presentationService = new PresentationService();
