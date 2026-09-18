/**
 * Ad Director Express Router.
 * Endpoints for Director Plan creation, structural validation, patch revisions,
 * version history, capability validation, and shot prompt compilation.
 */

import { Router } from 'express';
import { adDirectorService } from './adDirectorService.js';
import { adDirectorRepository } from './adDirectorRepository.js';
import { modelRegistryService } from './services/modelRegistryService.js';
import { generationPlanningService } from './services/generationPlanningService.js';
import { qaPersistenceService } from './services/qaPersistenceService.js';
import { workspaceRepository } from '../../repositories/workspaceRepository.js';
import { videoAdProjectRepository } from './repositories/videoAdProjectRepository.js';
import { videoAdValidationService } from './services/videoAdValidationService.js';
import { briefReconciliationService } from './services/briefReconciliationService.js';
import { creativeConceptService } from './services/creativeConceptService.js';
import { directorsPlanService } from './services/directorsPlanService.js';
import { revisionService } from './services/revisionService.js';
import { promptCompilerService } from './services/promptCompilerService.js';
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
  CompileExecutionPlanRequestZodSchema
} from '@contracts/adSpecContracts.js';
import type { PlanPatch, DirectorPlan } from '@shared-types/adDirector.js';

import type { VideoEngineKey } from '@shared-types/videoGeneration.js';

export const adDirectorRouter = Router();


// =============================================================================
// 1. Plan Lifecycle: Create & Retrieve
// =============================================================================

adDirectorRouter.post('/plans', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { title, initialPlan } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid title' });
    }

    const plan = await adDirectorService.createAdProject({
      workspaceId,
      userId,
      title: title.trim(),
      initialPlan
    });

    return res.status(201).json({ plan });
  } catch (error: any) {
    console.error('[AdDirectorRouter.createPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create Director Plan' });
  }
});

adDirectorRouter.get('/plans/:planId', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { planId } = req.params;
    const plan = await adDirectorService.getPlan(planId, workspaceId);
    if (!plan) {
      return res.status(404).json({ error: `Director Plan "${planId}" not found` });
    }

    return res.json({ plan });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getPlan] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve Director Plan' });
  }
});

adDirectorRouter.get('/plans/:planId/versions/:versionNumber', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { planId, versionNumber } = req.params;
    const parsedVersion = parseInt(versionNumber, 10);
    if (isNaN(parsedVersion) || parsedVersion < 1) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const versionRecord = await adDirectorService.getPlanVersion(planId, parsedVersion, workspaceId);
    if (!versionRecord) {
      return res.status(404).json({ error: `Version ${parsedVersion} of Plan "${planId}" not found` });
    }

    return res.json(versionRecord);
  } catch (error: any) {
    console.error('[AdDirectorRouter.getPlanVersion] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve Plan Version' });
  }
});

// =============================================================================
// 2. Deterministic Structural Validation
// =============================================================================

adDirectorRouter.post('/plans/validate', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || typeof plan !== 'object') {
      return res.status(400).json({ error: 'Missing plan object in request body' });
    }

    const result = adDirectorService.validatePlan(plan as DirectorPlan);
    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.validatePlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Validation failed' });
  }
});

// =============================================================================
// 3. Patch-Based Targeted Revision
// =============================================================================

adDirectorRouter.post('/plans/:planId/revise', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { planId } = req.params;
    const patch = req.body.patch as PlanPatch;

    if (!patch || !patch.targetScope || !patch.changes) {
      return res.status(400).json({ error: 'Invalid patch payload: targetScope and changes are required' });
    }

    // Attach server provenance if not fully populated
    if (!patch.provenance) {
      patch.provenance = {
        source: 'user',
        authorId: userId,
        timestamp: new Date().toISOString()
      };
    }
    if (!patch.patchId) {
      patch.patchId = `patch_${Date.now()}`;
    }

    const result = await adDirectorService.revisePlan({
      planId,
      workspaceId,
      userId,
      patch
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.revisePlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to apply patch revision' });
  }
});

