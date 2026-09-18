import type {
  AdSpec
} from '@contracts/adSpecContracts.js';
import type {
  ImpactTier,
  CostImpactEstimate,
  ProposedRevisionOperation
} from '@contracts/directorStageContracts.js';
import type {
  DirectorOperation,
  ChangeImpactAnalysis
} from '@shared-types/directorOperations.js';
import {
  analyzeChangeImpact,
  classifyImpactTier
} from '@ad-director/operations/changeImpact.js';
import {
  evaluateApprovalPolicy,
  isFieldUserConfirmed
} from '@ad-director/operations/approvalPolicy.js';

export interface DetailedImpactAnalysis {
  highestImpactTier: ImpactTier;
  requiresExplicitConfirmation: boolean;
  costImpact?: CostImpactEstimate;
  operationsAnalysis: Array<{
    operationId: string;
    impactTier: ImpactTier;
    requiresConfirmation: boolean;
    reasons: string[];
    affectedShots: string[];
    indirectlyAffected: string[];
    unaffected: string[];
  }>;
  affectedShots: string[];
  unaffectedCriticalEntities: string[];
  summary: string;
}

export class ChangeImpactService {
  /**
   * Tier hierarchy for precedence calculation:
   * PRODUCT_IDENTITY (4) > STRUCTURAL_COST (3) > CREATIVE (2) > DIRECT (1)
   */
  private readonly tierWeights: Record<ImpactTier, number> = {
    PRODUCT_IDENTITY: 4,
    STRUCTURAL_COST: 3,
    CREATIVE: 2,
    DIRECT: 1
  };

