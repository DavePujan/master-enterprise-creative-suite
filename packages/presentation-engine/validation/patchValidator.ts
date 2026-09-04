/**
 * AI Patch Validator & Applicator.
 * Sanitizes untrusted AI-generated mutation patches before applying them to the Presentation Document.
 * Enforces schema bounds, provenance rules, and prevents full-deck rewrites.
 */

import { PresentationDocument, SlideElement, NormalizedBounds } from '../domain/types.js';
import { clampBounds } from '../geometry/coordinateConverter.js';
import { sanitizeMetricProvenance } from '../domain/provenance.js';

export type PatchOp = 'replace_element' | 'update_text' | 'reposition_element' | 'change_layout' | 'update_metric';

export interface PresentationPatch {
  op: PatchOp;
  slideId: string;
  elementId?: string;
  payload: any;
}

export interface PatchValidationResult {
  isValid: boolean;
  sanitizedPatch?: PresentationPatch;
  error?: string;
}

/**
 * Sanitizes and validates an AI-generated patch against document invariants.
 */
export function validateAndSanitizePatch(
  doc: PresentationDocument,
  patch: PresentationPatch
): PatchValidationResult {
  if (!patch || !patch.slideId || !patch.op) {
    return { isValid: false, error: 'Patch must specify slideId and op.' };
  }

  const slide = doc.slides.find(s => s.id === patch.slideId);
  if (!slide) {
    return { isValid: false, error: `Target slide "${patch.slideId}" does not exist in presentation.` };
  }

  switch (patch.op) {
    case 'reposition_element': {
      if (!patch.elementId) {
        return { isValid: false, error: 'reposition_element patch requires elementId.' };
      }
      const rawBounds = patch.payload?.bounds as NormalizedBounds;
      if (!rawBounds || typeof rawBounds.x !== 'number' || typeof rawBounds.y !== 'number') {
        return { isValid: false, error: 'Invalid bounds payload in reposition_element patch.' };
      }
      return {
        isValid: true,
        sanitizedPatch: {
          ...patch,
          payload: {
            bounds: clampBounds(rawBounds)
          }
        }
      };
    }

    case 'update_metric': {
      if (!patch.payload?.value || !patch.payload?.label) {
        return { isValid: false, error: 'update_metric requires value and label.' };
      }
      const sanitized = sanitizeMetricProvenance(patch.payload);
      return {
        isValid: true,
        sanitizedPatch: {
          ...patch,
          payload: sanitized
        }
      };
    }

    case 'update_text': {
      if (typeof patch.payload?.text !== 'string') {
        return { isValid: false, error: 'update_text requires text string in payload.' };
      }
      return {
        isValid: true,
        sanitizedPatch: patch
      };
    }

    case 'replace_element': {
      if (!patch.elementId || !patch.payload?.type) {
        return { isValid: false, error: 'replace_element requires elementId and element object.' };
      }
      const el = patch.payload as SlideElement;
      el.bounds = clampBounds(el.bounds);
      if (el.type === 'metric') {
        patch.payload = sanitizeMetricProvenance(el);
      }
      return {
        isValid: true,
        sanitizedPatch: patch
      };
    }

    default:
      return { isValid: true, sanitizedPatch: patch };
  }
}

/**
 * Applies a sanitized patch to a PresentationDocument, returning a new immutable revision.
 */
export function applyPatch(
  doc: PresentationDocument,
  patch: PresentationPatch
): PresentationDocument {
  const validation = validateAndSanitizePatch(doc, patch);
  if (!validation.isValid || !validation.sanitizedPatch) {
    throw new Error(`Cannot apply invalid patch: ${validation.error}`);
  }

  const sanitized = validation.sanitizedPatch;

  const updatedSlides = doc.slides.map(slide => {
    if (slide.id !== sanitized.slideId) return slide;

    if (sanitized.op === 'reposition_element' && sanitized.elementId) {
      return {
        ...slide,
        elements: slide.elements.map(el =>
          el.id === sanitized.elementId
            ? { ...el, bounds: sanitized.payload.bounds }
            : el
        )
      };
    }

    if (sanitized.op === 'update_text' && sanitized.elementId) {
      return {
        ...slide,
        elements: slide.elements.map(el =>
          el.id === sanitized.elementId && el.type === 'text'
            ? { ...el, text: sanitized.payload.text }
            : el
        )
      };
    }

    if (sanitized.op === 'update_metric' && sanitized.elementId) {
      return {
        ...slide,
        elements: slide.elements.map(el =>
          el.id === sanitized.elementId && el.type === 'metric'
            ? { ...el, ...sanitized.payload }
            : el
        )
      };
    }

    if (sanitized.op === 'replace_element' && sanitized.elementId) {
      return {
        ...slide,
        elements: slide.elements.map(el =>
          el.id === sanitized.elementId
            ? sanitized.payload
            : el
        )
      };
    }

    return slide;
  });

  return {
    ...doc,
    slides: updatedSlides,
    metadata: {
      ...doc.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}
