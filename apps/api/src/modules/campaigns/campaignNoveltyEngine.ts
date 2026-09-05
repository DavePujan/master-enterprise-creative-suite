/**
 * Multi-Dimensional Novelty & Strategic Anti-Repetition Engine.
 * Implements 6-tier semantic classification across 8 orthogonal vectors:
 * narrative, campaign mechanism, behavioral mechanism, emotional territory,
 * audience insight, visual territory, platform mechanic, and linguistic tokens.
 */

import { createHash } from 'crypto';
import {
  CampaignFingerprint,
  NoveltyComparisonResult,
  NoveltyClassification,
  DistinctivenessTier,
  TerritoryNoveltyVector
} from '../../../../../packages/types/campaignStrategy.js';

export interface StoredStrategyMemory {
  campaignStrategyId: string;
  title: string;
  narrativeHash: string;
  mechanismHash: string;
  emotionalHash: string;
  insightHash: string;
  visualHash: string;
  tokenBag: string[];
}

export class CampaignNoveltyEngine {
  private readonly WEIGHTS = {
    narrative: 0.20,
    mechanism: 0.20,
    behavioral: 0.15,
    emotional: 0.15,
    insight: 0.10,
    visual: 0.10,
    platform: 0.05,
    linguistic: 0.05
  };

  /**
   * Generates a deterministic SHA256 hash from normalized text.
   */
  hashString(input: string): string {
    const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Generates a token bag from text for multi-vector overlap checks.
   */
  extractTokenBag(texts: string[]): string[] {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'with', 'for', 'to', 'of', 'by', 'from'
    ]);
    const tokens = new Set<string>();

