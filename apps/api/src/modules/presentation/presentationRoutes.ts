/**
 * Presentation Express Routes.
 * Exposes:
 * - GET  /api/presentation/health (route availability & health probe)
 * - POST /api/presentation/generate (2-stage planning and canonical document compilation)
 * - GET  /api/presentation/:id (retrieve latest document revision)
 * - PUT  /api/presentation/:id (optimistic concurrency update with expectedVersion)
 * - POST /api/presentation/:id/export (queue server-side PPTX or PDF export)
 * - GET  /api/presentation/export/:exportId (poll export job status & download URL)
 */

import { Router } from 'express';
import { presentationService } from './presentationService.js';
import { workspaceRepository } from '../../repositories/workspaceRepository.js';
import { sendInsufficientCreditsResponse } from '../billing/billingErrorUtils.js';

export const presentationRouter = Router();

/**
 * GET /api/presentation/health
 * Lightweight probe to verify route registration and server connectivity.
 */
presentationRouter.get('/health', (_req, res) => {
  return res.json({
    status: 'ok',
    module: 'presentation',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/presentation/generate
 */
presentationRouter.post('/generate', async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      error: 'Unauthorized: Authenticated user session required.',
      code: 'AUTH_REQUIRED'
    });
  }

  const {
    prompt,
    brandGuidelines,
    logoAssetId,
    targetSlideCount,
    productContext,
    customTheme,
    generationId,
    policyName
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      error: 'Creative prompt is required.',
      code: 'PROMPT_REQUIRED'
    });
  }

  const userId = req.user.uid;
  const workspaceId =
    req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

  try {
    const result = await presentationService.generatePresentation({
      prompt: prompt.trim(),
      workspaceId,
      userId,
      brandGuidelines,
      logoAssetId,
      targetSlideCount: typeof targetSlideCount === 'number' ? targetSlideCount : undefined,
      productContext,
      customTheme,
      generationId,
      policyName
    });

    return res.json(result);
  } catch (err: any) {
    if (err.status === 402 || err.code === 'INSUFFICIENT_CREDITS' || err.message?.includes('Insufficient credits')) {
      return sendInsufficientCreditsResponse(res, {
        service: 'Corporate Presentation',
        action: 'presentation_generation',
        required: err.required ?? err.details?.required ?? 5,
        available: err.available ?? err.details?.available
      });
    }
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Presentation generation failed.',
      code: err.code || 'PRESENTATION_GENERATION_FAILED',
      retryable: Boolean(err.retryable),
      available: err.available ?? err.details?.available,
      required: err.required ?? err.details?.required,
      details: err.details
    });
  }
});

/**
 * GET /api/presentation/:id
 */
presentationRouter.get('/:id', async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const userId = req.user.uid;
  const workspaceId =
    req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

  try {
    const doc = await presentationService.getPresentation(req.params.id, workspaceId);
    if (!doc) {
      return res.status(404).json({ error: 'Presentation not found.', code: 'NOT_FOUND' });
    }
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/presentation/:id
 * Optimistic concurrency update.
 */
presentationRouter.put('/:id', async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const { document, expectedVersion } = req.body;
  if (!document || typeof expectedVersion !== 'number') {
    return res.status(400).json({
      error: 'Invalid payload: document and expectedVersion are required.',
      code: 'INVALID_PAYLOAD'
    });
  }

  const userId = req.user.uid;
  const workspaceId =
    req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

  try {
    const updated = await presentationService.updatePresentation(
      document,
      expectedVersion,
      workspaceId,
      userId
    );
    return res.json(updated);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message,
      code: err.code || 'UPDATE_FAILED',
      currentVersion: err.currentVersion
    });
  }
});

/**
 * POST /api/presentation/:id/export
 * Queues server-side export job (pptx or pdf).
 */
presentationRouter.post('/:id/export', async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  const { format } = req.body;
  if (format !== 'pptx' && format !== 'pdf') {
    return res.status(400).json({
      error: 'Invalid export format. Must be "pptx" or "pdf".',
      code: 'INVALID_FORMAT'
    });
  }

  const userId = req.user.uid;
  const workspaceId =
    req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

  try {
    const job = await presentationService.requestExport(req.params.id, format, workspaceId, userId);
    return res.json(job);
  } catch (err: any) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message, code: err.code || 'EXPORT_JOB_FAILED' });
  }
});

/**
 * GET /api/presentation/export/:exportId
 * Polls status of an export job and returns signed download URL when ready.
 */
presentationRouter.get('/export/:exportId', async (req, res) => {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  }

  try {
    const job = await presentationService.getExportStatus(req.params.exportId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found.', code: 'NOT_FOUND' });
    }
    return res.json(job);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
