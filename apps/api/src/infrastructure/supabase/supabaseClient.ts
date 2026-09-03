/**
 * Server-Side Supabase Client & RPC Orchestrator.
 * Connects to Supabase PostgreSQL using service-role authorization.
 * Supports ACID credit holds, captures, grants, and multi-tenant workspace operations.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverConfig } from "../../config/env.js";

let adminClient: SupabaseClient | null = null;

/**
 * Returns a privileged Supabase Admin client utilizing SUPABASE_SERVICE_ROLE_KEY.
 * Used exclusively for server-authoritative mutations (ledger, holds, payments).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;

  const url = serverConfig.supabaseUrl;
  const key = serverConfig.supabaseServiceRoleKey || serverConfig.supabaseAnonKey;

  if (!url || !key) {
    return null;
  }

  adminClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "public",
    },
  });

  return adminClient;
}

/**
 * Returns a Supabase client scoped to a user's JWT bearer token.
 * Respects all PostgreSQL Row Level Security (RLS) policies for the authenticated user.
 */
export function getSupabaseUserClient(accessToken: string): SupabaseClient | null {
  const url = serverConfig.supabaseUrl;
  const key = serverConfig.supabaseAnonKey;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Executes idempotent credit reservation for AI generation via stored procedure.
 */
export async function reserveCreditsForAi(params: {
  workspaceId: string;
  userId: string;
  amount: number;
  idempotencyKey: string;
  referenceId: string;
  description: string;
}): Promise<{
  success: boolean;
  holdId?: string;
  hold_id?: string;
  amountReserved?: number;
  available?: number;
  isReplay?: boolean;
  error?: string;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: false, error: "Database client is not configured." };
  }

  const { data, error } = await supabase.rpc("reserve_credits_for_ai", {
    p_workspace_id: params.workspaceId,
    p_user_id: params.userId,
    p_amount: params.amount,
    p_idempotency_key: params.idempotencyKey,
    p_reference_id: params.referenceId,
    p_description: params.description,
  });

  if (error) {
    console.error("reserveCreditsForAi RPC error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  return {
    success: Boolean(res?.success),
    holdId: res?.hold_id ?? res?.holdId,
    hold_id: res?.hold_id ?? res?.holdId,
    amountReserved: res?.amount_reserved ?? res?.amountReserved,
    available: res?.available,
    required: res?.required,
    error: res?.error,
  } as any;
}

/**
 * Captures a credit hold after successful AI generation, settling it to the credit_ledger.
 */
export async function captureCreditHold(params: {
  holdId: string;
  idempotencyKey: string;
}): Promise<{
  success: boolean;
  newBalance?: number;
  new_balance?: number;
  ledgerId?: string;
  isReplay?: boolean;
  error?: string;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (serverConfig.nodeEnv === "development") {
      return { success: true, newBalance: 40, new_balance: 40, ledgerId: `mock_ledger_${Date.now()}` };
    }
    return { success: false, error: "Database not configured" };
  }

  const { data, error } = await supabase.rpc("capture_credit_hold", {
    p_hold_id: params.holdId,
    p_idempotency_key: params.idempotencyKey,
  });

  if (error) {
    console.error("captureCreditHold RPC error:", error);
    return { success: false, error: error.message };
  }

  const res = data as any;
  const balanceVal = res?.new_balance ?? res?.newBalance;
  return {
    success: Boolean(res?.success),
    newBalance: balanceVal,
    new_balance: balanceVal,
    ledgerId: res?.ledger_id ?? res?.ledgerId,
    isReplay: res?.is_replay ?? res?.isReplay,
  };
}

/**
 * Releases a credit hold back to available balance when AI provider fails or times out.
 */
export async function releaseCreditHold(params: {
  holdId: string;
  reason: string;
}): Promise<{
  success: boolean;
  amountReleased?: number;
  error?: string;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: true, amountReleased: 0 };
  }

  const { data, error } = await supabase.rpc("release_credit_hold", {
    p_hold_id: params.holdId,
    p_reason: params.reason,
  });

  if (error) {
    console.error("releaseCreditHold RPC error:", error);
    return { success: false, error: error.message };
  }

  return data as any;
}

/**
 * Grants credits atomically upon payment fulfillment or administrative adjustment.
 */
export async function grantCredits(params: {
  workspaceId: string;
  actorUserId: string;
  amount: number;
  type: string;
  idempotencyKey: string;
  referenceId: string;
  description: string;
}): Promise<{
  success: boolean;
  newBalance?: number;
  ledgerId?: string;
  isReplay?: boolean;
  error?: string;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (serverConfig.nodeEnv === "development") {
      return { success: true, newBalance: 100, ledgerId: `mock_ledger_${Date.now()}` };
    }
    return { success: false, error: "Database not configured" };
  }

  const { data, error } = await supabase.rpc("grant_credits", {
    p_workspace_id: params.workspaceId,
    p_actor_user_id: params.actorUserId,
    p_amount: params.amount,
    p_type: params.type,
    p_idempotency_key: params.idempotencyKey,
    p_reference_id: params.referenceId,
    p_description: params.description,
  });

  if (error) {
    console.error("grantCredits RPC error:", error);
    return { success: false, error: error.message };
  }

  return data as any;
}
