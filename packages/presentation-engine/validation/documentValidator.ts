import { PresentationDocument, PresentationSlide, SlideElement } from '../domain/types.js';
import { validateSlideProvenance } from '../domain/provenance.js';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Performs deep semantic and geometric validation of a PresentationDocument.
 */
export function validatePresentationDocument(doc: PresentationDocument): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!doc.id) errors.push('Document missing required id.');
  if (typeof doc.schemaVersion !== 'number' || doc.schemaVersion < 1) {
    errors.push('Document schemaVersion must be an integer >= 1.');
  }
  if (typeof doc.version !== 'number' || doc.version < 1) {
    errors.push('Document version must be an integer >= 1.');
  }
  if (!doc.slides || !Array.isArray(doc.slides) || doc.slides.length === 0) {
    errors.push('Document must contain at least 1 slide in slides array.');
  }

  // Slide validation
  doc.slides.forEach((slide: PresentationSlide, index: number) => {
    if (slide.index !== index) {
      warnings.push(`Slide index mismatch at position ${index}: slide.index is ${slide.index}.`);
    }
    if (!slide.title || slide.title.trim().length === 0) {
      errors.push(`Slide at index ${index} is missing a title.`);
    }

    // Element bounds validation
    slide.elements.forEach((el: SlideElement) => {
      if (!el.id) errors.push(`Element in slide ${index} is missing an id.`);
      const { x, y, width, height } = el.bounds;

      if (x < 0 || x > 100) errors.push(`Element ${el.id} bounds.x (${x}) outside 0-100% range.`);
      if (y < 0 || y > 100) errors.push(`Element ${el.id} bounds.y (${y}) outside 0-100% range.`);
      if (width <= 0 || width > 100) errors.push(`Element ${el.id} bounds.width (${width}) invalid.`);
      if (height <= 0 || height > 100) errors.push(`Element ${el.id} bounds.height (${height}) invalid.`);
    });

    // Provenance validation on factual elements
    const factualElements = slide.elements.filter(
      (el): el is Extract<SlideElement, { provenance: any }> => 'provenance' in el
    );
    const provReport = validateSlideProvenance(factualElements as any);
    warnings.push(...provReport.warnings);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
