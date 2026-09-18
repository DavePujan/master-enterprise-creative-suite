import { videoAdProjectRepository } from '../repositories/videoAdProjectRepository.js';
import { videoAdValidationService } from './videoAdValidationService.js';
import { continuityResolverService } from './continuityResolverService.js';
import { revisionDirectorAiService } from './revisionDirectorAiService.js';
import { changeImpactService } from './changeImpactService.js';
import { applyDirectorOperation } from '@ad-director/operations/stateManager.js';
import type {
  AdSpec,
  ProposeRevisionRequest,
  ProposeRevisionResponse,
  ApplyRevisionRequest,
  ApplyRevisionResponse,
  ProposedRevisionOperation,
  CostImpactEstimate,
  ImpactTier,
  ContinuityStatusReport
} from '@contracts/adSpecContracts.js';
import type {
  DirectorOperation,
  AdSpecDiff
} from '@shared-types/directorOperations.js';

function getValueByPath(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export class RevisionService {
  /**
   * Generates a structured revision proposal from natural-language instructions.
   * Pure proposal: does NOT mutate database or create versions.
   */
  public async proposeRevision(params: {
    projectId: string;
    workspaceId: string;
    instruction: string;
    targetScope?: string;
    targetEntityId?: string;
    userId?: string;
  }): Promise<ProposeRevisionResponse> {
    const { projectId, workspaceId, instruction, targetScope, targetEntityId, userId } = params;

    // 1. Verify project and get current AdSpec
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    // 2. Invoke Revision Director AI Service to parse intent into discrete operations
    const rawOperations = await revisionDirectorAiService.parseRevisionInstruction({
      adSpec: currentSpec,
      instruction,
      targetScope,
      targetEntityId,
      userId
    });

    if (!rawOperations || rawOperations.length === 0) {
      throw new Error(`Could not derive structured operations from instruction: "${instruction}"`);
    }

    // 3. Multi-tier impact analysis
    const impactResult = changeImpactService.analyzeBatchImpact(currentSpec, rawOperations);

    // 4. Transform into human-readable ProposedRevisionOperation[]
    const proposedOperations: ProposedRevisionOperation[] = rawOperations.map((op, idx) => {
      const analysis = impactResult.operationsAnalysis[idx];
      const tier = analysis?.impactTier || 'DIRECT';
      const requiresConfirmation = analysis?.requiresConfirmation ?? false;

      // Resolve human-friendly before/after
      let beforeVal: any = undefined;
      let afterVal: any = undefined;
      const targetStr = op.target.entityId
        ? `${op.target.entityId}${op.target.path ? `.${op.target.path}` : ''}`
        : op.target.path || op.target.scope;

      if (op.target.scope === 'shot' && op.target.entityId) {
        const shot = currentSpec.shots.find(s => s.shotId === op.target.entityId);
        if (shot) {
          if (op.target.path) {
            beforeVal = getValueByPath(shot, op.target.path);
          } else {
            beforeVal = Object.keys(op.changes).reduce((acc, k) => {
              acc[k] = getValueByPath(shot, k);
              return acc;
            }, {} as Record<string, any>);
          }
        }
      } else if (op.target.scope === 'brief') {
        const path = op.target.path || Object.keys(op.changes)[0];
        beforeVal = getValueByPath(currentSpec.brief, path);
      } else if (op.target.scope === 'product' && op.target.entityId) {
        const prod = currentSpec.products.find(p => p.id === op.target.entityId);
        if (prod) {
          beforeVal = op.target.path ? getValueByPath(prod, op.target.path) : prod.packaging || prod.description;
        }
      }

      afterVal = Object.keys(op.changes).length === 1 ? Object.values(op.changes)[0] : op.changes;

      return {
        operationId: op.operationId,
        operation: op.type,
        target: targetStr,
        targetScope: op.target.scope,
        targetEntityId: op.target.entityId,
        before: beforeVal !== undefined ? beforeVal : 'default',
        after: afterVal,
        reason: op.reason.description || instruction,
        impact: tier,
        costImpact: impactResult.costImpact,
        requiresExplicitConfirmation: requiresConfirmation,
        rawOperation: op
      };
    });

    return {
      success: true,
      projectId,
      instruction,
      operations: proposedOperations,
      highestImpactTier: impactResult.highestImpactTier,
      requiresExplicitConfirmation: impactResult.requiresExplicitConfirmation,
      costImpact: impactResult.costImpact,
      summary: impactResult.summary,
      affectedShots: impactResult.affectedShots,
      unaffectedCriticalEntities: impactResult.unaffectedCriticalEntities
    };
  }

  /**
   * Applies confirmed revision operations atomically, increments to Version N+1,
   * updates the relational database, and recalculates continuity.
   */
  public async applyRevision(params: {
    projectId: string;
    workspaceId: string;
    instruction: string;
    confirmedOperations?: ProposedRevisionOperation[];
    userRationale?: string;
    userId?: string;
  }): Promise<ApplyRevisionResponse> {
    const { projectId, workspaceId, instruction, confirmedOperations, userRationale, userId } = params;

    // 1. Get current AdSpec
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    // 2. Resolve operations: use provided confirmedOperations or parse fresh
    let opsToApply: DirectorOperation[] = [];
    if (confirmedOperations && confirmedOperations.length > 0) {
      opsToApply = confirmedOperations.map(co => co.rawOperation);
    } else {
      const proposal = await this.proposeRevision({
        projectId,
        workspaceId,
        instruction,
        userId
      });
      opsToApply = proposal.operations.map(o => o.rawOperation);
    }

    if (opsToApply.length === 0) {
      throw new Error('No operations to apply for this revision.');
    }

    // 3. Multi-tier impact check
    const impactResult = changeImpactService.analyzeBatchImpact(currentSpec, opsToApply);

    // 4. Apply operations sequentially and atomically
    let workingSpec: AdSpec = JSON.parse(JSON.stringify(currentSpec));
    let lastDiff: AdSpecDiff | null = null;
    const allModifiedPaths: string[] = [];
    const allAffectedShots: Set<string> = new Set();
    const allAffectedEntities: Set<string> = new Set();
    const prevValues: Record<string, any> = {};
    const nextValues: Record<string, any> = {};

    for (const op of opsToApply) {
      // Apply through stateManager
      const applyResult = applyDirectorOperation(workingSpec, op);
      workingSpec = applyResult.updatedAdSpec;
      lastDiff = applyResult.diff;

      applyResult.diff.modifiedPaths.forEach(p => allModifiedPaths.push(p));
      applyResult.diff.affectedShots.forEach(s => allAffectedShots.add(s));
      applyResult.diff.affectedEntities.forEach(e => allAffectedEntities.add(e));
      Object.assign(prevValues, applyResult.diff.previousValues);
      Object.assign(nextValues, applyResult.diff.newValues);
    }

    // 5. Sequence re-indexing and temporal boundary normalization
    workingSpec.shots.forEach((s, idx) => {
      s.sequence = idx + 1;
    });

    // 6. Recalculate continuity graph
    const continuityReport = continuityResolverService.resolveContinuity({
      shots: workingSpec.shots,
      characters: workingSpec.characters,
      products: workingSpec.products,
      locations: workingSpec.locations
    });
    workingSpec.continuity = {
      links: continuityReport.links
    };

    // 7. Provenance & decision metadata recording
    const now = new Date().toISOString();
    if (!workingSpec.decisionMetadata) workingSpec.decisionMetadata = {};
    opsToApply.forEach(op => {
      const key = op.target.path || `${op.target.scope}.${op.target.entityId || 'root'}`;
      workingSpec.decisionMetadata[key] = {
        source: 'user_requested',
        confidence: 1.0,
        status: 'confirmed',
        locked: false,
        confirmedAt: now,
        confirmedBy: userId || 'user',
        reason: `${instruction}${userRationale ? ` (${userRationale})` : ''}`
      };
    });

    // 8. Deterministic Validation
    const validation = videoAdValidationService.validateAdSpec(workingSpec, currentSpec);
    if (!validation.valid) {
      const firstErr = validation.errors[0];
      throw new Error(`Revision validation failed: [${firstErr.code}] ${firstErr.message}`);
    }

    // 9. Advance AdSpec to Version N+1 with normalized relational persistence
    const versionResult = await videoAdProjectRepository.createVersion(
      projectId,
      workspaceId,
      workingSpec,
      `Revision applied: "${instruction}"`,
      userId
    );

    // 10. Construct unified cumulative diff
    const cumulativeDiff: AdSpecDiff = {
      specVersionBefore: currentSpec.identity.specVersion,
      specVersionAfter: versionResult.versionNumber,
      modifiedPaths: Array.from(new Set(allModifiedPaths)),
      previousValues: prevValues,
      newValues: nextValues,
      affectedShots: Array.from(allAffectedShots),
      affectedEntities: Array.from(allAffectedEntities),
      unaffectedCriticalEntities: impactResult.unaffectedCriticalEntities,
      humanExplanation: `Applied revision: "${instruction}". ${allModifiedPaths.length} properties updated across Version ${versionResult.versionNumber}.`,
      timestamp: now
    };

    return {
      success: true,
      projectId,
      adSpecVersionNumber: versionResult.versionNumber,
      adSpec: versionResult.adSpec,
      operationsAppliedCount: opsToApply.length,
      highestImpactTier: impactResult.highestImpactTier,
      diff: cumulativeDiff,
      continuityReport
    };
  }
}

export const revisionService = new RevisionService();
