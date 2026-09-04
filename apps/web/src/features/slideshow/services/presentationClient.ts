/**
 * Presentation Client Service.
 * Frontend communication bridge for canonical presentation generation, persistence, and export.
 */

import { PresentationDocument } from '@presentation-engine/index.js';
import { getCurrentAccessToken } from '@web/infrastructure/supabase/auth.js';

export interface GeneratePresentationClientParams {
  prompt: string;
  brandGuidelines?: any;
  logoAssetId?: string;
  targetSlideCount?: number;
  productContext?: any;
  customTheme?: any;
}

export interface ExportJobStatus {
  id: string;
  presentationId: string;
  version: number;
  format: 'pptx' | 'pdf';
  status: 'pending' | 'processing' | 'ready' | 'failed';
  storagePath?: string;
  downloadUrl?: string;
  error?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export class PresentationClient {
  /**
   * Generates a canonical Presentation Document via server-side 2-stage planning and layout engine.
   */
  async generatePresentation(
    params: GeneratePresentationClientParams
  ): Promise<{ document: PresentationDocument; newBalance?: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/presentation/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Presentation generation failed (${res.status})`);
    }

    return res.json();
  }

  /**
   * Fetches the latest presentation document.
   */
  async getPresentation(id: string): Promise<PresentationDocument> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/presentation/${id}`, {
      method: 'GET',
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch presentation (${res.status})`);
    }

    return res.json();
  }

  /**
   * Saves updates to a presentation document with optimistic concurrency check.
   */
  async updatePresentation(
    document: PresentationDocument,
    expectedVersion: number
  ): Promise<PresentationDocument> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/presentation/${document.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ document, expectedVersion })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const err: any = new Error(errorData.error || `Failed to update presentation (${res.status})`);
      err.code = errorData.code;
      err.currentVersion = errorData.currentVersion;
      throw err;
    }

    return res.json();
  }

  /**
   * Triggers a server-side PPTX or PDF export job.
   */
  async requestExport(
    presentationId: string,
    format: 'pptx' | 'pdf'
  ): Promise<ExportJobStatus> {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/presentation/${presentationId}/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to request export (${res.status})`);
    }

    return res.json();
  }

  /**
   * Polls the status of an export job until ready or failed.
   */
  async pollExportUntilReady(
    exportId: string,
    onProgress?: (status: ExportJobStatus) => void,
    timeoutMs = 60000
  ): Promise<ExportJobStatus> {
    const startTime = Date.now();
    const intervalMs = 1500;

    while (Date.now() - startTime < timeoutMs) {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/presentation/export/${exportId}`, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        throw new Error(`Failed to check export job status (${res.status})`);
      }

      const job: ExportJobStatus = await res.json();
      if (onProgress) onProgress(job);

      if (job.status === 'ready') {
        return job;
      }
      if (job.status === 'failed') {
        throw new Error(job.error || 'Export rendering failed on server.');
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('Export job timed out. The file may still be processing.');
  }
}

export const presentationClient = new PresentationClient();
