/**
 * Presentation Repository.
 * Direct persistence interface to Supabase DB and Storage for Presentation Documents.
 * Implements optimistic concurrency protection (expectedVersion).
 */

import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import { PresentationDocument, PresentationAsset } from '@presentation-engine/index.js';

export class VersionConflictError extends Error {
  public status = 409;
  public code = 'VERSION_CONFLICT';
  public currentVersion: number;
  public expectedVersion: number;

  constructor(currentVersion: number, expectedVersion: number) {
    super(`Document version conflict: current revision is ${currentVersion}, but expected ${expectedVersion}.`);
    this.name = 'VersionConflictError';
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

export interface ExportJobRecord {
  id: string;
  presentationId: string;
  version: number;
  format: 'pptx' | 'pdf';
  status: 'pending' | 'processing' | 'ready' | 'failed';
  storageBucket: string;
  storagePath?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export class PresentationRepository {
  /**
   * Saves a newly generated Presentation Document.
   */
  async createPresentation(
    doc: PresentationDocument,
    workspaceId: string,
    userId: string
  ): Promise<PresentationDocument> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.warn('[PresentationRepository] Supabase admin client not initialized. Operating in local memory mode.');
      return doc;
    }

    // 1. Insert root row into public.presentations
    const { error: rootError } = await supabase
      .from('presentations')
      .insert({
        id: doc.id,
        workspace_id: workspaceId,
        created_by: userId,
        title: doc.title,
        schema_version: doc.schemaVersion,
        current_version: doc.version,
        aspect_ratio: doc.aspectRatio,
        theme: doc.theme,
        metadata: doc.metadata
      });

    if (rootError) {
      console.error('[PresentationRepository] Failed to insert presentation root:', rootError);
      // Non-fatal fallback for unmigrated environments
    }

    // 2. Insert initial version into public.presentation_versions
    const { error: versionError } = await supabase
      .from('presentation_versions')
      .insert({
        presentation_id: doc.id,
        version: doc.version,
        document_json: doc,
        created_by: userId
      });

    if (versionError) {
      console.warn('[PresentationRepository] Failed to record presentation version:', versionError);
    }

    // 3. Persist immutable snapshot blob to Supabase Storage
    try {
      const storagePath = `workspaces/${workspaceId}/presentations/${doc.id}/v${doc.version}.json`;
      await supabase.storage
        .from('user-assets')
        .upload(storagePath, JSON.stringify(doc, null, 2), {
          contentType: 'application/json',
          upsert: true
        });
    } catch (storageErr) {
      console.warn('[PresentationRepository] Failed to store snapshot blob in Storage:', storageErr);
    }

    return doc;
  }

  /**
   * Fetches the latest revision of a Presentation Document.
   */
  async getPresentation(id: string, workspaceId: string): Promise<PresentationDocument | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    // Fetch root presentation
    const { data: root, error: rootErr } = await supabase
      .from('presentations')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();

    if (rootErr || !root) {
      return null;
    }

    // Fetch current version document
    const { data: versionRow, error: verErr } = await supabase
      .from('presentation_versions')
      .select('document_json')
      .eq('presentation_id', id)
      .eq('version', root.current_version)
      .single();

    if (verErr || !versionRow?.document_json) {
      return null;
    }

    return versionRow.document_json as PresentationDocument;
  }

