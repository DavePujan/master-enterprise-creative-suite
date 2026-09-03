/**
 * Authoritative Credit Ledger & Balance Repository.
 * Direct persistence interface to PostgreSQL stored procedures and tables.
 */

import {
  getSupabaseAdmin,
  reserveCreditsForAi,
  captureCreditHold,
  releaseCreditHold,
  grantCredits,
} from "../infrastructure/supabase/supabaseClient.js";

export interface CreditBalanceRecord {
  workspaceId: string;
  balance: number;
  heldBalance: number;
  availableBalance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  updatedAt: string;
}

export class CreditRepository {
  /**
   * Retrieves the current balance and held balance for a workspace.
   */
  async getBalance(workspaceId: string): Promise<CreditBalanceRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("credit_balances")
      .select("*")
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      workspaceId: data.workspace_id,
      balance: data.balance,
      heldBalance: data.held_balance,
      availableBalance: data.balance - data.held_balance,
      lifetimeGranted: data.lifetime_granted,
      lifetimeSpent: data.lifetime_spent,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Reserves credits via atomic stored procedure.
   */
  async reserveHold(params: {
    workspaceId: string;
    userId: string;
    amount: number;
    idempotencyKey: string;
    referenceId: string;
    description: string;
  }) {
    return reserveCreditsForAi(params);
  }

  /**
   * Settles a hold to credit_ledger.
   */
  async captureHold(params: { holdId: string; idempotencyKey: string }) {
    return captureCreditHold(params);
  }

  /**
   * Voids a hold and restores available balance.
   */
  async releaseHold(params: { holdId: string; reason: string }) {
    return releaseCreditHold(params);
  }

  /**
   * Grants credits atomically upon payment fulfillment or admin top-up.
   */
  async grant(params: {
    workspaceId: string;
    actorUserId: string;
    amount: number;
    type: string;
    idempotencyKey: string;
    referenceId: string;
    description: string;
  }) {
    return grantCredits(params);
  }

  /**
   * Executes database-level expiry cleanup for stale holds.
   */
  async expireStaleHolds(): Promise<{
    success: boolean;
    expiredCount?: number;
    totalCreditsReleased?: number;
  }> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { success: true, expiredCount: 0, totalCreditsReleased: 0 };

    const { data, error } = await supabase.rpc("expire_stale_credit_holds");
    if (error) {
      console.error("expire_stale_credit_holds error:", error);
      return { success: false };
    }

    return data as any;
  }

  /**
   * Retrieves transaction history from immutable credit_ledger.
   */
  async getLedgerHistory(workspaceId: string, limit = 50): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("credit_ledger")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("CreditRepository.getLedgerHistory error:", error);
      return [];
    }

    return data || [];
  }
}

export const creditRepository = new CreditRepository();
