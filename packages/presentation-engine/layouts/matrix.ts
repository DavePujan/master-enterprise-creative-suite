import { SlidePurpose, SlideLayoutType } from '../domain/types.js';

/**
 * Purpose-to-Layout Compatibility Matrix.
 * Prevents the AI planner from assigning incompatible geometries to semantic purposes.
 */
export const ALLOWED_LAYOUTS_BY_PURPOSE: Record<SlidePurpose, SlideLayoutType[]> = {
  cover: ['cover'],
  agenda: ['standard', 'split'],
  problem: ['split', 'standard', 'bento'],
  opportunity: ['split', 'standard', 'bento'],
  strategy: ['bento', 'split', 'standard'],
  solution: ['bento', 'split', 'standard'],
  process: ['timeline', 'standard'],
  timeline: ['timeline', 'standard'],
  comparison: ['comparison', 'split'],
  metrics: ['bento', 'metrics-focus', 'split'],
  market: ['bento', 'split', 'comparison'],
  team: ['standard', 'bento'],
  financials: ['bento', 'metrics-focus', 'split'],
  'case-study': ['quote', 'split', 'standard'],
  closing: ['cover', 'quote', 'standard']
};

export const DEFAULT_LAYOUT_BY_PURPOSE: Record<SlidePurpose, SlideLayoutType> = {
  cover: 'cover',
  agenda: 'standard',
  problem: 'split',
  opportunity: 'split',
  strategy: 'bento',
  solution: 'bento',
  process: 'timeline',
  timeline: 'timeline',
  comparison: 'comparison',
  metrics: 'bento',
  market: 'bento',
  team: 'standard',
  financials: 'bento',
  'case-study': 'split',
  closing: 'cover'
};

/**
 * Resolves a compatible layout given a slide's semantic purpose and an optional preferred layout.
 */
export function resolveCompatibleLayout(
  purpose: SlidePurpose,
  preferredLayout?: SlideLayoutType
): SlideLayoutType {
  const allowed = ALLOWED_LAYOUTS_BY_PURPOSE[purpose] || ['standard'];
  if (preferredLayout && allowed.includes(preferredLayout)) {
    return preferredLayout;
  }
  return DEFAULT_LAYOUT_BY_PURPOSE[purpose] || allowed[0] || 'standard';
}