// =============================================================================
// 4. Plan Approval
// =============================================================================

adDirectorRouter.post('/plans/:planId/approve', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { planId } = req.params;
    const { versionNumber } = req.body;
    const ver = typeof versionNumber === 'number' ? versionNumber : 1;

    const approved = await adDirectorService.approvePlanVersion(planId, ver, workspaceId);
    if (!approved) {
      return res.status(404).json({ error: `Plan "${planId}" or version ${ver} not found` });
    }

    return res.json({ success: true, planId, versionNumber: ver, status: 'approved' });
  } catch (error: any) {
    console.error('[AdDirectorRouter.approvePlan] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve Plan' });
  }
});

// =============================================================================
// 5. Capability Check & Prompt Compilation
// =============================================================================

adDirectorRouter.post('/plans/:planId/shots/:shotId/validate-capabilities', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { planId, shotId } = req.params;
    const { engineKey = 'veo-pro' } = req.body;

    const plan = await adDirectorService.getPlan(planId, workspaceId);
    if (!plan) {
      return res.status(404).json({ error: `Director Plan "${planId}" not found` });
    }

    const shot = plan.shots.find(s => s.id === shotId);
    if (!shot) {
      return res.status(404).json({ error: `Shot "${shotId}" not found in Director Plan` });
    }

    const result = adDirectorService.evaluateShotCapabilities(shot, plan, engineKey as VideoEngineKey);
    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.validateCapabilities] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to validate shot capabilities' });
  }
});

adDirectorRouter.post('/plans/:planId/shots/:shotId/compile', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { planId, shotId } = req.params;
    const { engineKey = 'veo-pro', userPromptOverrides } = req.body;

    const compiledRequest = await adDirectorService.compileShot({
      planId,
      shotId,
      workspaceId,
      engineKey: engineKey as VideoEngineKey,
      userPromptOverrides
    });

    return res.json({ compiledRequest });
  } catch (error: any) {
    console.error('[AdDirectorRouter.compileShot] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to compile shot' });
  }
});

// =============================================================================
// 6. AdSpec v1 Canonical Endpoints
// =============================================================================

adDirectorRouter.post('/adspec', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { title, initialSpec } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid title' });
    }

    const adSpec = await adDirectorService.createAdSpec({
      workspaceId,
      userId,
      title: title.trim(),
      initialSpec
    });

    return res.status(201).json({ adSpec });
  } catch (error: any) {
    console.error('[AdDirectorRouter.createAdSpec] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create AdSpec' });
  }
});

adDirectorRouter.get('/adspec/:adId', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const adSpec = await adDirectorService.getAdSpec(adId, workspaceId);
    if (!adSpec) {
      return res.status(404).json({ error: `AdSpec "${adId}" not found` });
    }

    return res.json({ adSpec });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getAdSpec] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve AdSpec' });
  }
});

adDirectorRouter.get('/adspec/:adId/versions/:specVersion', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId, specVersion } = req.params;
    const parsedVersion = parseInt(specVersion, 10);
    if (isNaN(parsedVersion) || parsedVersion < 1) {
      return res.status(400).json({ error: 'Invalid specVersion number' });
    }

    const versionRecord = await adDirectorService.getAdSpecVersion(adId, parsedVersion, workspaceId);
    if (!versionRecord) {
      return res.status(404).json({ error: `Version ${parsedVersion} of AdSpec "${adId}" not found` });
    }

    return res.json(versionRecord);
  } catch (error: any) {
    console.error('[AdDirectorRouter.getAdSpecVersion] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve AdSpec version' });
  }
});

adDirectorRouter.post('/adspec/validate', async (req, res) => {
  try {
    const { adSpec } = req.body;
    if (!adSpec || typeof adSpec !== 'object') {
      return res.status(400).json({ error: 'Missing adSpec object in request body' });
    }

    const result = adDirectorService.validateAdSpec(adSpec);
    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.validateAdSpec] Error:', error);
    return res.status(400).json({ error: error.message || 'AdSpec validation failed' });
  }
});

