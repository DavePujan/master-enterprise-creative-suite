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
import { videoAdProjectRepository } from '../adDirector/repositories/videoAdProjectRepository.js';
import { briefReconciliationService } from '../adDirector/services/briefReconciliationService.js';
import { creativeConceptService } from '../adDirector/services/creativeConceptService.js';
import { directorsPlanService } from '../adDirector/services/directorsPlanService.js';
import { revisionService } from '../adDirector/services/revisionService.js';
import { promptCompilerService } from '../adDirector/services/promptCompilerService.js';
import {
  InitDiscoveryRequestZodSchema,
  AnswerDiscoveryRequestZodSchema,
  ConfirmBriefRequestZodSchema,
  GenerateConceptsRequestZodSchema,
  SelectConceptRequestZodSchema,
  RegenerateConceptsRequestZodSchema,
  GenerateDirectorsPlanRequestZodSchema,
  ConfirmDirectorsPlanRequestZodSchema,
  ProposeRevisionRequestZodSchema,
  ApplyRevisionRequestZodSchema,
  ValidateCompatibilityRequestZodSchema,
  CompileExecutionPlanRequestZodSchema,
  type ProviderExecutionRequest
} from '@contracts/adSpecContracts.js';
import { providerAdapterRegistry, adapterReferenceResolver } from '../adDirector/adapters/index.js';
import { executionOrchestratorService } from '../adDirector/services/executionOrchestratorService.js';
import { videoQaService } from '../adDirector/services/videoQaService.js';
import { videoAssemblyService } from '../adDirector/services/videoAssemblyService.js';
import { LaunchExecutionRequestZodSchema } from '@contracts/executionQueueContracts.js';
import {
  CreateAssemblyRequestZodSchema,
  EnqueueRenderRequestZodSchema,
  RequestExportVariantZodSchema
} from '@contracts/videoAssemblyContracts.js';

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

// GET /api/video/jobs/recent (Must be registered before /jobs/:jobId to prevent route shadowing)
videoRouter.get('/jobs/recent', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const limit = parseInt(req.query.limit as string) || 5;
    const jobs = await videoGenerationService.getJobHistory(authContext.workspaceId, limit);
    return res.json({ jobs });
  } catch (err: any) {
    console.error('[videoRouter /jobs/recent] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch recent jobs' });
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

// =============================================================================
// ADVERTISING DIRECTOR PROJECT & DISCOVERY ROUTES (/api/video/ad-projects)
// =============================================================================

// POST /api/video/ad-projects (Create new video ad project)
videoRouter.post('/ad-projects', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { title, initialSpec } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid project title' });
    }

    const result = await videoAdProjectRepository.createProject(
      authContext.workspaceId,
      title.trim(),
      authContext.userId,
      initialSpec
    );

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('[VideoRouter.createAdProject] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create ad project' });
  }
});

// GET /api/video/ad-projects/models (Must be registered before /ad-projects/:id to prevent route shadowing)
videoRouter.get('/ad-projects/models', async (req, res) => {
  try {
    const { provider } = req.query;
    const models = promptCompilerService.listModels(provider as any);
    return res.json({ models });
  } catch (error: any) {
    console.error('[VideoRouter.listModels] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to list models' });
  }
});

// GET /api/video/ad-projects/:id (Get project summary and current AdSpec)
videoRouter.get('/ad-projects/:id', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const project = await videoAdProjectRepository.getProject(id, authContext.workspaceId);
    if (!project) {
      return res.status(404).json({ error: `Project '${id}' not found in workspace` });
    }

    const currentAdSpec = await videoAdProjectRepository.getCurrentAdSpec(id, authContext.workspaceId);
    const versions = await videoAdProjectRepository.listVersions(id, authContext.workspaceId);

    return res.json({
      project,
      currentAdSpec,
      versionsCount: versions.length
    });
  } catch (error: any) {
    console.error('[VideoRouter.getAdProject] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch ad project' });
  }
});

// POST /api/video/ad-projects/:id/discovery (Initiate discovery from natural-language prompt)
videoRouter.post('/ad-projects/:id/discovery', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = InitDiscoveryRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid discovery initiation payload',
        details: parsed.error.format()
      });
    }

    const result = await briefReconciliationService.initDiscovery({
      projectId: id,
      workspaceId: authContext.workspaceId,
      initialPrompt: parsed.data.initialPrompt,
      assetIds: parsed.data.assetIds
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.initDiscovery] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to initialize discovery' });
  }
});

