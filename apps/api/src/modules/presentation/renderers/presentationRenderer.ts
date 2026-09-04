/**
 * Presentation Renderer Abstraction.
 * Decouples presentation document rendering from concrete export libraries (pptxgenjs, jspdf, etc.).
 */

import { PresentationDocument } from '@presentation-engine/index.js';

export interface RenderResult {
  format: 'pptx' | 'pdf';
  mimeType: string;
  data: Buffer | Uint8Array;
  fileName: string;
}

export interface PresentationRenderer<TOutput = RenderResult> {
  readonly format: 'pptx' | 'pdf';
  render(document: PresentationDocument): Promise<TOutput>;
}
