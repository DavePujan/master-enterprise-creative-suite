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
      return {
        id: `ws_${userId}`,
        name: "Personal Workspace",
        ownerId: userId,
        isPersonal: true,
        role: "owner",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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
    if (!supabase) return `ws_${userId}`;

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
      return `ws_${userId}`;
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

    return ws.id;
  }
}

export const workspaceRepository = new WorkspaceRepository();