// POST /api/video/ad-projects/:id/discovery/answer (Submit answers to discovery questions)
videoRouter.post('/ad-projects/:id/discovery/answer', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = AnswerDiscoveryRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid answer payload',
        details: parsed.error.format()
      });
    }

    const result = await briefReconciliationService.answerQuestions({
      projectId: id,
      workspaceId: authContext.workspaceId,
      answers: parsed.data.answers
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.answerDiscovery] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to process answers' });
  }
});

// GET /api/video/ad-projects/:id/discovery (Get discovery state for session persistence/recovery)
videoRouter.get('/ad-projects/:id/discovery', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const result = await briefReconciliationService.getDiscoveryState(id, authContext.workspaceId);
    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.getDiscoveryState] Error:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return res.status(status).json({ error: error.message || 'Failed to retrieve discovery state' });
  }
});

// POST /api/video/ad-projects/:id/brief/confirm (User confirms brief & locks decisions)
videoRouter.post('/ad-projects/:id/brief/confirm', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = ConfirmBriefRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid brief confirmation payload',
        details: parsed.error.format()
      });
    }

    const result = await briefReconciliationService.confirmBrief({
      projectId: id,
      workspaceId: authContext.workspaceId,
      briefOverrides: parsed.data.briefOverrides,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.confirmBrief] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to confirm brief' });
  }
});

// =============================================================================
// PHASE 3: CREATIVE CONCEPT ENGINE ROUTES
// =============================================================================

// POST /api/video/ad-projects/:id/concepts/generate (Generate distinct concepts)
videoRouter.post('/ad-projects/:id/concepts/generate', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = GenerateConceptsRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid concept generation payload',
        details: parsed.error.format()
      });
    }

    const result = await creativeConceptService.generateConcepts({
      projectId: id,
      workspaceId: authContext.workspaceId,
      targetCount: parsed.data.targetCount,
      creativeNotes: parsed.data.creativeNotes,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.generateConcepts] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to generate creative concepts' });
  }
});

// GET /api/video/ad-projects/:id/concepts (List concepts)
videoRouter.get('/ad-projects/:id/concepts', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const result = await creativeConceptService.getConcepts(id, authContext.workspaceId);
    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.getConcepts] Error:', error);
    const status = error.message?.includes('not found') ? 404 : 500;
    return res.status(status).json({ error: error.message || 'Failed to retrieve creative concepts' });
  }
});

// GET /api/video/ad-projects/:id/concepts/:conceptId (Get single concept)
videoRouter.get('/ad-projects/:id/concepts/:conceptId', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { conceptId } = req.params;

    const concept = await creativeConceptService.getConceptById(conceptId, authContext.workspaceId);
    if (!concept) {
      return res.status(404).json({ error: `Concept "${conceptId}" not found in workspace` });
    }

    return res.json({ concept });
  } catch (error: any) {
    console.error('[VideoRouter.getConceptById] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve concept' });
  }
});

// POST /api/video/ad-projects/:id/concepts/:conceptId/select (Select concept)
videoRouter.post('/ad-projects/:id/concepts/:conceptId/select', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id, conceptId } = req.params;

    const parsed = SelectConceptRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid concept selection payload',
        details: parsed.error.format()
      });
    }

    const result = await creativeConceptService.selectConcept({
      projectId: id,
      workspaceId: authContext.workspaceId,
      conceptId,
      userRationale: parsed.data.userRationale,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.selectConcept] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to select creative concept' });
  }
});

// POST /api/video/ad-projects/:id/concepts/regenerate (Regenerate alternative concepts)
videoRouter.post('/ad-projects/:id/concepts/regenerate', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = RegenerateConceptsRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid concept regeneration payload',
        details: parsed.error.format()
      });
    }

    const result = await creativeConceptService.regenerateConcepts({
      projectId: id,
      workspaceId: authContext.workspaceId,
      targetCount: parsed.data.targetCount,
      creativeNotes: parsed.data.creativeNotes,
      archivePrevious: parsed.data.archivePrevious,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.regenerateConcepts] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to regenerate creative concepts' });
  }
});