adDirectorRouter.post('/adspec/:adId/revise', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const patch = req.body.patch;

    if (!patch || !patch.targetScope || !patch.changes) {
      return res.status(400).json({ error: 'Invalid patch payload: targetScope and changes are required' });
    }

    if (!patch.actor) {
      patch.actor = { id: userId, role: 'user' };
    }
    if (!patch.revisionId) {
      patch.revisionId = `rev_${Date.now()}`;
    }

    const result = await adDirectorService.reviseAdSpec({
      adId,
      workspaceId,
      userId,
      patch
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.reviseAdSpec] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to apply AdSpec revision' });
  }
});

adDirectorRouter.post('/adspec/:adId/approve', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const { specVersion = 1 } = req.body;

    const approved = await adDirectorService.approveAdSpec(adId, specVersion, workspaceId);
    if (!approved) {
      return res.status(404).json({ error: `AdSpec "${adId}" version ${specVersion} not found` });
    }

    return res.json({ success: true, adId, specVersion, creativeState: 'approved' });
  } catch (error: any) {
    console.error('[AdDirectorRouter.approveAdSpec] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to approve AdSpec' });
  }
});

adDirectorRouter.post('/adspec/:adId/snapshot', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const { specVersion = 1 } = req.body;

    const snapshot = await adDirectorService.createExecutionSnapshot(adId, specVersion, workspaceId, userId);
    return res.status(201).json({ snapshot });
  } catch (error: any) {
    console.error('[AdDirectorRouter.createExecutionSnapshot] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create execution snapshot' });
  }
});

adDirectorRouter.post('/adspec/adapt-legacy', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { prompt, aspectRatio, durationSeconds, startFrameAssetId, referenceAssetIds } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt for legacy adaptation' });
    }

    const adSpec = adDirectorService.adaptLegacyVideoRequest(
      { prompt, aspectRatio, durationSeconds, startFrameAssetId, referenceAssetIds },
      { workspaceId, userId }
    );

    return res.json({ adSpec });
  } catch (error: any) {
    console.error('[AdDirectorRouter.adaptLegacy] Error:', error);
    return res.status(400).json({ error: error.message || 'Legacy adaptation failed' });
  }
});

// =============================================================================
// 6. Operation-Based AI Boundary & Stage Orchestration
// =============================================================================

adDirectorRouter.post('/adspec/:adId/operations', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const operation = req.body.operation;

    if (!operation || typeof operation !== 'object') {
      return res.status(400).json({ error: 'Missing operation payload' });
    }

    if (!operation.actor) {
      operation.actor = { id: userId, role: 'user' };
    }

    const result = await adDirectorService.applyOperation({
      adId,
      workspaceId,
      userId,
      operation
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.applyOperation] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to apply Director operation' });
  }
});

adDirectorRouter.post('/adspec/:adId/impact', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const operation = req.body.operation;

    if (!operation || typeof operation !== 'object') {
      return res.status(400).json({ error: 'Missing operation payload for impact analysis' });
    }

    const impact = await adDirectorService.analyzeImpact({
      adId,
      workspaceId,
      operation
    });

    return res.json({ impact });
  } catch (error: any) {
    console.error('[AdDirectorRouter.analyzeImpact] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to analyze operation impact' });
  }
});

adDirectorRouter.get('/adspec/:adId/continuity', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId } = req.params;
    const report = await adDirectorService.checkContinuity({
      adId,
      workspaceId
    });

    return res.json({ report });
  } catch (error: any) {
    console.error('[AdDirectorRouter.checkContinuity] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to inspect continuity' });
  }
});

