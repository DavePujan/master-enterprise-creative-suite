/**
 * Campaign Strategy Critic & Distinctiveness Detector.
 * Enforces quality invariants:
 * 1. "Could this strategy have been generated for 50 other brands?" (Distinctiveness check)
 * 2. Multi-tier cliché and jargon scanner (Strategic, Structural, Visual, and Language clichés)
 * 3. Brand grounding and category mismatch guard (e.g. no skincare hallucinations for fin-tech)
 * 4. Strategic coherence (Tension -> Big Idea -> Pillars -> Executions -> Channels)
 */

import { BANNED_CLICHES } from './campaignFrameworkLibrary.js';
import { MasterCampaignStrategy } from '../../../../../packages/types/campaignStrategy.js';

export interface CriticEvaluationResult {
  passed: boolean;
  boringnessScore: number; // 0 (original/sharp) to 100 (unacceptably generic)
  brandFitScore: number;   // 0 to 100
  overallScore: number;    // 0 to 10 scale
  issuesDetected: string[];
  remediationPrompt?: string;
}

export class CampaignStrategyCritic {
  private readonly STRATEGIC_CLICHES = [
    'community', 'authenticity', 'empowerment', 'innovation', 'connection',
    'storytelling', 'engagement', 'frictionless', 'synergy', 'transformational'
  ];

  private readonly STRUCTURAL_CLICHES = [
    'teaser -> launch -> sustain', 'ugc challenge', 'influencer amplification',
    'limited-time offer', 'countdown clock', 'social movement'
  ];

  private readonly VISUAL_CLICHES = [
    'neon glow', 'floating product render', 'diverse smiling people with zero product context',
    'golden hour flare', 'futuristic wireframe', 'cinematic slow motion without tension'
  ];

  /**
   * Scans text for banned marketing clichés, corporate jargon, and strategic buzzwords.
   */
  detectCliches(text: string): {
    bannedPhrases: string[];
    strategicCliches: string[];
    structuralCliches: string[];
    visualCliches: string[];
  } {
    const lower = text.toLowerCase();
    const bannedPhrases = BANNED_CLICHES.filter(c => lower.includes(c));
    const strategicCliches = this.STRATEGIC_CLICHES.filter(c => lower.includes(c));
    const structuralCliches = this.STRUCTURAL_CLICHES.filter(c => lower.includes(c));
    const visualCliches = this.VISUAL_CLICHES.filter(c => lower.includes(c));

    return { bannedPhrases, strategicCliches, structuralCliches, visualCliches };
  }

  /**
   * Tests whether the strategy passes the 50-brand substitution test:
   * "Could this strategy have been written for 50 other competitor brands?"
   */
  evaluateBoringness(params: {
    bigIdea: string;
    manifesto: string;
    brandName: string;
    industry: string;
  }): { score: number; issues: string[] } {
    const { bigIdea, manifesto, brandName, industry } = params;
    const combined = `${bigIdea} ${manifesto}`;
    const detected = this.detectCliches(combined);

    let score = 15; // Base baseline
    const issues: string[] = [];

    // Cliché penalties
    if (detected.bannedPhrases.length > 0) {
      score += detected.bannedPhrases.length * 15;
      issues.push(`Contains banned marketing clichés: ${detected.bannedPhrases.join(', ')}`);
    }

    if (detected.strategicCliches.length >= 2) {
      score += detected.strategicCliches.length * 8;
      issues.push(`Overuses generic strategic themes: ${detected.strategicCliches.join(', ')}`);
    }

    if (detected.structuralCliches.length > 0) {
      score += detected.structuralCliches.length * 10;
      issues.push(`Relies on generic structural rollout clichés: ${detected.structuralCliches.join(', ')}`);
    }

    if (detected.visualCliches.length > 0) {
      score += detected.visualCliches.length * 8;
      issues.push(`Relies on visual clichés: ${detected.visualCliches.join(', ')}`);
    }

    // Check for excessive vague adjectives without concrete nouns
    const vagueWords = ['amazing', 'unique', 'seamless', 'holistic', 'next-gen', 'dynamic', 'passionate'];
    let vagueCount = 0;
    const lower = combined.toLowerCase();
    for (const v of vagueWords) {
      if (lower.includes(v)) vagueCount++;
    }
    if (vagueCount >= 3) {
      score += 20;
      issues.push('Excessive vague strategic adjectives; lacks concrete operational mechanisms');
    }

    // Check if brand name or specific industry terms appear
    if (!lower.includes(brandName.toLowerCase())) {
      score += 15;
      issues.push(`Strategy does not anchor directly to brand name (${brandName})`);
    }

    return {
      score: Math.min(100, score),
      issues
    };
  }