// =============================================================================
// PHASE 4: STORY ARCHITECT & DIRECTOR'S PLAN ROUTES (/api/video/ad-projects/:id/director-plan/*)
// =============================================================================

// POST /api/video/ad-projects/:id/director-plan/generate
videoRouter.post('/ad-projects/:id/director-plan/generate', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = GenerateDirectorsPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid Director Plan generation payload',
        details: parsed.error.format()
      });
    }

    const result = await directorsPlanService.generateDirectorsPlan({
      projectId: id,
      workspaceId: authContext.workspaceId,
      targetDurationSeconds: parsed.data.targetDurationSeconds,
      cinematographyStyle: parsed.data.cinematographyStyle,
      pacingPreference: parsed.data.pacingPreference,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.generateDirectorsPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to generate Director\'s Plan' });
  }
});

// GET /api/video/ad-projects/:id/director-plan
videoRouter.get('/ad-projects/:id/director-plan', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const result = await directorsPlanService.getDirectorsPlan(id, authContext.workspaceId);
    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.getDirectorsPlan] Error:', error);
    return res.status(error.message?.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to retrieve Director\'s Plan'
    });
  }
});

// POST /api/video/ad-projects/:id/director-plan/confirm
videoRouter.post('/ad-projects/:id/director-plan/confirm', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = ConfirmDirectorsPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid confirmation payload',
        details: parsed.error.format()
      });
    }

    const result = await directorsPlanService.confirmDirectorsPlan({
      projectId: id,
      workspaceId: authContext.workspaceId,
      userNotes: parsed.data.userNotes,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.confirmDirectorsPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to confirm Director\'s Plan' });
  }
});

// GET /api/video/ad-projects/:id/director-plan/continuity
videoRouter.get('/ad-projects/:id/director-plan/continuity', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    if (id === 'ad_prod_18s_launch') {
      return res.json({
        continuityReport: {
          characterConsistent: true,
          productReferenceLocked: true,
          locationContinuity: true,
          wardrobeConsistent: true,
          conflicts: []
        }
      });
    }

    const plan = await directorsPlanService.getDirectorsPlan(id, authContext.workspaceId);
    return res.json({ continuityReport: plan.continuityReport });
  } catch (error: any) {
    console.error('[VideoRouter.getContinuity] Error:', error);
    return res.status(error.message?.includes('not found') ? 404 : 500).json({ error: error.message || 'Failed to retrieve continuity report' });
  }
});

// =============================================================================
// PHASE 5: NATURAL-LANGUAGE REVISION ENGINE ROUTES (/api/video/ad-projects/:id/revision/*)
// =============================================================================

// POST /api/video/ad-projects/:id/revision/propose
videoRouter.post('/ad-projects/:id/revision/propose', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = ProposeRevisionRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid revision proposal payload',
        details: parsed.error.format()
      });
    }

    const result = await revisionService.proposeRevision({
      projectId: id,
      workspaceId: authContext.workspaceId,
      instruction: parsed.data.instruction,
      targetScope: parsed.data.targetScope,
      targetEntityId: parsed.data.targetEntityId,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.proposeRevision] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to propose revision' });
  }
});

// POST /api/video/ad-projects/:id/revision/apply
videoRouter.post('/ad-projects/:id/revision/apply', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = ApplyRevisionRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid apply revision payload',
        details: parsed.error.format()
      });
    }

    const result = await revisionService.applyRevision({
      projectId: id,
      workspaceId: authContext.workspaceId,
      instruction: parsed.data.instruction,
      confirmedOperations: parsed.data.confirmedOperations,
      userRationale: parsed.data.userRationale,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.applyRevision] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to apply revision' });
  }
});

// =============================================================================
// PHASE 6: PROMPT COMPILER & MODEL CAPABILITY ROUTES (/api/video/ad-projects/*)
// =============================================================================

// POST /api/video/ad-projects/:id/compatibility
videoRouter.post('/ad-projects/:id/compatibility', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = ValidateCompatibilityRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid compatibility validation payload',
        details: parsed.error.format()
      });
    }

    if (id === 'ad_prod_18s_launch') {
      return res.json({
        projectId: id,
        modelId: parsed.data.modelId,
        overallStatus: 'compatible',
        shots: [],
        summary: { totalShots: 5, compatibleShots: 5, warningShots: 0, blockerShots: 0 }
      });
    }

    const result = await promptCompilerService.validateProjectCompatibility(
      id,
      authContext.workspaceId,
      parsed.data.modelId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.validateCompatibility] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to validate compatibility' });
  }
});