  /**
   * Performs deep, multi-tier impact analysis across proposed operations.
   */
  public analyzeBatchImpact(
    adSpec: AdSpec,
    operations: DirectorOperation[]
  ): DetailedImpactAnalysis {
    let highestWeight = 0;
    let highestTier: ImpactTier = 'DIRECT';
    let requiresExplicitConfirmation = false;
    const allAffectedShots = new Set<string>();
    const allIndirectShots = new Set<string>();
    const allUnaffected = new Set<string>(
      adSpec.shots.map(s => s.shotId).concat(
        adSpec.products.map(p => p.id),
        adSpec.characters.map(c => c.id)
      )
    );

    const operationsAnalysis: DetailedImpactAnalysis['operationsAnalysis'] = [];

    // Track structural deltas
    let shotsDelta = 0;
    let durationDelta = 0;
    const initialDuration = Number(adSpec.brief.desiredDurationSeconds || 15);
    let finalDuration = initialDuration;
    const initialShotCount = adSpec.shots.length;

    for (const op of operations) {
      // 1. Classify impact tier
      const tier = classifyImpactTier(adSpec, op);
      const weight = this.tierWeights[tier];
      if (weight > highestWeight) {
        highestWeight = weight;
        highestTier = tier;
      }

      // 2. Run graph-based change impact
      const impact = analyzeChangeImpact(adSpec, op);
      impact.directlyAffected.forEach(id => {
        if (id.startsWith('shot_')) allAffectedShots.add(id);
        allUnaffected.delete(id);
      });
      impact.indirectlyAffected.forEach(id => {
        if (id.startsWith('shot_')) allIndirectShots.add(id);
        allUnaffected.delete(id);
      });

      // 3. Approval policy evaluation
      const approval = evaluateApprovalPolicy(adSpec, op);

      // 4. Decision Lock checks
      const targetPath = op.target.entityId && op.target.path
        ? `${op.target.entityId}.${op.target.path}`
        : (op.target.path || `${op.target.scope}.${op.target.entityId || ''}`);

      const isLockedDecision =
        isFieldUserConfirmed(adSpec, targetPath) ||
        (op.target.path ? isFieldUserConfirmed(adSpec, op.target.path) : false) ||
        (op.target.entityId ? isFieldUserConfirmed(adSpec, op.target.entityId) : false);

      const opRequiresConfirmation =
        tier === 'PRODUCT_IDENTITY' ||
        tier === 'STRUCTURAL_COST' ||
        tier === 'CREATIVE' ||
        approval.requiresConfirmation ||
        isLockedDecision;

      if (opRequiresConfirmation) {
        requiresExplicitConfirmation = true;
      }

      // 5. Check structural delta
      if (op.type === 'insert_shot' || op.type === 'insertShot') {
        shotsDelta += 1;
      } else if (op.type === 'delete_shot' || op.type === 'deleteShot') {
        shotsDelta -= 1;
      }

      if (op.changes['desiredDurationSeconds'] !== undefined) {
        const newDur = Number(op.changes['desiredDurationSeconds']);
        durationDelta = newDur - initialDuration;
        finalDuration = newDur;
      }

      operationsAnalysis.push({
        operationId: op.operationId,
        impactTier: tier,
        requiresConfirmation: opRequiresConfirmation,
        reasons: (isLockedDecision ? [`Decision for "${targetPath}" is user-confirmed and locked.`] : []).concat(approval.reasons),
        affectedShots: impact.directlyAffected.filter(id => id.startsWith('shot_')),
        indirectlyAffected: impact.indirectlyAffected,
        unaffected: impact.unaffected
      });
    }

    // Compute Cost Impact Estimate if structural changes occurred
    let costImpact: CostImpactEstimate | undefined;
    const finalShotCount = initialShotCount + shotsDelta;

    if (shotsDelta !== 0 || durationDelta !== 0 || highestTier === 'STRUCTURAL_COST') {
      const complexityDelta: CostImpactEstimate['complexityDelta'] =
        Math.abs(shotsDelta) >= 3 || Math.abs(durationDelta) >= 10
          ? 'major'
          : Math.abs(shotsDelta) >= 1 || Math.abs(durationDelta) >= 5
          ? 'moderate'
          : 'minor';

      const percentDelta = initialShotCount > 0 ? Math.round((shotsDelta / initialShotCount) * 100) : 0;
      const costDeltaStr = percentDelta !== 0
        ? `${percentDelta > 0 ? '+' : ''}${percentDelta}% generation compute`
        : durationDelta !== 0
        ? `${durationDelta > 0 ? '+' : ''}${durationDelta}s total rendering time`
        : undefined;

      const warning = shotsDelta !== 0
        ? `Structural revision changes shot count from ${initialShotCount} to ${finalShotCount} shots (${costDeltaStr || 'cost impact'}). Explicit confirmation required.`
        : durationDelta !== 0
        ? `Duration modified from ${initialDuration}s to ${finalDuration}s. Shot timing will be rescaled across the Director's Plan.`
        : undefined;

      costImpact = {
        shotsBefore: initialShotCount,
        shotsAfter: finalShotCount,
        durationSecondsBefore: initialDuration,
        durationSecondsAfter: finalDuration,
        deltaShots: shotsDelta,
        deltaDurationSeconds: durationDelta,
        complexityDelta,
        estimatedGenerationCostDelta: costDeltaStr,
        warning
      };
    }

    // Build human-friendly summary
    let summary = '';
    switch (highestTier) {
      case 'PRODUCT_IDENTITY':
        summary = `Impact: PRODUCT IDENTITY. Proposed changes affect declared product specifications or locked brand packaging. Explicit confirmation required.`;
        break;
      case 'STRUCTURAL_COST':
        summary = `Impact: STRUCTURAL COST. Proposed revision alters storyboard structure or total duration (${initialShotCount} -> ${finalShotCount} shots). Generation compute impact estimate calculated.`;
        break;
      case 'CREATIVE':
        summary = `Impact: CREATIVE. Proposed revision adjusts narrative beats, hook, or character dynamics. User confirmation recommended.`;
        break;
      case 'DIRECT':
      default:
        summary = `Impact: DIRECT. Targeted adjustments to camera, lighting, or aesthetics within existing shot bounds. Safe to apply.`;
        break;
    }

    return {
      highestImpactTier: highestTier,
      requiresExplicitConfirmation,
      costImpact,
      operationsAnalysis,
      affectedShots: Array.from(allAffectedShots),
      unaffectedCriticalEntities: Array.from(allUnaffected).slice(0, 10),
      summary
    };
  }
}

export const changeImpactService = new ChangeImpactService();
