/**
 * Presentation Export Job Queue Bridge.
 * Delegates export requests to the durable, database-backed PresentationExportWorker.
 */

import { PresentationDocument } from '@presentation-engine/index.js';
import { presentationExportWorker } from './presentationExportWorker.js';

export interface ProcessExportJobParams {
  exportId: string;
  document: PresentationDocument;
  format: 'pptx' | 'pdf';
  workspaceId: string;
}

export async function processExportJobAsync(_params: ProcessExportJobParams): Promise<void> {
  // Trigger immediate tick on durable worker; persistent worker also claims via polling loop
  presentationExportWorker.tick().catch((err) => {
    console.warn('[ExportJobQueue] Export worker tick warning:', err);
  });
}