    for (const t of texts) {
      const words = t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
      for (const w of words) {
        if (w.length > 3 && !stopWords.has(w)) {
          tokens.add(w);
        }
      }
    }
    return Array.from(tokens);
  }

  /**
   * Computes Jaccard similarity between two token sets.
   */
  private jaccardSimilarity(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const setA = new Set(a);
    const setB = new Set(b);
    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Calculates similarity between two strings using tokenization and normalized distance.
   */
  private stringSimilarity(a: string, b: string): number {
    const tokensA = this.extractTokenBag([a]);
    const tokensB = this.extractTokenBag([b]);
    return this.jaccardSimilarity(tokensA, tokensB);
  }

  /**
   * Classifies similarity into one of 6 nuanced tiers.
   */
  classifyNovelty(similarity: number, mechanismSim: number): NoveltyClassification {
    if (similarity >= 0.90) return 'exact_duplicate';
    if (similarity >= 0.75) return 'near_duplicate';
    if (similarity >= 0.55) return 'strategically_similar';
    if (similarity >= 0.40 && mechanismSim >= 0.50) return 'structurally_similar';
    if (similarity <= 0.15) return 'contrarian';
    return 'fresh';
  }

  /**
   * Compares a candidate territory's novelty vector against active workspace memory.
   */
  evaluateNovelty(
    candidate: TerritoryNoveltyVector & {
      behavioralMechanism?: string;
      audienceInsight?: string;
      platformMechanic?: string;
    },
    workspaceHistory: StoredStrategyMemory[]
  ): NoveltyComparisonResult {
    if (!workspaceHistory || workspaceHistory.length === 0) {
      return {
        overallSimilarity: 0.05,
        classification: 'fresh',
        isAcceptable: true,
        breakdown: {
          narrativeSim: 0.05,
          mechanismSim: 0.05,
          behavioralSim: 0.05,
          emotionalSim: 0.05,
          insightSim: 0.05,
          visualSim: 0.05,
          platformSim: 0.05,
          linguisticSim: 0.05
        },
        recommendation: 'proceed',
        distinctivenessCritique: 'Zero prior campaign memory in workspace. Direction is completely novel.'
      };
    }

    const candidateTokens = this.extractTokenBag([
      candidate.narrative,
      candidate.mechanism,
      candidate.emotionalTerritory,
      candidate.visualConcept,
      candidate.behavioralMechanism || '',
      candidate.audienceInsight || '',
      candidate.platformMechanic || ''
    ]);

    let maxSim = 0;
    let worstMatchTitle = '';
    let worstBreakdown = {
      narrativeSim: 0,
      mechanismSim: 0,
      behavioralSim: 0,
      emotionalSim: 0,
      insightSim: 0,
      visualSim: 0,
      platformSim: 0,
      linguisticSim: 0
    };

    for (const mem of workspaceHistory) {
      const narrativeSim = this.stringSimilarity(candidate.narrative, mem.narrativeHash);
      const mechanismSim = this.stringSimilarity(candidate.mechanism, mem.mechanismHash);
      const emotionalSim = this.stringSimilarity(candidate.emotionalTerritory, mem.emotionalHash);
      const visualSim = this.stringSimilarity(candidate.visualConcept, mem.visualHash);
      const insightSim = this.stringSimilarity(candidate.audienceInsight || '', mem.insightHash);
      const behavioralSim = this.stringSimilarity(candidate.behavioralMechanism || '', mem.mechanismHash);
      const platformSim = this.stringSimilarity(candidate.platformMechanic || '', mem.narrativeHash);
      const linguisticSim = this.jaccardSimilarity(candidateTokens, mem.tokenBag);

      const weighted =
        narrativeSim * this.WEIGHTS.narrative +
        mechanismSim * this.WEIGHTS.mechanism +
        behavioralSim * this.WEIGHTS.behavioral +
        emotionalSim * this.WEIGHTS.emotional +
        insightSim * this.WEIGHTS.insight +
        visualSim * this.WEIGHTS.visual +
        platformSim * this.WEIGHTS.platform +
        linguisticSim * this.WEIGHTS.linguistic;

      if (weighted > maxSim) {
        maxSim = weighted;
        worstMatchTitle = mem.title;
        worstBreakdown = {
          narrativeSim,
          mechanismSim,
          behavioralSim,
          emotionalSim,
          insightSim,
          visualSim,
          platformSim,
          linguisticSim
        };
      }
    }

    const classification = this.classifyNovelty(maxSim, worstBreakdown.mechanismSim);
    const isAcceptable = maxSim <= 0.65;

    let recommendation: 'proceed' | 'pivot-mechanism' | 'rewrite-entirely' = 'proceed';
    let distinctivenessCritique = 'Direction shows high strategic and structural distinctiveness.';

    if (classification === 'exact_duplicate' || classification === 'near_duplicate') {
      recommendation = 'rewrite-entirely';
      distinctivenessCritique = `Heavy overlap with past campaign "${worstMatchTitle}". Narrative and core mechanism are too closely aligned.`;
    } else if (classification === 'strategically_similar') {
      recommendation = 'pivot-mechanism';
      distinctivenessCritique = `Shares audience insight and emotional territory with "${worstMatchTitle}". Pivot the activation mechanism to differentiate.`;
    } else if (classification === 'structurally_similar') {
      recommendation = 'pivot-mechanism';
      distinctivenessCritique = `Shares structural activation mechanics with "${worstMatchTitle}". Adopt a more contrasting distribution mechanic.`;
    } else if (classification === 'contrarian') {
      distinctivenessCritique = 'High contrarian tension: explicitly challenges category conventions.';
    }

    return {
      overallSimilarity: Number(maxSim.toFixed(3)),
      classification,
      isAcceptable,
      nearestMatchTitle: worstMatchTitle,
      breakdown: worstBreakdown,
      recommendation,
      distinctivenessCritique
    };
  }

  /**
   * Resolves a human-friendly distinctiveness tier and label for user display.
   */
  resolveDistinctiveness(overallSimilarity: number): {
    tier: DistinctivenessTier;
    label: string;
  } {
    if (overallSimilarity < 0.25) {
      return {
        tier: 'Highly Differentiated',
        label: 'Highly differentiated from your recent campaigns'
      };
    }
    if (overallSimilarity < 0.55) {
      return {
        tier: 'Fresh',
        label: 'Fresh direction with low historical overlap'
      };
    }
    return {
      tier: 'Standard',
      label: 'Familiar territory with shared elements from previous campaigns'
    };
  }

  /**
   * Builds a persistent fingerprint from a strategy version.
   */
  buildFingerprint(data: {
    narrative: string;
    mechanism: string;
    emotionalTerritory: string;
    insight: string;
    visualConcept: string;
  }): CampaignFingerprint {
    return {
      narrativeHash: this.hashString(data.narrative),
      mechanismHash: this.hashString(data.mechanism),
      emotionalHash: this.hashString(data.emotionalTerritory),
      insightHash: this.hashString(data.insight),
      visualHash: this.hashString(data.visualConcept),
      tokenBag: this.extractTokenBag([
        data.narrative,
        data.mechanism,
        data.emotionalTerritory,
        data.insight,
        data.visualConcept
      ]),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Compares two fingerprints directly and returns similarity score and distinctiveness.
   */
  compareFingerprints(a: CampaignFingerprint, b: CampaignFingerprint): {
    similarityScore: number;
    distinctivenessTier: DistinctivenessTier;
    explanation: string;
  } {
    const tokenSim = this.jaccardSimilarity(a.tokenBag, b.tokenBag);
    const hashMatches =
      (a.narrativeHash === b.narrativeHash ? 1 : 0) * this.WEIGHTS.narrative +
      (a.mechanismHash === b.mechanismHash ? 1 : 0) * this.WEIGHTS.mechanism +
      (a.emotionalHash === b.emotionalHash ? 1 : 0) * this.WEIGHTS.emotional +
      (a.insightHash === b.insightHash ? 1 : 0) * this.WEIGHTS.insight +
      (a.visualHash === b.visualHash ? 1 : 0) * this.WEIGHTS.visual;

    const similarityScore = Math.max(tokenSim, hashMatches);
    const resolved = this.resolveDistinctiveness(similarityScore);

    return {
      similarityScore: Number(similarityScore.toFixed(3)),
      distinctivenessTier: resolved.tier,
      explanation: resolved.label
    };
  }
}

export const campaignNoveltyEngine = new CampaignNoveltyEngine();
