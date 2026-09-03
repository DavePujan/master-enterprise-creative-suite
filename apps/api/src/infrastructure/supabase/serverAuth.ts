/**
 * Server-Side Supabase Authentication Verifier.
 * Authoritatively validates Supabase JWT access tokens against Supabase GoTrue.
 */

import { getSupabaseAdmin } from "./supabaseClient.js";

const ADMIN_EMAILS = new Set([
  "hardeep.pathak@gmail.com",
  "avdhesh.babaria@gmail.com",
  "business@writopedia.com",
]);

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  admin?: boolean;
}

export interface AuthContextUser extends AuthenticatedUser {
  workspaceId?: string;
}

/**
 * Verifies a Supabase access token via Supabase Auth GoTrue.
 */
export async function verifySupabaseToken(token: string): Promise<AuthContextUser | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }

    const email = user.email?.toLowerCase();
    
    // Check admin role from user_roles or admin emails
    let isAdmin = Boolean(email && ADMIN_EMAILS.has(email));
    
    // Check user_roles table
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleRow?.role === "admin" || roleRow?.role === "superadmin") {
      isAdmin = true;
    }

    // Resolve user's default workspace
    let workspaceId: string | undefined;
    const { data: memberRow } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (memberRow?.workspace_id) {
      workspaceId = memberRow.workspace_id;
    }

    return {
      uid: user.id,
      email: user.email,
      admin: isAdmin,
      workspaceId,
    };
  } catch (err) {
    console.warn("Supabase JWT verification error:", err);
    return null;
  }
}

/**
 * Universal Auth Verifier: Authenticates strictly through Supabase Auth.
 */
export async function verifyAuthToken(token: string): Promise<AuthContextUser | null> {
  return verifySupabaseToken(token);
}
