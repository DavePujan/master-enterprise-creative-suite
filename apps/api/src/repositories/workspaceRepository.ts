/**
 * Workspace & Multi-Tenant Membership Repository.
 * Direct persistence interface to public.workspaces and public.workspace_members.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface WorkspaceRecord {
  id: string;
  name: string;
  ownerId: string;
  isPersonal: boolean;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceRepository {
  /**
   * Retrieves the primary or personal workspace for a user.
   */
  async getPrimaryWorkspaceForUser(userId: string): Promise<WorkspaceRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return null;
    }

    // Check workspace_members
    const { data: membership, error: memError } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(*)")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (memError || !membership) {
      // Check if user owns a workspace directly
      const { data: ownedWs } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", userId)
        .limit(1)
        .single();

      if (ownedWs) {
        return {
          id: ownedWs.id,
          name: ownedWs.name,
          ownerId: ownedWs.owner_id,
          isPersonal: ownedWs.is_personal,
          role: "owner",
          createdAt: ownedWs.created_at,
          updatedAt: ownedWs.updated_at,
        };
      }
      return null;
    }

    const ws = (membership as any).workspaces;
    return {
      id: ws.id,
      name: ws.name,
      ownerId: ws.owner_id,
      isPersonal: ws.is_personal,
      role: membership.role,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    };
  }

  /**
   * Ensures a personal workspace exists for a user and returns its ID.
   */
  async ensurePersonalWorkspace(userId: string, email: string): Promise<string> {
    const existing = await this.getPrimaryWorkspaceForUser(userId);
    if (existing) return existing.id;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    // Ensure profile exists first
    await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: email.split("@")[0],
    });

    // Create workspace
    const { data: ws, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: "Personal Workspace",
        owner_id: userId,
        is_personal: true,
      })
      .select()
      .single();

    if (wsError || !ws) {
      console.error("ensurePersonalWorkspace error:", wsError);
      throw new Error(`Failed to create personal workspace: ${wsError?.message || "Unknown database error"}`);
    }

    // Add membership
    await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: userId,
      role: "owner",
    });

    // Initialize balance
    await supabase.from("credit_balances").insert({
      workspace_id: ws.id,
      balance: 50,
      held_balance: 0,
      lifetime_granted: 50,
      lifetime_spent: 0,
    });

    // Record welcome grant in immutable credit ledger
    await supabase.from("credit_ledger").insert({
      workspace_id: ws.id,
      actor_user_id: userId,
      amount: 50,
      resulting_balance: 50,
      type: "signup_grant",
      idempotency_key: `signup_grant_${ws.id}`,
      description: "Welcome signup grant of 50 credits",
      metadata: { initial_grant: true, is_personal: true }
    });

    return ws.id;
  }

  /**
   * Lists all workspaces accessible by a user.
   */
  async getUserWorkspaces(userId: string): Promise<WorkspaceRecord[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(*)")
      .eq("user_id", userId);

    if (error || !data) {
      console.error("WorkspaceRepository.getUserWorkspaces error:", error);
      return [];
    }

    return data
      .filter((d: any) => d.workspaces)
      .map((d: any) => ({
        id: d.workspaces.id,
        name: d.workspaces.name,
        ownerId: d.workspaces.owner_id,
        isPersonal: d.workspaces.is_personal,
        role: d.role,
        createdAt: d.workspaces.created_at,
        updatedAt: d.workspaces.updated_at,
      }));
  }

  /**
   * Lists members of a given workspace.
   */
  async getWorkspaceMembers(workspaceId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, user_id, role, joined_at, profiles(*)")
      .eq("workspace_id", workspaceId);

    if (error || !data) {
      console.error("WorkspaceRepository.getWorkspaceMembers error:", error);
      return [];
    }

    return data;
  }
}

export const workspaceRepository = new WorkspaceRepository();