  /**
   * Updates an existing presentation with strict optimistic concurrency check (expectedVersion).
   */
  async updatePresentation(
    doc: PresentationDocument,
    expectedVersion: number,
    workspaceId: string,
    userId: string
  ): Promise<PresentationDocument> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      doc.version = expectedVersion + 1;
      return doc;
    }

    // 1. Check current version from database
    const { data: current, error: fetchErr } = await supabase
      .from('presentations')
      .select('current_version')
      .eq('id', doc.id)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !current) {
      throw new Error(`Presentation ${doc.id} not found in workspace.`);
    }

    if (current.current_version !== expectedVersion) {
      throw new VersionConflictError(current.current_version, expectedVersion);
    }

    const nextVersion = expectedVersion + 1;
    const updatedDoc: PresentationDocument = {
      ...doc,
      version: nextVersion,
      metadata: {
        ...doc.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    // 2. Commit new version row
    const { error: verInsertErr } = await supabase
      .from('presentation_versions')
      .insert({
        presentation_id: doc.id,
        version: nextVersion,
        document_json: updatedDoc,
        created_by: userId
      });

    if (verInsertErr) {
      console.error('[PresentationRepository] Failed to insert new version:', verInsertErr);
      throw verInsertErr;
    }

    // 3. Update root presentation record
    await supabase
      .from('presentations')
      .update({
        title: updatedDoc.title,
        current_version: nextVersion,
        aspect_ratio: updatedDoc.aspectRatio,
        theme: updatedDoc.theme,
        metadata: updatedDoc.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', doc.id);

    // 4. Archive snapshot to Storage
    try {
      const storagePath = `workspaces/${workspaceId}/presentations/${doc.id}/v${nextVersion}.json`;
      await supabase.storage
        .from('user-assets')
        .upload(storagePath, JSON.stringify(updatedDoc, null, 2), {
          contentType: 'application/json',
          upsert: true
        });
    } catch (e) {
      console.warn('[PresentationRepository] Failed to archive version snapshot:', e);
    }

    return updatedDoc;
  }

  /**
   * Creates an export job record.
   */
  async createExportJob(
    presentationId: string,
    version: number,
    format: 'pptx' | 'pdf'
  ): Promise<ExportJobRecord> {
    const supabase = getSupabaseAdmin();
    const fallbackId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!supabase) {
      return {
        id: fallbackId,
        presentationId,
        version,
        format,
        status: 'pending',
        storageBucket: 'user-assets',
        createdAt: new Date().toISOString()
      };
    }

    const { data, error } = await supabase
      .from('presentation_exports')
      .insert({
        presentation_id: presentationId,
        version,
        format,
        status: 'pending',
        storage_bucket: 'user-assets'
      })
      .select('*')
      .single();

    if (error || !data) {
      console.warn('[PresentationRepository] Failed to record export job in DB:', error);
      return {
        id: fallbackId,
        presentationId,
        version,
        format,
        status: 'pending',
        storageBucket: 'user-assets',
        createdAt: new Date().toISOString()
      };
    }

    return {
      id: data.id,
      presentationId: data.presentation_id,
      version: data.version,
      format: data.format,
      status: data.status,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      createdAt: data.created_at
    };
  }

  /**
   * Updates an export job record and resolves signed download URL when ready.
   */
  async updateExportJob(
    exportId: string,
    updates: {
      status: 'processing' | 'ready' | 'failed';
      storagePath?: string;
      error?: string;
    }
  ): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    await supabase
      .from('presentation_exports')
      .update({
        status: updates.status,
        storage_path: updates.storagePath,
        error: updates.error,
        completed_at: updates.status === 'ready' || updates.status === 'failed' ? new Date().toISOString() : null
      })
      .eq('id', exportId);
  }

  /**
   * Retrieves an export job and provides a fresh signed download URL if ready.
   */
  async getExportJob(exportId: string): Promise<ExportJobRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('presentation_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error || !data) return null;

    let downloadUrl: string | undefined = undefined;
    if (data.status === 'ready' && data.storage_path) {
      const { data: signed } = await supabase.storage
        .from(data.storage_bucket || 'user-assets')
        .createSignedUrl(data.storage_path, 3600); // 1-hour expiry
      downloadUrl = signed?.signedUrl;
    }

    return {
      id: data.id,
      presentationId: data.presentation_id,
      version: data.version,
      format: data.format,
      status: data.status,
      storageBucket: data.storage_bucket,
      storagePath: data.storage_path,
      downloadUrl,
      error: data.error,
      createdAt: data.created_at,
      completedAt: data.completed_at
    };
  }
}

export const presentationRepository = new PresentationRepository();
