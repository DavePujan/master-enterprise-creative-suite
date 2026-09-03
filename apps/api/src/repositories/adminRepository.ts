/**
 * Admin Repository.
 * Direct persistence interface to public.admin_settings and public.user_roles.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export interface AdminSettingRow {
  key: string;
  value: Record<string, unknown>;
  updated_by?: string | null;
  updated_at: string;
}

export interface UserRoleRow {
  user_id: string;
  role: "user" | "curator" | "admin" | "superadmin";
  assigned_by?: string | null;
  assigned_at: string;
}

export class AdminRepository {
  /**
   * Retrieves an admin setting by key.
   */
  async getSetting(key: string): Promise<Record<string, unknown> | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { data, error } = await supabase
      .from("admin_settings")
      .select("*")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error(`AdminRepository.getSetting("${key}") error:`, error);
      throw new Error(`Failed to read admin setting: ${error.message}`);
    }

    return data ? (data.value as Record<string, unknown>) : null;
  }

  /**
   * Sets or updates an admin setting by key.
   */
  async setSetting(key: string, value: Record<string, unknown>, updatedBy?: string): Promise<AdminSettingRow> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { data, error } = await supabase
      .from("admin_settings")
      .upsert({
        key,
        value,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !data) {
      console.error(`AdminRepository.setSetting("${key}") error:`, error);
      throw new Error(`Failed to save admin setting: ${error?.message}`);
    }

    return data;
  }

  /**
   * Lists all user roles or looks up a specific user's role.
   */
  async getUserRole(userId: string): Promise<UserRoleRow | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("AdminRepository.getUserRole error:", error);
      return null;
    }

    return data;
  }

  /**
   * Assigns a system role to a user.
   */
  async setUserRole(
    userId: string,
    role: "user" | "curator" | "admin" | "superadmin",
    assignedBy?: string
  ): Promise<UserRoleRow> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Supabase database client is not configured.");
    }

    const { data, error } = await supabase
      .from("user_roles")
      .upsert({
        user_id: userId,
        role,
        assigned_by: assignedBy || null,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !data) {
      console.error("AdminRepository.setUserRole error:", error);
      throw new Error(`Failed to assign user role: ${error?.message}`);
    }

    return data;
  }
}

export const adminRepository = new AdminRepository();
