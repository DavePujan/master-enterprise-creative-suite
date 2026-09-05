/**
 * Video Generation REST API Router.
 * Mounted at /api/video.
 * Exposes endpoints for video generation dispatch, status polling, cancellation,
 * Auto-Write cinematography planning, and engine capabilities.
 */

import { Router } from 'express';
import { videoGenerationService } from './videoGenerationService.js';
import { videoCreativePlanner } from './videoCreativePlanner.js';
import { workspaceRepository } from '../../repositories/workspaceRepository.js';
import { sendInsufficientCreditsResponse } from '../billing/billingErrorUtils.js';
import { VideoGenerationRequest } from '../../../../../packages/types/videoGeneration.js';
import { VIDEO_CAPABILITIES } from './videoCapabilityRegistry.js';

export const videoRouter = Router();

// Helper to resolve user & workspace
async function resolveAuthContext(req: any) {
  const userId = req.user?.uid || 'user_dev_default';
  const email = req.user?.email || 'dev@writopedia.ai';
  const workspaceId =
    req.user?.workspaceId ||
    req.body?.workspaceId ||
    req.headers['x-workspace-id'] ||
    (await workspaceRepository.ensurePersonalWorkspace(userId, email));

  return { userId, workspaceId };
}

// GET /api/video/capabilities
videoRouter.get('/capabilities', (_req, res) => {
  return res.json({ capabilities: videoGenerationService.getCapabilities() });
});

// POST /api/video/generate
videoRouter.post('/generate', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const requestPayload: VideoGenerationRequest = req.body;

    if (!requestPayload || (!requestPayload.prompt && !requestPayload.startFrameAssetId)) {
      return res.status(400).json({
        error: 'Missing required prompt or startFrameAssetId in request body.',
        code: 'INVALID_REQUEST'
      });
    }

    const job = await videoGenerationService.generate(requestPayload, authContext);
    return res.status(202).json({ job });
  } catch (err: any) {
    console.error('[videoRouter /generate] Error:', err);

    if (err.statusCode === 402 || err.code === 'INSUFFICIENT_CREDITS' || err.message?.includes('Insufficient credits')) {
      const selected = req.body?.selectedEngine;
      const cap = selected && VIDEO_CAPABILITIES[selected as keyof typeof VIDEO_CAPABILITIES];
      const serviceName = cap ? cap.displayName : 'Video Studio';

      return sendInsufficientCreditsResponse(res, {
        service: serviceName,
        action: 'video_generation',
        model: selected,
        required: err.requiredCredits || (cap ? cap.creditCost : 20),
        available: err.availableCredits
      });
    }

    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    return res.status(statusCode).json({
      error: err.message || 'Failed to initialize video generation job.',
      code: err.code || 'VIDEO_GENERATION_FAILED',
      field: err.field
    });
  }
});

// GET /api/video/jobs/:jobId
videoRouter.get('/jobs/:jobId', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { jobId } = req.params;

    const job = await videoGenerationService.getJobStatus(jobId, authContext.workspaceId);
    if (!job) {
      return res.status(404).json({
        error: `Video job ${jobId} not found.`,
        code: 'JOB_NOT_FOUND'
      });
    }

    return res.json({ job });
  } catch (err: any) {
    console.error(`[videoRouter /jobs/${req.params.jobId}] Error:`, err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch job status.',
      code: 'JOB_FETCH_FAILED'
    });
  }
});

// POST /api/video/jobs/:jobId/cancel
videoRouter.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { jobId } = req.params;

    const result = await videoGenerationService.cancelJob(jobId, authContext.workspaceId);
    return res.json(result);
  } catch (err: any) {
    console.error(`[videoRouter /jobs/${req.params.jobId}/cancel] Error:`, err);
    return res.status(500).json({
      error: err.message || 'Failed to cancel job.',
      code: 'CANCEL_FAILED'
    });
  }
});