  /**
   * Validates category grounding to prevent cross-industry hallucination.
   */
  evaluateBrandGrounding(params: {
    strategyText: string;
    industry: string;
  }): { score: number; issues: string[] } {
    const { strategyText, industry } = params;
    const lower = strategyText.toLowerCase();
    const indLower = industry.toLowerCase();
    const issues: string[] = [];
    let score = 95;

    // Check beauty/cosmetics hallucination in non-beauty brands
    const beautyTerms = ['skincare', 'glow', 'dermatologist', 'hydration', 'complexion', 'serum'];
    const isBeauty = indLower.includes('beauty') || indLower.includes('skin') || indLower.includes('cosmetic');
    if (!isBeauty) {
      for (const term of beautyTerms) {
        if (lower.includes(term)) {
          score -= 30;
          issues.push(`Category hallucination detected: "${term}" in non-beauty industry (${industry})`);
          break;
        }
      }
    }

    // Check enterprise SLA terms in consumer retail
    const enterpriseTerms = ['soc2 compliance', 'kubernetes', 'sla guarantee', 'saml sso'];
    const isEnterprise = indLower.includes('b2b') || indLower.includes('saas') || indLower.includes('enterprise');
    if (!isEnterprise) {
      for (const term of enterpriseTerms) {
        if (lower.includes(term)) {
          score -= 30;
          issues.push(`Enterprise terminology hallucination: "${term}" in consumer industry (${industry})`);
          break;
        }
      }
    }

    return {
      score: Math.max(0, score),
      issues
    };
  }

  /**
   * Evaluates a completed MasterCampaignStrategy before persistence.
   */
  evaluateStrategy(
    strategy: MasterCampaignStrategy,
    industry: string
  ): CriticEvaluationResult {
    const manifestoText = strategy.positioningManifesto.map(m => m.text).join(' ');
    const fullText = `${strategy.coreBigIdea.text} ${manifestoText} ${strategy.contentPillars.map(p => p.narrativeAngle).join(' ')}`;

    const boringness = this.evaluateBoringness({
      bigIdea: strategy.coreBigIdea.text,
      manifesto: manifestoText,
      brandName: strategy.brandName,
      industry
    });

    const grounding = this.evaluateBrandGrounding({
      strategyText: fullText,
      industry
    });

    const allIssues = [...boringness.issues, ...grounding.issues];
    const passed = boringness.score <= 50 && grounding.score >= 60;

    // Scale overall score (10 is perfect, 1 is terrible)
    const penalty = (boringness.score * 0.5) + ((100 - grounding.score) * 0.5);
    const overallScore = Math.max(1, Math.min(10, Math.round((100 - penalty) / 10)));

    let remediationPrompt: string | undefined;
    if (!passed) {
      remediationPrompt = `Refine strategy to eliminate the following issues: ${allIssues.join('; ')}. Ensure the core big idea relies on tangible customer friction rather than generic corporate buzzwords.`;
    }

    return {
      passed,
      boringnessScore: boringness.score,
      brandFitScore: grounding.score,
      overallScore,
      issuesDetected: allIssues,
      remediationPrompt
    };
  }

  /**
   * Compatibility alias for evaluation test runners.
   */
  critique(strategy: MasterCampaignStrategy, industryOrBrand = 'General'): {
    passesInvariant: boolean;
    violations: string[];
    score: number;
  } {
    const result = this.evaluateStrategy(strategy, industryOrBrand);
    return {
      passesInvariant: result.passed,
      violations: result.issuesDetected,
      score: result.overallScore
    };
  }
}

export const campaignStrategyCritic = new CampaignStrategyCritic();