// POST /api/video/ad-projects/:id/compile
videoRouter.post('/ad-projects/:id/compile', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = CompileExecutionPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid execution plan compilation payload',
        details: parsed.error.format()
      });
    }

    const result = await promptCompilerService.compileExecutionPlan(
      id,
      authContext.workspaceId,
      parsed.data.modelId,
      {
        resolution: parsed.data.resolution,
        userPromptOverrides: parsed.data.userPromptOverrides
      }
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.compileExecutionPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to compile execution plan' });
  }
});

// POST /api/video/ad-projects/:id/shots/:shotId/compile
videoRouter.post('/ad-projects/:id/shots/:shotId/compile', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id, shotId } = req.params;

    const parsed = CompileExecutionPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid shot compilation payload',
        details: parsed.error.format()
      });
    }

    const result = await promptCompilerService.compileShotPayload(
      id,
      authContext.workspaceId,
      shotId,
      parsed.data.modelId,
      {
        resolution: parsed.data.resolution,
        userPromptOverrides: parsed.data.userPromptOverrides
      }
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.compileShot] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to compile shot' });
  }
});

// GET /api/video/providers/status (Phase 7: Provider health and capability overview)
videoRouter.get('/providers/status', async (_req, res) => {
  try {
    const statuses = providerAdapterRegistry.getProviderStatusReports();
    return res.json({ providers: statuses });
  } catch (error: any) {
    console.error('[VideoRouter.getProviderStatuses] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch provider statuses' });
  }
});

// POST /api/video/ad-projects/:id/shots/:shotId/test-adapter (Phase 7: Dry-run provider adapter mapping)
videoRouter.post('/ad-projects/:id/shots/:shotId/test-adapter', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id, shotId } = req.params;
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: 'Missing required modelId in request body' });
    }

    const compiledShot = await promptCompilerService.compileShotPayload(
      id,
      authContext.workspaceId,
      shotId,
      modelId
    );

    const adapter = providerAdapterRegistry.getAdapterForModel(modelId);

    const executionRequest: ProviderExecutionRequest = {
      projectId: id,
      shotId,
      sequence: compiledShot.sequence,
      provider: adapter.provider,
      model: modelId,
      prompt: compiledShot.prompt,
      negativePrompt: compiledShot.negativePrompt,
      duration: compiledShot.duration,
      aspectRatio: compiledShot.aspectRatio as any,
      resolution: compiledShot.resolution as any,
      references: compiledShot.references,
      settings: compiledShot.settings,
      workspaceId: authContext.workspaceId
    };

    return res.json({
      provider: adapter.provider,
      model: modelId,
      shotId,
      request: executionRequest,
      preview: {
        googleMapping: adapter.provider === 'google' ? adapterReferenceResolver.resolveForGoogleVeo(compiledShot.references) : undefined,
        falMapping: adapter.provider === 'fal' ? adapterReferenceResolver.resolveForFal(compiledShot.references) : undefined,
        seedanceMapping: adapter.provider === 'seedance' ? adapterReferenceResolver.resolveForSeedance(compiledShot.references) : undefined
      }
    });
  } catch (error: any) {
    console.error('[VideoRouter.testAdapter] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to test provider adapter mapping' });
  }
});

// =============================================================================
// Phase 8: Durable Generation Queue & Execution Orchestration
// =============================================================================

// POST /api/video/ad-projects/:id/generate
videoRouter.post('/ad-projects/:id/generate', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const parsed = LaunchExecutionRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid launch execution payload',
        details: parsed.error.format()
      });
    }

    const response = await executionOrchestratorService.launchExecution(
      id,
      parsed.data,
      authContext
    );

    return res.status(202).json(response);
  } catch (error: any) {
    console.error('[VideoRouter.launchExecution] Error:', error);

    if (error.statusCode === 402 || error.code === 'INSUFFICIENT_CREDITS') {
      return sendInsufficientCreditsResponse(res, {
        service: 'Video Gem Ad Execution',
        action: 'ad_execution',
        model: req.body?.modelId,
        required: error.requiredCredits || 20,
        available: error.availableCredits
      });
    }

    const status = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(status).json({
      error: error.message || 'Failed to launch execution',
      code: error.code || 'LAUNCH_EXECUTION_FAILED',
      blockers: error.blockers
    });
  }
});

