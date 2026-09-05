/**
 * Versioned Presentation Stage Contracts (v1.0.0).
 * Defines explicit data contracts between Presentation Engine stages:
 * - Stage 1 (Planner): Produces PlannerOutput_v1
 * - Stage 2 (Compiler): Consumes CompilerInput_v1, synthesizes SemanticSlideContent_v1,
 *   and invokes deterministic LayoutEngine to produce PresentationDocument (IR v1.0.0).
 */

import { SlidePurpose, SlideLayoutType } from '@presentation-engine/index.js';

export const VALID_SLIDE_PURPOSES: SlidePurpose[] = [
  'cover',
  'agenda',
  'problem',
  'opportunity',
  'strategy',
  'solution',
  'process',
  'timeline',
  'comparison',
  'metrics',
  'market',
  'team',
  'financials',
  'case-study',
  'closing'
];

export interface PlannedSlideOutline_v1 {
  index: number;
  purpose: SlidePurpose;
  coreIdea: string;
  suggestedLayout?: SlideLayoutType;
  requiresChart?: boolean;
  requiresMetric?: boolean;
}

export interface PlannerOutput_v1 {
  schemaVersion: '1.0.0';
  title: string;
  objective: string;
  targetAudience: string;
  narrativeArc: string;
  brandName: string;
  industry: string;
  targetSlideCount: number;
  slides: PlannedSlideOutline_v1[];
}

export function validatePlannerOutput_v1(data: any): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Planner output must be a valid JSON object.'] };
  }

  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.push('Presentation title is required and must be non-empty.');
  }

  if (!Array.isArray(data.slides) || data.slides.length < 4) {
    errors.push(`Presentation must formulate at least 4 slides. Received: ${data?.slides?.length ?? 0}`);
    return { isValid: false, errors };
  }

  if (data.slides.length > 20) {
    errors.push(`Presentation slide count exceeds maximum limit (20). Received: ${data.slides.length}`);
  }

  // Cover slide invariant: First slide must be cover
  if (data.slides[0].purpose !== 'cover') {
    errors.push(`First slide at index 0 must have purpose "cover". Received: "${data.slides[0].purpose}"`);
  }

  // Closing slide invariant: Final slide must be closing or case-study
  const lastIndex = data.slides.length - 1;
  const lastPurpose = data.slides[lastIndex]?.purpose;
  if (lastPurpose !== 'closing' && lastPurpose !== 'case-study') {
    errors.push(
      `Final slide at index ${lastIndex} must have purpose "closing" or "case-study". Received: "${lastPurpose}"`
    );
  }

  // Validate each slide outline
  data.slides.forEach((slide: any, idx: number) => {
    if (!VALID_SLIDE_PURPOSES.includes(slide.purpose)) {
      errors.push(`Slide at index ${idx} has invalid purpose "${slide.purpose}".`);
    }
    if (!slide.coreIdea || typeof slide.coreIdea !== 'string') {
      errors.push(`Slide at index ${idx} is missing a valid coreIdea string.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

export interface MetricData_v1 {
  value: string;
  label: string;
  provenance: 'user_provided' | 'brand_context' | 'verified_source' | 'placeholder';
  source?: string;
  confidence?: number;
}

export interface ChartSeries_v1 {
  name: string;
  values: number[];
}

export interface ChartData_v1 {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  categories: string[];
  series: ChartSeries_v1[];
  provenance: 'user_provided' | 'brand_context' | 'verified_source' | 'placeholder';
  source?: string;
}

export interface SemanticSlideContent_v1 {
  index: number;
  purpose: SlidePurpose;
  title: string;
  subtitle?: string;
  bulletPoints?: string[];
  visualPrompt?: string;
  speakerNotes?: string;
  metric?: MetricData_v1;
  metrics?: MetricData_v1[];
  chart?: ChartData_v1;
}

export interface CompilerOutput_v1 {
  schemaVersion: '1.0.0';
  slides: SemanticSlideContent_v1[];
}

export function validateCompilerOutput_v1(
  data: any,
  expectedCount: number
): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];

  const slides = Array.isArray(data?.slides) ? data.slides : Array.isArray(data) ? data : null;

  if (!slides || slides.length === 0) {
    return { isValid: false, errors: ['Compiler output must contain a non-empty array of slides.'] };
  }

  if (Math.abs(slides.length - expectedCount) > 2) {
    errors.push(
      `Compiled slide count (${slides.length}) deviates significantly from plan target (${expectedCount}).`
    );
  }

  slides.forEach((slide: any, idx: number) => {
    if (!slide.title || typeof slide.title !== 'string' || !slide.title.trim()) {
      errors.push(`Slide at index ${idx} has an empty or invalid title.`);
    }

    // Provenance validation on metrics
    if (slide.metric) {
      if (!['user_provided', 'brand_context', 'verified_source', 'placeholder'].includes(slide.metric.provenance)) {
        errors.push(`Slide at index ${idx} metric has invalid provenance "${slide.metric.provenance}".`);
      }
    }

    if (Array.isArray(slide.metrics)) {
      slide.metrics.forEach((m: any, mIdx: number) => {
        if (!['user_provided', 'brand_context', 'verified_source', 'placeholder'].includes(m.provenance)) {
          errors.push(`Slide at index ${idx} metrics[${mIdx}] has invalid provenance "${m.provenance}".`);
        }
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
