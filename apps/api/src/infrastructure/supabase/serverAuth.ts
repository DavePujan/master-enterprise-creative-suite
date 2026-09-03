/**
 * Server-Side Supabase Authentication & Auth Bridge.
 * Supports Supabase JWT verification with seamless fallback to Firebase ID tokens during migration.
 */

import { getSupabaseAdmin } from "./supabaseClient.js";
import { verifyFirebaseIdToken, type AuthenticatedUser } from "../firebase/serverAuth.js";
import { serverConfig } from "../../config/env.js";

const ADMIN_EMAILS = new Set([
  "hardeep.pathak@gmail.com",
  "avdhesh.babaria@gmail.com",
  "business@writopedia.com",
]);

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

    // Check user_metadata for legacy firebase_uid
    const legacyFirebaseUid = user.user_metadata?.firebase_uid;
    if (legacyFirebaseUid) {
      await supabase.from("firebase_uid_map").upsert({
        firebase_uid: legacyFirebaseUid,
        supabase_user_id: user.id,
        legacy_email: user.email || null,
        migration_status: "linked",
        migrated_at: new Date().toISOString()
      });
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
 * Links a legacy Firebase UID to a Supabase User Profile.
 */
export async function linkFirebaseUid(
  firebaseUid: string,
  supabaseUserId: string,
  email?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await supabase.from("firebase_uid_map").upsert({
    firebase_uid: firebaseUid,
    supabase_user_id: supabaseUserId,
    legacy_email: email || null,
    migration_status: "linked",
    migrated_at: new Date().toISOString()
  });
}

/**
 * Universal Auth Bridge: Verifies Supabase tokens first, then falls back to Firebase ID tokens.
 * This guarantees zero downtime and zero disruption during cutover.
 */
export async function verifyAuthToken(token: string): Promise<AuthContextUser | null> {
  // 1. Attempt Supabase Auth verification
  const supaUser = await verifySupabaseToken(token);
  if (supaUser) {
    return supaUser;
  }

  // 2. Fall back to Firebase verification for users still on Firebase client
  const firebaseUser = await verifyFirebaseIdToken(token);
  if (firebaseUser) {
    const supabase = getSupabaseAdmin();
    let workspaceId: string | undefined;

    if (supabase) {
      // Check if this Firebase UID is already mapped to a Supabase profile
      const { data: mapRow } = await supabase
        .from("firebase_uid_map")
        .select("supabase_user_id")
        .eq("firebase_uid", firebaseUser.uid)
        .maybeSingle();

      if (mapRow?.supabase_user_id) {
        const { data: memberRow } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", mapRow.supabase_user_id)
          .limit(1)
          .maybeSingle();

        workspaceId = memberRow?.workspace_id;
      }
    }

    return {
      ...firebaseUser,
      workspaceId: workspaceId || `ws_fb_${firebaseUser.uid}`,
    };
  }

  return null;
}