adDirectorRouter.post('/adspec/:adId/stages/:stage', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { adId, stage } = req.params;
    const { payload, applyImmediately = true } = req.body;

    const result = await adDirectorService.runStage({
      adId,
      workspaceId,
      userId,
      stage: stage as any,
      payload,
      applyImmediately
    });

    return res.json(result);
  } catch (error: any) {
    console.error(`[AdDirectorRouter.runStage:${req.params.stage}] Error:`, error);
    return res.status(400).json({ error: error.message || `Failed to execute stage "${req.params.stage}"` });
  }
});

// =============================================================================
// 7. Model Registry & Deterministic Compatibility Validation
// =============================================================================

adDirectorRouter.get('/models/available', (_req, res) => {
  const models = modelRegistryService.getAvailableModels();
  return res.json({ models });
});

adDirectorRouter.post('/models/validate', async (req, res) => {
  try {
    const { adSpec, engineKey = 'veo-pro' } = req.body;
    if (!adSpec || typeof adSpec !== 'object') {
      return res.status(400).json({ error: 'Missing adSpec object in request body' });
    }

    const result = modelRegistryService.validateModelCompatibility(adSpec, engineKey);
    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.validateModelCompatibility] Error:', error);
    return res.status(400).json({ error: error.message || 'Model capability check failed' });
  }
});

// =============================================================================
// 8. Generation Planning & Job Dispatch (ai_jobs Bridge)
// =============================================================================

adDirectorRouter.post('/adspec/:adId/generation-plan', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { snapshotId, engineKey, idempotencyKey } = req.body;
    if (!snapshotId) {
      return res.status(400).json({ error: 'Missing snapshotId in request body' });
    }

    const response = await generationPlanningService.createGenerationPlan(
      { snapshotId, engineKey, idempotencyKey },
      { workspaceId, userId }
    );

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('[AdDirectorRouter.createGenerationPlan] Error:', error);
    const statusCode = typeof error.statusCode === 'number' ? error.statusCode : 400;
    return res.status(statusCode).json({
      error: error.message || 'Failed to create generation plan',
      code: error.code || 'GENERATION_PLAN_FAILED',
      blockingIssues: error.blockingIssues
    });
  }
});

// =============================================================================
// 9. Snapshots, Prompt Versions, Results, & QA Observability
// =============================================================================

adDirectorRouter.get('/adspec/:adId/snapshots/:snapshotId', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { snapshotId } = req.params;
    const snapshot = await adDirectorRepository.getExecutionSnapshot(snapshotId, workspaceId);
    if (!snapshot) {
      return res.status(404).json({ error: `Execution Snapshot "${snapshotId}" not found` });
    }

    return res.json({ snapshot });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getSnapshot] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve snapshot' });
  }
});

adDirectorRouter.get('/adspec/:adId/snapshots/:snapshotId/prompts', async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const { shotId } = req.query;

    const prompts = await adDirectorRepository.getPromptVersions(snapshotId, shotId as string | undefined);
    return res.json({ prompts });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getPromptVersions] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve prompt versions' });
  }
});

adDirectorRouter.get('/adspec/:adId/snapshots/:snapshotId/results', async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const { shotId } = req.query;

    const results = await adDirectorRepository.getGenerationResults(snapshotId, shotId as string | undefined);
    return res.json({ results });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getGenerationResults] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve generation results' });
  }
});

adDirectorRouter.get('/adspec/:adId/snapshots/:snapshotId/qa', async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const { shotId } = req.query;

    const qaResults = await adDirectorRepository.getQAResults(snapshotId, shotId as string | undefined);
    return res.json({ qaResults });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getQAResults] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve QA results' });
  }
});

adDirectorRouter.post('/adspec/:adId/snapshots/:snapshotId/qa', async (req, res) => {
  try {
    const { resultId, generationJobId, shotId, status, scores, issues } = req.body;
    const { snapshotId } = req.params;

    if (!resultId || !shotId || !status) {
      return res.status(400).json({ error: 'Missing required fields: resultId, shotId, and status are mandatory' });
    }

    const evaluation = await qaPersistenceService.recordQAEvaluation({
      resultId,
      generationJobId: generationJobId || `job_${shotId}`,
      snapshotId,
      shotId,
      status,
      scores,
      issues
    });

    return res.status(201).json({ evaluation });
  } catch (error: any) {
    console.error('[AdDirectorRouter.recordQA] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to record QA evaluation' });
  }
});

