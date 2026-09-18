import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';
import type {
  DiscoveryState,
  AdBrief,
  DiscoveryQuestion,
  KnownField,
  DiscoveryContradiction,
  DiscoveryAnswer
} from '@contracts/adSpecContracts.js';

export class VideoAdDiscoveryRepository {
  // In-memory fallback for local dev & unit tests
  private inMemorySessions = new Map<string, DiscoveryState>();

  /**
   * Save or overwrite a discovery session.
   */
  public async saveSession(session: DiscoveryState, workspaceId: string): Promise<void> {
    const enrichedSession: DiscoveryState = {
      ...session,
      workspaceId,
      updatedAt: new Date().toISOString()
    };

    // Keep in-memory cache updated
    this.inMemorySessions.set(session.projectId, enrichedSession);

    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('video_ad_discovery_sessions')
        .upsert(
          {
            project_id: session.projectId,
            workspace_id: workspaceId,
            status: session.status,
            brief: session.brief,
            known_fields: session.knownFields,
            unknown_fields: session.unknownFields,
            ambiguities: session.ambiguities || [],
            questions: session.questions,
            answers: session.answers,
            contradictions: session.contradictions,
            blocking_issues: session.blockingIssues,
            completeness: session.completeness,
            is_brief_confirmed: session.isBriefConfirmed,
            confirmed_at: session.confirmedAt,
            updated_at: enrichedSession.updatedAt
          },
          { onConflict: 'project_id' }
        );

      if (error) {
        console.warn(`[VideoAdDiscoveryRepository.saveSession] Supabase warning: ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`[VideoAdDiscoveryRepository.saveSession] Fallback active: ${err?.message}`);
    }
  }

  /**
   * Retrieve a discovery session enforcing workspace ownership.
   */
  public async getSession(projectId: string, workspaceId: string): Promise<DiscoveryState | null> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('video_ad_discovery_sessions')
          .select('*')
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (data && !error) {
          const session: DiscoveryState = {
            projectId: data.project_id,
            workspaceId: data.workspace_id,
            status: data.status,
            brief: data.brief || {},
            knownFields: data.known_fields || [],
            unknownFields: data.unknown_fields || [],
            ambiguities: data.ambiguities || [],
            questions: data.questions || [],
            answers: data.answers || [],
            contradictions: data.contradictions || [],
            completeness: Number(data.completeness) || 0,
            blockingIssues: data.blocking_issues || [],
            isBriefConfirmed: data.is_brief_confirmed || false,
            confirmedAt: data.confirmed_at,
            updatedAt: data.updated_at
          };
          this.inMemorySessions.set(projectId, session);
          return session;
        }
      } catch (err: any) {
        console.warn(`[VideoAdDiscoveryRepository.getSession] Fallback active: ${err?.message}`);
      }
    }

    const cached = this.inMemorySessions.get(projectId);
    if (cached && cached.workspaceId === workspaceId) {
      return cached;
    }

    return null;
  }

  /**
   * Update active discovery session fields.
   */
  public async updateSession(
    projectId: string,
    workspaceId: string,
    updates: Partial<DiscoveryState>
  ): Promise<DiscoveryState> {
    const existing = await this.getSession(projectId, workspaceId);
    if (!existing) {
      throw new Error(`Discovery session for project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    const merged: DiscoveryState = {
      ...existing,
      ...updates,
      projectId,
      workspaceId,
      updatedAt: new Date().toISOString()
    };

    await this.saveSession(merged, workspaceId);
    return merged;
  }

  /**
   * Mark brief as confirmed by user.
   */
  public async confirmBrief(
    projectId: string,
    workspaceId: string,
    confirmedBrief: Partial<AdBrief>
  ): Promise<DiscoveryState> {
    const now = new Date().toISOString();
    return this.updateSession(projectId, workspaceId, {
      brief: confirmedBrief,
      status: 'READY_FOR_CREATIVE',
      isBriefConfirmed: true,
      confirmedAt: now
    });
  }

  /**
   * For testing: clear in-memory sessions.
   */
  public clearMemory(): void {
    this.inMemorySessions.clear();
  }
}

export const videoAdDiscoveryRepository = new VideoAdDiscoveryRepository();
