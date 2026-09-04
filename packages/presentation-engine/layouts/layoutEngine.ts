import {
  SemanticSlideInput,
  SlideElement,
  SlideLayoutType,
  PresentationTheme
} from '../domain/types.js';
import { resolveCompatibleLayout } from './matrix.js';
import { computeCoverLayout } from './coverLayout.js';
import { computeStandardLayout } from './standardLayout.js';
import { computeSplitLayout } from './splitLayout.js';
import { computeBentoLayout } from './bentoLayout.js';
import { computeMetricsLayout } from './metricsLayout.js';
import { computeTimelineLayout } from './timelineLayout.js';
import { computeComparisonLayout } from './comparisonLayout.js';

export interface LayoutComputeResult {
  layout: SlideLayoutType;
  elements: SlideElement[];
}

/**
 * Deterministic Layout Engine.
 * Resolves a compatible layout from the slide's semantic purpose and computes all element geometries.
 */
export function computeSlideLayout(
  input: SemanticSlideInput,
  theme?: PresentationTheme,
  slideIndex = 0
): LayoutComputeResult {
  const slideId = input.id || `slide_${slideIndex + 1}`;
  const layout = resolveCompatibleLayout(input.purpose, input.preferredLayout);

  let elements: SlideElement[];

  switch (layout) {
    case 'cover':
      elements = computeCoverLayout(input, theme, slideId);
      break;
    case 'split':
      elements = computeSplitLayout(input, theme, slideId);
      break;
    case 'bento':
      elements = computeBentoLayout(input, theme, slideId);
      break;
    case 'metrics-focus':
      elements = computeMetricsLayout(input, theme, slideId);
      break;
    case 'timeline':
      elements = computeTimelineLayout(input, theme, slideId);
      break;
    case 'comparison':
      elements = computeComparisonLayout(input, theme, slideId);
      break;
    case 'quote':
    case 'standard':
    default:
      elements = computeStandardLayout(input, theme, slideId);
      break;
  }

  return {
    layout,
    elements
  };
}