adDirectorRouter.post('/adspec/:adId/snapshots/:snapshotId/shots/:shotId/regenerate', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { snapshotId, shotId } = req.params;
    const { repairPatch, engineKey } = req.body;

    const response = await qaPersistenceService.regenerateShot(
      { snapshotId, shotId, repairPatch, engineKey },
      { workspaceId, userId }
    );

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('[AdDirectorRouter.regenerateShot] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to regenerate shot' });
  }
});

adDirectorRouter.get('/adspec/:adId/revisions', async (req, res) => {
  try {
    const { adId } = req.params;
    const revisions = await adDirectorRepository.getRevisionHistory(adId);
    return res.json({ revisions });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getRevisionHistory] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve revision history' });
  }
});

adDirectorRouter.post('/adspec/:adId/export', async (req, res) => {
  try {
    const { adId } = req.params;
    const { snapshotId, selectedResultIds } = req.body;

    return res.status(202).json({
      export: {
        id: `exp_${Date.now()}`,
        adId,
        snapshotId,
        status: 'processing',
        selectedResultIds: selectedResultIds || [],
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[AdDirectorRouter.export] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to initiate export' });
  }
});

// =============================================================================
// 9. PHASE 1: VIDEO AD PROJECT & NORMALIZED ADSPEC VERSIONING ROUTES
// =============================================================================

adDirectorRouter.post('/projects', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { title, initialSpec } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Missing or invalid project title' });
    }

    const result = await videoAdProjectRepository.createProject(
      workspaceId,
      title.trim(),
      userId,
      initialSpec
    );

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.createProject] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create Video Ad project' });
  }
});

adDirectorRouter.get('/projects/:projectId', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const project = await videoAdProjectRepository.getProject(projectId, workspaceId);
    if (!project) {
      return res.status(404).json({ error: `Project '${projectId}' not found in workspace` });
    }

    const currentAdSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    const versions = await videoAdProjectRepository.listVersions(projectId, workspaceId);

    return res.json({
      project,
      currentAdSpec,
      versionsCount: versions.length,
    });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getProject] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch project' });
  }
});

adDirectorRouter.get('/projects/:projectId/versions/current', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const adSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!adSpec) {
      return res.status(404).json({ error: `AdSpec for project '${projectId}' not found` });
    }

    return res.json({ adSpec });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getCurrentAdSpec] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch current AdSpec' });
  }
});

adDirectorRouter.get('/projects/:projectId/versions/:versionNumber', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId, versionNumber } = req.params;
    const vNum = parseInt(versionNumber, 10);
    if (isNaN(vNum) || vNum < 1) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    const adSpec = await videoAdProjectRepository.getAdSpecVersion(projectId, workspaceId, vNum);
    if (!adSpec) {
      return res.status(404).json({ error: `Version ${vNum} for project '${projectId}' not found` });
    }

    return res.json({ adSpec });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getAdSpecVersion] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch AdSpec version' });
  }
});

adDirectorRouter.post('/projects/:projectId/versions', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const { spec, reason } = req.body;

    if (!spec) {
      return res.status(400).json({ error: 'Missing spec payload' });
    }

    const result = await videoAdProjectRepository.createVersion(
      projectId,
      workspaceId,
      spec,
      reason,
      userId
    );

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.createVersion] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create AdSpec version' });
  }
});

adDirectorRouter.get('/projects/:projectId/versions', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const versions = await videoAdProjectRepository.listVersions(projectId, workspaceId);

    return res.json({ projectId, versions });
  } catch (error: any) {
    console.error('[AdDirectorRouter.listVersions] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to list versions' });
  }
});

