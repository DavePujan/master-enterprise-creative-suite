/**
 * History Logs Repository.
 * Direct persistence interface to public.history_logs.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface HistoryLogRow {
  id: string;
  workspace_id: string;
  user_id: string;
  job_id?: string | null;
  gem_id: string;
  title: string;
  prompt: string;
  result_summary: Record<string, unknown>;
  created_at: string;
}

export interface AddHistoryParams {
  workspaceId: string;
  userId: string;
  jobId?: string;
  gemId: string;
  title: string;
  prompt: string;
  resultSummary: Record<string, unknown>;
}

export class HistoryRepository {
  /**
   * Retrieves history logs for a workspace.
   */
  async listHistory(workspaceId: string, limitCount = 30): Promise<HistoryLogRow[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { data, error } = await supabase
      .from("history_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error("HistoryRepository.listHistory error:", error);
      throw new Error(`Failed to load history logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Adds an entry to history logs.
   */
  async addHistory(params: AddHistoryParams): Promise<HistoryLogRow> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { data, error } = await supabase
      .from("history_logs")
      .insert({
        workspace_id: params.workspaceId,
        user_id: params.userId,
        job_id: params.jobId || null,
        gem_id: params.gemId,
        title: params.title || "Creative Output",
        prompt: params.prompt,
        result_summary: params.resultSummary || {}
      })
      .select()
      .single();

    if (error || !data) {
      console.error("HistoryRepository.addHistory error:", error);
      throw new Error(`Failed to record history log: ${error?.message}`);
    }

    return data;
  }

  /**
   * Deletes a history entry by ID.
   */
  async deleteHistory(workspaceId: string, historyId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { error } = await supabase
      .from("history_logs")
      .delete()
      .eq("id", historyId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("HistoryRepository.deleteHistory error:", error);
      throw new Error(`Failed to delete history log: ${error.message}`);
    }

    return true;
  }
}

export const historyRepository = new HistoryRepository();
