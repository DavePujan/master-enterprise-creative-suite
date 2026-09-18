/**
 * Presentation Export Worker.
 * Decouples presentation rendering (PPTX and PDF) from API request lifecycles.
 * Fully backed by PostgreSQL (presentation_exports + presentation_versions) with atomic concurrency-safe claiming.
 */

import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';
import { pptxPresentationRenderer } from '../renderers/pptxRenderer.js';
import { pdfPresentationRenderer } from '../renderers/pdfRenderer.js';
import { presentationRepository } from '../presentationRepository.js';
import { PresentationDocument } from '@presentation-engine/index.js';

export class PresentationExportWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start(intervalMs = 3000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch(err => console.error('[PresentationExportWorker] Tick error:', err));
    }, intervalMs);
    console.log('[PresentationExportWorker] Background presentation export worker started.');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) return;

      // 1. Query pending export jobs or stale processing jobs older than 10 mins
      const staleCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: candidates, error: fetchErr } = await supabase
        .from('presentation_exports')
        .select('*')
        .or(`status.eq.pending,and(status.eq.processing,created_at.lt.${staleCutoff})`)
        .order('created_at', { ascending: true })
        .limit(5);

      if (fetchErr || !candidates || candidates.length === 0) {
        return;
      }

      for (const candidate of candidates) {
        // 2. Atomic Lease Claim:
        // Update status to 'processing' conditionally if status matches candidate.status
        const { data: claimed, error: claimErr } = await supabase
          .from('presentation_exports')
          .update({
            status: 'processing'
          })
          .eq('id', candidate.id)
          .eq('status', candidate.status)
          .select('*')
          .maybeSingle();

        if (claimErr || !claimed) {
          // Claimed by another worker instance
          continue;
        }

        await this.processExport(claimed);
      }
    } catch (err: any) {
      console.error('[PresentationExportWorker] General tick error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processExport(job: any): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      console.log(`[PresentationExportWorker] Processing export ${job.id} (${job.format}) for presentation ${job.presentation_id}...`);

      // 1. Fetch root presentation to obtain workspace_id
      const { data: pres, error: presErr } = await supabase
        .from('presentations')
        .select('workspace_id')
        .eq('id', job.presentation_id)
        .maybeSingle();

      if (presErr || !pres) {
        throw new Error(`Presentation ${job.presentation_id} not found in database.`);
      }

      // 2. Fetch presentation version document
      const { data: ver, error: verErr } = await supabase
        .from('presentation_versions')
        .select('document_json')
        .eq('presentation_id', job.presentation_id)
        .eq('version', job.version)
        .maybeSingle();

      if (verErr || !ver || !ver.document_json) {
        throw new Error(`Presentation version snapshot (v${job.version}) not found for presentation ${job.presentation_id}.`);
      }

      const document: PresentationDocument = ver.document_json;

      // 3. Render binary (PPTX or PDF)
      const renderer = job.format === 'pptx' ? pptxPresentationRenderer : pdfPresentationRenderer;
      const result = await renderer.render(document);

      // 4. Upload binary to Supabase Storage
      const storagePath = `workspaces/${pres.workspace_id}/presentations/${document.id}/exports/${job.id}.${job.format}`;
      const bucket = job.storage_bucket || 'user-assets';

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, result.data, {
          contentType: result.mimeType,
          upsert: true
        });

      if (uploadErr) {
        throw new Error(`Failed to upload exported binary to storage: ${uploadErr.message}`);
      }

      // 5. Update export job record to 'ready'
      await presentationRepository.updateExportJob(job.id, {
        status: 'ready',
        storagePath
      });

      console.log(`[PresentationExportWorker] Export ${job.id} rendered and stored at ${storagePath}`);
    } catch (err: any) {
      console.error(`[PresentationExportWorker] Export ${job.id} failed:`, err);
      await presentationRepository.updateExportJob(job.id, {
        status: 'failed',
        error: err?.message || 'Presentation export failed during worker execution'
      });
    }
  }

  /**
   * Reconciles stale export jobs upon worker startup.
   */
  async reconcileStaleJobs(): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      const staleCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins
      const { data: staleExports, error } = await supabase
        .from('presentation_exports')
        .select('id')
        .eq('status', 'processing')
        .lt('created_at', staleCutoff);

      if (error || !staleExports) return;

      for (const stale of staleExports) {
        console.log(`[PresentationExportWorker] Reconciling stale export job ${stale.id}...`);
        await presentationRepository.updateExportJob(stale.id, {
          status: 'failed',
          error: 'Export timed out after worker restart'
        });
      }
    } catch (err) {
      console.warn('[PresentationExportWorker] Failed to reconcile stale export jobs:', err);
    }
  }
}

export const presentationExportWorker = new PresentationExportWorker();