adDirectorRouter.post('/projects/:projectId/versions/:versionNumber/approve', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId, versionNumber } = req.params;
    const vNum = parseInt(versionNumber, 10);

    const success = await videoAdProjectRepository.approveVersion(projectId, workspaceId, vNum, userId);
    if (!success) {
      return res.status(404).json({ error: `Failed to approve version ${vNum} on project '${projectId}'` });
    }

    return res.json({ success: true, projectId, versionNumber: vNum, status: 'approved' });
  } catch (error: any) {
    console.error('[AdDirectorRouter.approveVersion] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to approve version' });
  }
});

adDirectorRouter.post('/projects/:projectId/snapshots', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const { versionNumber, executionSettings } = req.body;

    const snapshot = await videoAdProjectRepository.createExecutionSnapshot(
      projectId,
      workspaceId,
      versionNumber,
      executionSettings,
      userId
    );

    return res.status(201).json({ snapshot });
  } catch (error: any) {
    console.error('[AdDirectorRouter.createExecutionSnapshot] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to create execution snapshot' });
  }
});

adDirectorRouter.post('/validate-spec', async (req, res) => {
  try {
    const { spec } = req.body;
    if (!spec) {
      return res.status(400).json({ error: 'Missing spec payload to validate' });
    }

    const validation = videoAdValidationService.validateAdSpec(spec);
    return res.json(validation);
  } catch (error: any) {
    console.error('[AdDirectorRouter.validateSpec] Error:', error);
    return res.status(400).json({ error: error.message || 'Validation failed' });
  }
});

// =============================================================================
// 10. PHASE 2: AI INTERVIEWER & DISCOVERY ENGINE ROUTES
// =============================================================================

// POST /projects/:projectId/discovery (Initiate discovery from natural-language prompt)
adDirectorRouter.post('/projects/:projectId/discovery', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = InitDiscoveryRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid discovery initiation payload',
        details: parsed.error.format()
      });
    }

    const result = await briefReconciliationService.initDiscovery({
      projectId,
      workspaceId,
      initialPrompt: parsed.data.initialPrompt,
      assetIds: parsed.data.assetIds
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.initDiscovery] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to initialize discovery' });
  }
});

// POST /projects/:projectId/discovery/answer (Submit answers to discovery questions)
adDirectorRouter.post('/projects/:projectId/discovery/answer', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = AnswerDiscoveryRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid answer payload',
        details: parsed.error.format()
      });
    }

    const result = await briefReconciliationService.answerQuestions({
      projectId,
      workspaceId,
      answers: parsed.data.answers
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.answerDiscovery] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to process discovery answers' });
  }
});

// GET /projects/:projectId/discovery (Retrieve active discovery state for recovery/refresh)
adDirectorRouter.get('/projects/:projectId/discovery', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const result = await briefReconciliationService.getDiscoveryState(projectId, workspaceId);

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.getDiscoveryState] Error:', error);
    return res.status(error.message?.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to retrieve discovery state'
    });
  }
});

// POST /projects/:projectId/brief/confirm (User confirms brief & locks decisions)
adDirectorRouter.post('/projects/:projectId/brief/confirm', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = ConfirmBriefRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid brief confirmation payload',
        details: parsed.error.format()
      });
    }

    const result = await briefReconciliationService.confirmBrief({
      projectId,
      workspaceId,
      briefOverrides: parsed.data.briefOverrides,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.confirmBrief] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to confirm brief' });
  }
});

// =============================================================================
// 11. PHASE 3: CREATIVE CONCEPT ENGINE ROUTES
// =============================================================================

// POST /projects/:projectId/concepts/generate (Generate distinct concepts from confirmed brief)
adDirectorRouter.post('/projects/:projectId/concepts/generate', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = GenerateConceptsRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid concept generation payload',
        details: parsed.error.format()
      });
    }

    const result = await creativeConceptService.generateConcepts({
      projectId,
      workspaceId,
      targetCount: parsed.data.targetCount,
      creativeNotes: parsed.data.creativeNotes,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.generateConcepts] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to generate creative concepts' });
  }
});

