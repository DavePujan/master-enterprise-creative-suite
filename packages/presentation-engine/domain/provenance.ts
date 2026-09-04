import { DataProvenance, MetricElement, ChartElement, TableElement } from './types.js';

/**
 * Domain guardrails governing data provenance and anti-fabrication.
 * Hard rule: AI may NEVER invent quantitative business metrics without verified provenance.
 */

const PLACEHOLDER_REGEX = /^\[.*\]$/;

export function isPlaceholder(val: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return PLACEHOLDER_REGEX.test(trimmed) || trimmed.toLowerCase().includes('insert verified');
}

/**
 * Normalizes and validates provenance for a metric element.
 * If a value is detected as unverified or placeholder, ensures provenance is set correctly.
 */
export function sanitizeMetricProvenance(metric: {
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  provenance?: DataProvenance;
  source?: string;
  confidence?: 'high' | 'estimated' | 'unverified';
}): {
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  provenance: DataProvenance;
  source?: string;
  confidence: 'high' | 'estimated' | 'unverified';
} {
  const isPh = isPlaceholder(metric.value);

  if (isPh) {
    return {
      value: metric.value.startsWith('[') ? metric.value : `[Insert verified ${metric.label}]`,
      label: metric.label,
      trend: metric.trend || 'neutral',
      provenance: 'placeholder',
      source: metric.source || 'Requires verification against verified source',
      confidence: 'unverified'
    };
  }

  // If user explicitly provided the data or brand context supplied it
  const prov: DataProvenance = metric.provenance || 'placeholder';
  const conf = prov === 'user_provided' || prov === 'verified_source'
    ? (metric.confidence || 'high')
    : (prov === 'brand_context' ? 'estimated' : 'unverified');

  return {
    value: metric.value,
    label: metric.label,
    trend: metric.trend || 'neutral',
    provenance: prov,
    source: metric.source,
    confidence: conf
  };
}

/**
 * Validates that all factual quantitative elements in a presentation satisfy provenance rules.
 */
export function validateSlideProvenance(elements: Array<MetricElement | ChartElement | TableElement>): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  for (const el of elements) {
    if (el.type === 'metric') {
      if (el.provenance === 'placeholder' && !isPlaceholder(el.value)) {
        warnings.push(`Metric "${el.label}" is marked as placeholder but has concrete value "${el.value}".`);
      }
      if (el.provenance !== 'placeholder' && isPlaceholder(el.value)) {
        warnings.push(`Metric "${el.label}" contains placeholder syntax but has provenance "${el.provenance}".`);
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}
