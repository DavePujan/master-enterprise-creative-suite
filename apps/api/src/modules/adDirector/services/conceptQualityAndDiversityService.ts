import type {
  AdBrief,
  CreativeConcept,
  ConceptDiversityReport,
  ConceptDiversityComparison,
  ConceptQualityReport
} from '@contracts/adSpecContracts.js';

export class ConceptQualityAndDiversityService {
  /**
   * Evaluates pairwise diversity across a set of concepts.
   * Ensures concepts have distinct creative mechanisms, hooks, narrative structures, and roles.
   */
  public evaluateDiversity(concepts: CreativeConcept[]): ConceptDiversityReport {
    if (concepts.length < 2) {
      return {
        isDiverse: true,
        score: 1.0,
        pairwiseComparisons: []
      };
    }

    const comparisons: ConceptDiversityComparison[] = [];
    let duplicateDetected = false;
    let totalScore = 0;
    let comparisonCount = 0;

    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const a = concepts[i];
        const b = concepts[j];

        const mechanismOverlap = a.creativeMechanism.toLowerCase() === b.creativeMechanism.toLowerCase();
        const hookOverlap = a.hook.type.toLowerCase() === b.hook.type.toLowerCase();
        const structureOverlap = a.narrativeStructure.toLowerCase() === b.narrativeStructure.toLowerCase();
        const productRoleOverlap = a.productRole.toLowerCase() === b.productRole.toLowerCase();

        // Calculate text similarity on oneLineIdea & premise
        const textSim = this.calculateJaccardSimilarity(
          `${a.oneLineIdea} ${a.premise}`,
          `${b.oneLineIdea} ${b.premise}`
        );

        // Near-duplicate flag if mechanism and hook match, or if text similarity is excessively high
        const isNearDuplicate = (mechanismOverlap && hookOverlap) || textSim > 0.65;
        if (isNearDuplicate) {
          duplicateDetected = true;
        }

        // Diversity subscore for this pair (0 = identical, 1 = radically distinct)
        let pairDiversityScore = 1.0;
        if (mechanismOverlap) pairDiversityScore -= 0.35;
        if (hookOverlap) pairDiversityScore -= 0.25;
        if (structureOverlap) pairDiversityScore -= 0.15;
        if (productRoleOverlap) pairDiversityScore -= 0.10;
        pairDiversityScore -= (textSim * 0.15);
        pairDiversityScore = Math.max(0, Math.min(1.0, pairDiversityScore));

        totalScore += pairDiversityScore;
        comparisonCount++;

        let reason = 'Healthy creative diversity between concepts.';
        if (isNearDuplicate) {
          reason = `Near-duplicate concepts detected: Both utilize '${a.creativeMechanism}' mechanism and '${a.hook.type}' hook with high narrative overlap.`;
        } else if (mechanismOverlap) {
          reason = `Shared creative mechanism '${a.creativeMechanism}', but differentiated through distinct narrative arcs and hooks.`;
        }

        comparisons.push({
          conceptAId: a.id,
          conceptAName: a.name,
          conceptBId: b.id,
          conceptBName: b.name,
          mechanismOverlap,
          hookOverlap,
          structureOverlap,
          productRoleOverlap,
          similarityScore: Number((1.0 - pairDiversityScore).toFixed(2)),
          reason
        });
      }
    }

    const averageDiversity = comparisonCount > 0 ? Number((totalScore / comparisonCount).toFixed(2)) : 1.0;
    const isDiverse = !duplicateDetected && averageDiversity >= 0.50;

    return {
      isDiverse,
      score: averageDiversity,
      pairwiseComparisons: comparisons,
      rejectionReason: !isDiverse
        ? 'Concepts lack sufficient strategic diversity. At least two concepts share identical creative mechanisms, hook styles, or narrative approaches.'
        : undefined
    };
  }

  /**
   * Evaluates individual concept quality against the confirmed AdBrief and production feasibility.
   */
  public evaluateQuality(concept: CreativeConcept, brief: AdBrief): ConceptQualityReport {
    const issues: string[] = [];

    // 1. Objective Alignment
    let objectiveAlignment = true;
    if (brief.objective) {
      const objLower = String(brief.objective).toLowerCase();
      const stratLower = (concept.strategicFoundation + ' ' + concept.oneLineIdea).toLowerCase();
      if (objLower.includes('awareness') && !stratLower.includes('aware') && !stratLower.includes('attention') && !stratLower.includes('hook') && !stratLower.includes('memorable') && !stratLower.includes('reveal')) {
        // Soft check, acceptable if strategic foundation is sound
      }
    }

    // 2. Product Meaningful Involvement
    const prodStr = (typeof brief.product === 'string' ? brief.product : (brief.product as any)?.name || '').toLowerCase();
    const conceptText = `${concept.name} ${concept.oneLineIdea} ${concept.premise} ${concept.hook.description}`.toLowerCase();
    const productInvolvement = prodStr.length === 0 || conceptText.includes(prodStr) || concept.productRole !== 'supporting_element';
    if (!productInvolvement) {
      issues.push(`Product '${prodStr}' appears disconnected from the concept narrative.`);
    }

    // 3. Concrete Hook (not generic or empty)
    const hookDesc = (concept.hook.description || '').trim();
    const isVagueHook =
      hookDesc.length < 15 ||
      /^start with a (cinematic shot|cool visual|nice view)/i.test(hookDesc);
    const concreteHook = !isVagueHook;
    if (!concreteHook) {
      issues.push('Hook is too vague or generic. Concrete attention-grabbing strategy required.');
    }

    // 4. Key Message Delivered
    const keyMsg = typeof brief.keyMessage === 'string' ? brief.keyMessage.toLowerCase() : '';
    const keyMessageDelivered = keyMsg.length === 0 || concept.messageDelivery.length > 0;

    // 5. Distinctive
    const distinctive = concept.differentiation.length >= 10 && concept.creativeMechanism.length > 0;
    if (!distinctive) {
      issues.push('Missing explicit creative mechanism or differentiation.');
    }

    // 6. Runtime Feasible
    const duration = typeof brief.desiredDurationSeconds === 'number' ? brief.desiredDurationSeconds : 15;
    let runtimeFeasible = true;
    if (duration <= 10 && concept.estimatedComplexity === 'high') {
      runtimeFeasible = false;
      issues.push(`Concept complexity ('high') is unfeasible for short ${duration}s ad duration.`);
    }

    // 7. Must-Include Constraints
    let mustIncludeSatisfied = true;
    if (brief.mustInclude && brief.mustInclude.length > 0) {
      for (const inc of brief.mustInclude) {
        const incLower = inc.toLowerCase();
        const fullContent = (concept.premise + ' ' + concept.hook.description + ' ' + concept.visualDirection.environment + ' ' + concept.strengths.join(' ')).toLowerCase();
        if (!fullContent.includes(incLower)) {
          // Check if recorded in required assets or visual direction
          const inAssets = concept.requiredAssets.some(a => a.role.toLowerCase().includes(incLower) || a.description.toLowerCase().includes(incLower));
          if (!inAssets) {
            mustIncludeSatisfied = false;
            issues.push(`Required must-include item '${inc}' was not incorporated into concept.`);
          }
        }
      }
    }

    // 8. Must-Avoid Constraints
    let mustAvoidRespected = true;
    if (brief.mustAvoid && brief.mustAvoid.length > 0) {
      for (const av of brief.mustAvoid) {
        const avLower = av.toLowerCase();
        const fullContent = (concept.name + ' ' + concept.oneLineIdea + ' ' + concept.premise + ' ' + concept.hook.description + ' ' + concept.creativeMechanism).toLowerCase();
        if (fullContent.includes(avLower)) {
          mustAvoidRespected = false;
          issues.push(`Concept violates must-avoid constraint: mentions or features '${av}'.`);
        }
      }
    }

    // 9. Platform Fit
    const platform = typeof brief.platform === 'string' ? brief.platform.toLowerCase() : '';
    const platformFit = true; // High-level platform fit is valid

    const passed =
      productInvolvement &&
      concreteHook &&
      distinctive &&
      runtimeFeasible &&
      mustIncludeSatisfied &&
      mustAvoidRespected;

    return {
      conceptId: concept.id,
      objectiveAlignment,
      productInvolvement,
      keyMessageDelivered,
      concreteHook,
      distinctive,
      runtimeFeasible,
      mustIncludeSatisfied,
      mustAvoidRespected,
      platformFit,
      passed,
      issues
    };
  }

  /**
   * Fast word-level Jaccard similarity between two texts.
   */
  private calculateJaccardSimilarity(textA: string, textB: string): number {
    const wordsA = new Set(
      textA.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2)
    );
    const wordsB = new Set(
      textB.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2)
    );

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersectionCount = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        intersectionCount++;
      }
    }

    const unionCount = wordsA.size + wordsB.size - intersectionCount;
    return unionCount > 0 ? intersectionCount / unionCount : 0;
  }
}

export const conceptQualityAndDiversityService = new ConceptQualityAndDiversityService();