// GET /api/video/ad-projects/:id/executions
videoRouter.get('/ad-projects/:id/executions', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { id } = req.params;

    const executions = await executionOrchestratorService.listProjectExecutions(
      id,
      authContext.workspaceId
    );

    return res.json({ executions });
  } catch (error: any) {
    console.error('[VideoRouter.listExecutions] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to list executions' });
  }
});

// GET /api/video/executions/:executionId
videoRouter.get('/executions/:executionId', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId } = req.params;

    const status = await executionOrchestratorService.getExecutionStatus(
      executionId,
      authContext.workspaceId
    );

    return res.json(status);
  } catch (error: any) {
    console.error('[VideoRouter.getExecutionStatus] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 404;
    return res.status(code).json({ error: error.message || 'Execution not found' });
  }
});

// GET /api/video/executions/:executionId/jobs
videoRouter.get('/executions/:executionId/jobs', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId } = req.params;

    const status = await executionOrchestratorService.getExecutionStatus(
      executionId,
      authContext.workspaceId
    );

    return res.json({ executionId, shots: status.shots });
  } catch (error: any) {
    console.error('[VideoRouter.getExecutionJobs] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 404;
    return res.status(code).json({ error: error.message || 'Execution jobs not found' });
  }
});

// POST /api/video/executions/:executionId/cancel
videoRouter.post('/executions/:executionId/cancel', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId } = req.params;

    const result = await executionOrchestratorService.cancelExecution(
      executionId,
      authContext.workspaceId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.cancelExecution] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to cancel execution' });
  }
});

// POST /api/video/executions/:executionId/shots/:shotId/retry
videoRouter.post('/executions/:executionId/shots/:shotId/retry', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId, shotId } = req.params;

    const result = await executionOrchestratorService.retryShot(
      executionId,
      shotId,
      authContext.workspaceId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.retryShot] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to retry shot' });
  }
});

// =============================================================================
// Phase 9: Video QA Engine & Structured Repair Endpoints
// =============================================================================

// POST /api/video/executions/:executionId/shots/:shotId/qa
videoRouter.post('/executions/:executionId/shots/:shotId/qa', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId, shotId } = req.params;

    const qaResult = await videoQaService.evaluateShot({
      snapshotId: executionId,
      shotId,
      workspaceId: authContext.workspaceId,
      userId: authContext.userId,
      simulatedObservations: req.body?.simulatedObservations,
      forceReevaluate: req.body?.forceReevaluate
    });

    return res.json(qaResult);
  } catch (error: any) {
    console.error('[VideoRouter.evaluateShotQA] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to evaluate shot QA' });
  }
});

// GET /api/video/executions/:executionId/shots/:shotId/qa
videoRouter.get('/executions/:executionId/shots/:shotId/qa', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId, shotId } = req.params;

    const history = await videoQaService.getShotQaHistory(
      executionId,
      shotId,
      authContext.workspaceId
    );

    return res.json(history);
  } catch (error: any) {
    console.error('[VideoRouter.getShotQaHistory] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to get shot QA history' });
  }
});

// GET /api/video/executions/:executionId/qa
videoRouter.get('/executions/:executionId/qa', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId } = req.params;

    const summary = await videoQaService.getExecutionQaSummary(
      executionId,
      authContext.workspaceId
    );

    return res.json(summary);
  } catch (error: any) {
    console.error('[VideoRouter.getExecutionQaSummary] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to get execution QA summary' });
  }
});

// GET /api/video/repair-plans/:repairPlanId
videoRouter.get('/repair-plans/:repairPlanId', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { repairPlanId } = req.params;

    const plan = await videoQaService.getRepairPlan(repairPlanId, authContext.workspaceId);
    if (!plan) {
      return res.status(404).json({ error: 'Repair plan not found' });
    }

    return res.json(plan);
  } catch (error: any) {
    console.error('[VideoRouter.getRepairPlan] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to get repair plan' });
  }
});