// GET /projects/:projectId/concepts (List concepts with stale detection)
adDirectorRouter.get('/projects/:projectId/concepts', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const result = await creativeConceptService.getConcepts(projectId, workspaceId);

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.getConcepts] Error:', error);
    return res.status(error.message?.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to retrieve creative concepts'
    });
  }
});

// GET /projects/:projectId/concepts/:conceptId (Retrieve specific concept)
adDirectorRouter.get('/projects/:projectId/concepts/:conceptId', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { conceptId } = req.params;
    const concept = await creativeConceptService.getConceptById(conceptId, workspaceId);
    if (!concept) {
      return res.status(404).json({ error: `Concept "${conceptId}" not found in workspace` });
    }

    return res.json({ concept });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getConceptById] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve concept' });
  }
});

// POST /projects/:projectId/concepts/:conceptId/select (Select concept, lock decision, advance AdSpec version)
adDirectorRouter.post('/projects/:projectId/concepts/:conceptId/select', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId, conceptId } = req.params;
    const parsed = SelectConceptRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid concept selection payload',
        details: parsed.error.format()
      });
    }

    const result = await creativeConceptService.selectConcept({
      projectId,
      workspaceId,
      conceptId,
      userRationale: parsed.data.userRationale,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.selectConcept] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to select creative concept' });
  }
});

// POST /projects/:projectId/concepts/regenerate (Regenerate alternative concepts exploring distinct mechanisms)
adDirectorRouter.post('/projects/:projectId/concepts/regenerate', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = RegenerateConceptsRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid concept regeneration payload',
        details: parsed.error.format()
      });
    }

    const result = await creativeConceptService.regenerateConcepts({
      projectId,
      workspaceId,
      targetCount: parsed.data.targetCount,
      creativeNotes: parsed.data.creativeNotes,
      archivePrevious: parsed.data.archivePrevious,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.regenerateConcepts] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to regenerate creative concepts' });
  }
});

// =============================================================================
// 12. PHASE 4: STORY ARCHITECT & DIRECTOR'S PLAN ROUTES
// =============================================================================

// POST /projects/:projectId/director-plan/generate (Generate story beats, discrete shots, and continuity graph)
adDirectorRouter.post('/projects/:projectId/director-plan/generate', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = GenerateDirectorsPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid Director Plan generation payload',
        details: parsed.error.format()
      });
    }

    const result = await directorsPlanService.generateDirectorsPlan({
      projectId,
      workspaceId,
      targetDurationSeconds: parsed.data.targetDurationSeconds,
      cinematographyStyle: parsed.data.cinematographyStyle,
      pacingPreference: parsed.data.pacingPreference,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.generateDirectorsPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to generate Director\'s Plan' });
  }
});

// GET /projects/:projectId/director-plan (Retrieve active Director's Plan and continuity status)
adDirectorRouter.get('/projects/:projectId/director-plan', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const result = await directorsPlanService.getDirectorsPlan(projectId, workspaceId);

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.getDirectorsPlan] Error:', error);
    return res.status(error.message?.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to retrieve Director\'s Plan'
    });
  }
});

// POST /projects/:projectId/director-plan/confirm (Confirm Director's Plan and lock decisions)
adDirectorRouter.post('/projects/:projectId/director-plan/confirm', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = ConfirmDirectorsPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid confirmation payload',
        details: parsed.error.format()
      });
    }

    const result = await directorsPlanService.confirmDirectorsPlan({
      projectId,
      workspaceId,
      userNotes: parsed.data.userNotes,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.confirmDirectorsPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to confirm Director\'s Plan' });
  }
});