// POST /api/video/jobs/:jobId/edit (Conversational iterative follow-up edit)
videoRouter.post('/jobs/:jobId/edit', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { jobId } = req.params;
    const { editInstruction, prompt } = req.body;

    const instruction = (editInstruction || prompt || '').trim();
    if (!instruction) {
      return res.status(400).json({
        error: 'Missing required editInstruction or prompt in request body.',
        code: 'MISSING_INSTRUCTION'
      });
    }

    const parentJob = await videoGenerationService.getJobStatus(jobId, authContext.workspaceId);
    if (!parentJob) {
      return res.status(404).json({
        error: `Parent video job ${jobId} not found.`,
        code: 'JOB_NOT_FOUND'
      });
    }

    const editRequest: VideoGenerationRequest = {
      mode: 'edit_video',
      prompt: instruction,
      editInstruction: instruction,
      selectedEngine: 'google-omni', // Google Omni handles conversational video edits
      previousInteractionId: parentJob.interactionId || parentJob.providerJobId,
      aspectRatio: '16:9'
    };

    const newJob = await videoGenerationService.generate(editRequest, authContext);
    return res.status(202).json({ job: newJob });
  } catch (err: any) {
    console.error(`[videoRouter /jobs/${req.params.jobId}/edit] Error:`, err);
    if (err.statusCode === 402 || err.code === 'INSUFFICIENT_CREDITS' || err.message?.includes('Insufficient credits')) {
      return sendInsufficientCreditsResponse(res, {
        service: 'Google Omni 1.1 Flash (Video Edit)',
        action: 'video_edit',
        model: 'google-omni',
        required: 20,
        available: err.availableCredits
      });
    }
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    return res.status(statusCode).json({
      error: err.message || 'Failed to dispatch video edit job.',
      code: err.code || 'VIDEO_EDIT_FAILED'
    });
  }
});

// POST /api/video/jobs/:jobId/extend (Video continuation)
videoRouter.post('/jobs/:jobId/extend', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { jobId } = req.params;
    const { prompt, durationSeconds } = req.body;

    const parentJob = await videoGenerationService.getJobStatus(jobId, authContext.workspaceId);
    if (!parentJob) {
      return res.status(404).json({
        error: `Parent video job ${jobId} not found.`,
        code: 'JOB_NOT_FOUND'
      });
    }

    const extendRequest: VideoGenerationRequest = {
      mode: 'extend_video',
      prompt: (prompt || 'Continue video sequence with cinematic visual continuity').trim(),
      selectedEngine: parentJob.engine,
      previousInteractionId: parentJob.interactionId || parentJob.providerJobId,
      durationSeconds: durationSeconds || 5
    };

    const newJob = await videoGenerationService.generate(extendRequest, authContext);
    return res.status(202).json({ job: newJob });
  } catch (err: any) {
    console.error(`[videoRouter /jobs/${req.params.jobId}/extend] Error:`, err);
    if (err.statusCode === 402 || err.code === 'INSUFFICIENT_CREDITS' || err.message?.includes('Insufficient credits')) {
      return sendInsufficientCreditsResponse(res, {
        service: 'Video Extension',
        action: 'video_extend',
        required: 20,
        available: err.availableCredits
      });
    }
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
    return res.status(statusCode).json({
      error: err.message || 'Failed to dispatch video extension job.',
      code: err.code || 'VIDEO_EXTEND_FAILED'
    });
  }
});

// Handler for Auto-Write Video Director
async function handleVideoPlanRequest(req: any, res: any) {
  try {
    const authContext = await resolveAuthContext(req);
    const { topic, creativeTone, platform, productName, targetAudience, idempotencyKey } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        error: 'Missing required topic in request body.',
        code: 'MISSING_TOPIC'
      });
    }

    const plan = await videoCreativePlanner.generatePlan(
      {
        topic: topic.trim(),
        creativeTone,
        platform,
        productName,
        targetAudience,
        idempotencyKey
      },
      authContext
    );

    return res.json({ plan });
  } catch (err: any) {
    console.error('[videoRouter /plan or /autowrite] Error:', err);

    if (err.statusCode === 402 || err.code === 'INSUFFICIENT_CREDITS' || err.message?.includes('Insufficient credits')) {
      return sendInsufficientCreditsResponse(res, {
        service: 'Video Auto-Write Director',
        action: 'video_plan',
        required: 1,
        available: err.availableCredits
      });
    }

    return res.status(500).json({
      error: err.message || 'Failed to generate video creative plan.',
      code: 'PLAN_GENERATION_FAILED'
    });
  }
}

// POST /api/video/plan (Auto-Write Video Director)
videoRouter.post('/plan', handleVideoPlanRequest);

// POST /api/video/autowrite (Alias for /plan)
videoRouter.post('/autowrite', handleVideoPlanRequest);