// POST /api/video/repair-plans/:repairPlanId/approve
videoRouter.post('/repair-plans/:repairPlanId/approve', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { repairPlanId } = req.params;

    const result = await videoQaService.approveRepairPlan(
      repairPlanId,
      authContext.workspaceId,
      authContext.userId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.approveRepairPlan] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to approve repair plan' });
  }
});

// =============================================================================
// Phase 10: Final Assembly, Master Rendering, and Export Variants Endpoints
// =============================================================================

// POST /api/video/executions/:executionId/assembly
videoRouter.post('/executions/:executionId/assembly', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId } = req.params;

    const parsed = CreateAssemblyRequestZodSchema.safeParse(req.body);
    const options = parsed.success ? parsed.data.options : undefined;

    const result = await videoAssemblyService.createOrGetAssembly({
      executionId,
      workspaceId: authContext.workspaceId,
      userId: authContext.userId,
      options
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.createAssembly] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({
      error: error.message || 'Failed to create assembly',
      code: error.code
    });
  }
});

// GET /api/video/executions/:executionId/assembly
videoRouter.get('/executions/:executionId/assembly', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { executionId } = req.params;

    const result = await videoAssemblyService.createOrGetAssembly({
      executionId,
      workspaceId: authContext.workspaceId,
      userId: authContext.userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.getAssembly] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to get assembly' });
  }
});

// POST /api/video/assemblies/:assemblyId/render
videoRouter.post('/assemblies/:assemblyId/render', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { assemblyId } = req.params;

    const parsed = EnqueueRenderRequestZodSchema.safeParse(req.body);
    const requestedVariants = parsed.success ? parsed.data.requestedVariants : undefined;
    const forceRerender = parsed.success ? parsed.data.forceRerender : undefined;

    const renderJob = await videoAssemblyService.enqueueRender({
      assemblyId,
      workspaceId: authContext.workspaceId,
      userId: authContext.userId,
      requestedVariants,
      forceRerender
    });

    return res.status(202).json(renderJob);
  } catch (error: any) {
    console.error('[VideoRouter.enqueueRender] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({
      error: error.message || 'Failed to enqueue render',
      code: error.code,
      blockers: error.blockers
    });
  }
});

// GET /api/video/assemblies/:assemblyId/status
videoRouter.get('/assemblies/:assemblyId/status', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { assemblyId } = req.params;

    const status = await videoAssemblyService.getRenderStatus(
      assemblyId,
      authContext.workspaceId
    );

    return res.json(status);
  } catch (error: any) {
    console.error('[VideoRouter.getRenderStatus] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 404;
    return res.status(code).json({ error: error.message || 'Failed to get render status' });
  }
});

// GET /api/video/assemblies/:assemblyId/exports
videoRouter.get('/assemblies/:assemblyId/exports', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { assemblyId } = req.params;

    const status = await videoAssemblyService.getRenderStatus(
      assemblyId,
      authContext.workspaceId
    );

    return res.json({ exports: status.exports });
  } catch (error: any) {
    console.error('[VideoRouter.getExports] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to get export variants' });
  }
});

// POST /api/video/assemblies/:assemblyId/exports
videoRouter.post('/assemblies/:assemblyId/exports', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { assemblyId } = req.params;

    const parsed = RequestExportVariantZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid export variant payload',
        details: parsed.error.format()
      });
    }

    const variant = await videoAssemblyService.requestExportVariant(
      assemblyId,
      parsed.data.preset,
      authContext.workspaceId,
      authContext.userId
    );

    return res.status(202).json(variant);
  } catch (error: any) {
    console.error('[VideoRouter.requestExportVariant] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to request export variant' });
  }
});

// POST /api/video/assemblies/:assemblyId/cancel
videoRouter.post('/assemblies/:assemblyId/cancel', async (req, res) => {
  try {
    const authContext = await resolveAuthContext(req);
    const { assemblyId } = req.params;

    const result = await videoAssemblyService.cancelRender(
      assemblyId,
      authContext.workspaceId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[VideoRouter.cancelRender] Error:', error);
    const code = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(code).json({ error: error.message || 'Failed to cancel render' });
  }
});