// GET /projects/:projectId/director-plan/continuity (Retrieve continuity report and links)
adDirectorRouter.get('/projects/:projectId/director-plan/continuity', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const plan = await directorsPlanService.getDirectorsPlan(projectId, workspaceId);

    return res.json({ continuityReport: plan.continuityReport });
  } catch (error: any) {
    console.error('[AdDirectorRouter.getContinuity] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve continuity report' });
  }
});

// =============================================================================
// PHASE 5: NATURAL-LANGUAGE REVISION ENGINE ROUTES (/projects/:projectId/revision/*)
// =============================================================================

// POST /projects/:projectId/revision/propose
adDirectorRouter.post('/projects/:projectId/revision/propose', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = ProposeRevisionRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid revision proposal payload',
        details: parsed.error.format()
      });
    }

    const result = await revisionService.proposeRevision({
      projectId,
      workspaceId,
      instruction: parsed.data.instruction,
      targetScope: parsed.data.targetScope,
      targetEntityId: parsed.data.targetEntityId,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.proposeRevision] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to propose revision' });
  }
});

// POST /projects/:projectId/revision/apply
adDirectorRouter.post('/projects/:projectId/revision/apply', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = ApplyRevisionRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid apply revision payload',
        details: parsed.error.format()
      });
    }

    const result = await revisionService.applyRevision({
      projectId,
      workspaceId,
      instruction: parsed.data.instruction,
      confirmedOperations: parsed.data.confirmedOperations,
      userRationale: parsed.data.userRationale,
      userId
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.applyRevision] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to apply revision' });
  }
});

// =============================================================================
// PHASE 6: PROMPT COMPILER & MODEL CAPABILITY REGISTRY ROUTES
// =============================================================================

// GET /models (List available video generation models and capabilities)
adDirectorRouter.get('/models', async (req, res) => {
  try {
    const { provider } = req.query;
    const models = promptCompilerService.listModels(provider as any);
    return res.json({ models });
  } catch (error: any) {
    console.error('[AdDirectorRouter.listModels] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to list models' });
  }
});

// POST /projects/:projectId/compatibility (Pre-flight compatibility check)
adDirectorRouter.post('/projects/:projectId/compatibility', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = ValidateCompatibilityRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid compatibility validation payload',
        details: parsed.error.format()
      });
    }

    const result = await promptCompilerService.validateProjectCompatibility(
      projectId,
      workspaceId,
      parsed.data.modelId
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.validateCompatibility] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to validate compatibility' });
  }
});

// POST /projects/:projectId/compile (Compile execution plan for project)
adDirectorRouter.post('/projects/:projectId/compile', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId } = req.params;
    const parsed = CompileExecutionPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid execution plan compilation payload',
        details: parsed.error.format()
      });
    }

    const result = await promptCompilerService.compileExecutionPlan(
      projectId,
      workspaceId,
      parsed.data.modelId,
      {
        resolution: parsed.data.resolution,
        userPromptOverrides: parsed.data.userPromptOverrides
      }
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.compileExecutionPlan] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to compile execution plan' });
  }
});

// POST /projects/:projectId/shots/:shotId/compile (Compile single shot payload)
adDirectorRouter.post('/projects/:projectId/shots/:shotId/compile', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required', code: 'AUTH_REQUIRED' });
    }

    const userId = req.user.uid;
    const workspaceId =
      req.user.workspaceId ||
      (await workspaceRepository.ensurePersonalWorkspace(userId, req.user.email || ''));

    const { projectId, shotId } = req.params;
    const parsed = CompileExecutionPlanRequestZodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid shot compilation payload',
        details: parsed.error.format()
      });
    }

    const result = await promptCompilerService.compileShotPayload(
      projectId,
      workspaceId,
      shotId,
      parsed.data.modelId,
      {
        resolution: parsed.data.resolution,
        userPromptOverrides: parsed.data.userPromptOverrides
      }
    );

    return res.json(result);
  } catch (error: any) {
    console.error('[AdDirectorRouter.compileShot] Error:', error);
    return res.status(400).json({ error: error.message || 'Failed to compile shot' });
  }
});






