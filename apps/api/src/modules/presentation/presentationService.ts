/**
 * Presentation Service.
 * Orchestrates planning, compilation, version commits, asset lifecycle, and background exports.
 */

import { creditService } from '../../services/creditService.js';
import { planPresentationStrategy } from './presentationPlanner.js';
import { compilePresentationContent } from './presentationContentCompiler.js';
import { presentationRepository, ExportJobRecord } from './presentationRepository.js';
import { processExportJobAsync } from './jobs/exportJobQueue.js';
import { PresentationDocument, validatePresentationDocument } from '@presentation-engine/index.js';

export interface GeneratePresentationParams {
  prompt: string;
  workspaceId: string;
  userId: string;
  brandGuidelines?: any;
  logoAssetId?: string;
  targetSlideCount?: number;
  productContext?: any;
  customTheme?: any;
}

export class PresentationService {
  /**
   * Generates a complete executive presentation using 2-stage AI planning and the layout engine.
   */
  async generatePresentation(
    params: GeneratePresentationParams
  ): Promise<{ document: PresentationDocument; newBalance?: number }> {
    const {
      prompt,
      workspaceId,
      userId,
      brandGuidelines,
      logoAssetId,
      targetSlideCount,
      productContext,
      customTheme
    } = params;

    // 1. Credit reservation (5 credits for Corporate Presentation generation)
    const clientKey = `pres_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const reservation = await creditService.reserveCredits({
      workspaceId,
      userId,
      amount: 5,
      referenceId: clientKey,
      description: `Corporate Presentation Generation: ${prompt.slice(0, 40)}`,
      idempotencyKey: `hold_${clientKey}`
    });

    try {
      // 2. Stage 1 Strategy Planning
      const strategyPlan = await planPresentationStrategy({
        prompt,
        brandGuidelines,
        targetSlideCount,
        productContext
      });

      // 3. Stage 2 Content Compilation & Layout Engine Execution
      const document = await compilePresentationContent({
        plan: strategyPlan,
        brandGuidelines,
        logoAssetId,
        customTheme
      });

      // 4. Persistence in Supabase DB & Storage
      const savedDoc = await presentationRepository.createPresentation(document, workspaceId, userId);

      // 5. Commit credit deduction
      let newBalance: number | undefined;
      if (reservation) {
        const captureResult = await creditService.captureCredits(reservation.holdId, `cap_${clientKey}`);
        newBalance = captureResult?.newBalance;
      }

      return { document: savedDoc, newBalance };
    } catch (err) {
      if (reservation) {
        await creditService.releaseCredits(reservation.holdId, 'Presentation generation failed');
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
