/**
 * Presentation Export Job Worker.
 * Executes server-side PPTX or PDF exports in the background without blocking the HTTP request thread.
 * Streams generated binaries to Supabase Storage under user-assets.
 */

import { PresentationDocument } from '@presentation-engine/index.js';
import { presentationRepository } from '../presentationRepository.js';
import { pptxPresentationRenderer } from '../renderers/pptxRenderer.js';
import { pdfPresentationRenderer } from '../renderers/pdfRenderer.js';
import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';

export interface ProcessExportJobParams {
  exportId: string;
  document: PresentationDocument;
  format: 'pptx' | 'pdf';
  workspaceId: string;
}

export async function processExportJobAsync(params: ProcessExportJobParams): Promise<void> {
  const { exportId, document, format, workspaceId } = params;

  // Run in background
  setImmediate(async () => {
    try {
      console.log(`[ExportJobWorker] Starting ${format.toUpperCase()} export for doc ${document.id} (job: ${exportId})`);
      await presentationRepository.updateExportJob(exportId, { status: 'processing' });

      // 1. Select renderer
      const renderer = format === 'pptx' ? pptxPresentationRenderer : pdfPresentationRenderer;
      const result = await renderer.render(document);

      // 2. Upload to Supabase Storage
      const supabase = getSupabaseAdmin();
      const storagePath = `workspaces/${workspaceId}/presentations/${document.id}/exports/${exportId}.${format}`;

      if (supabase) {
        const { error: uploadErr } = await supabase.storage
          .from('user-assets')
          .upload(storagePath, result.data, {
            contentType: result.mimeType,
            upsert: true
          });

        if (uploadErr) {
          throw new Error(`Failed to upload exported binary to storage: ${uploadErr.message}`);
        }
      }

      // 3. Mark job ready
      await presentationRepository.updateExportJob(exportId, {
        status: 'ready',
        storagePath
      });

      console.log(`[ExportJobWorker] Successfully finished ${format.toUpperCase()} export (job: ${exportId})`);
    } catch (err: any) {
      console.error(`[ExportJobWorker] Export job ${exportId} failed:`, err);
      await presentationRepository.updateExportJob(exportId, {
        status: 'failed',
        error: err?.message || 'Export generation failed.'
      });
    }
  });
}
