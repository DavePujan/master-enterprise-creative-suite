/**
 * Payment & Billing Audit Repository.
 * Direct persistence interface to public.payments table with state machine validation.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_refunded";

export interface PaymentRecord {
  id: string;
  workspaceId: string;
  userId: string;
  orderId: string;
  paymentId?: string;
  providerEventId?: string;
  signature?: string;
  planId: string;
  amountSubunits: number;
  currency: string;
  status: PaymentStatus;
  isSimulated: boolean;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permitted status transitions for payments state machine.
 */
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  created: ["created", "authorized", "captured", "failed", "expired"],
  authorized: ["authorized", "captured", "failed", "expired"],
  captured: ["captured", "refunded", "partially_refunded"],
  failed: ["failed"],
  expired: ["expired"],
  refunded: ["refunded"],
  partially_refunded: ["partially_refunded", "refunded"],
};

export class PaymentRepository {
  /**
   * Validates if a transition from current status to next status is permitted.
   */
  isValidTransition(current: PaymentStatus, next: PaymentStatus): boolean {
    const allowed = ALLOWED_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
  }

  async create(record: {
    workspaceId: string;
    userId: string;
    orderId: string;
    planId: string;
    amountSubunits: number;
    currency?: string;
    isSimulated?: boolean;
    idempotencyKey?: string;
  }): Promise<PaymentRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        workspace_id: record.workspaceId,
        user_id: record.userId,
        order_id: record.orderId,
        plan_id: record.planId,
        amount_subunits: record.amountSubunits,
        currency: record.currency || "USD",
        status: "created",
        is_simulated: Boolean(record.isSimulated),
        idempotency_key: record.idempotencyKey || `order_${record.orderId}`,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("PaymentRepository.create error:", error);
      return null;
    }

    return this.mapRow(data);
  }

  async updateStatus(params: {
    orderId: string;
    paymentId?: string;
    signature?: string;
    status: PaymentStatus;
    providerEventId?: string;
  }): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return true;

    // Check existing state to enforce valid transition
    const existing = await this.getByOrderId(params.orderId);
    if (existing) {
      if (!this.isValidTransition(existing.status, params.status)) {
        console.warn(
          `PaymentRepository: Rejected illegal status transition from "${existing.status}" to "${params.status}" for order ${params.orderId}`
        );
        return false;
      }
      // Idempotent no-op if status is identical
      if (existing.status === params.status && existing.paymentId === params.paymentId) {
        return true;
      }
    }

    const updates: Record<string, any> = {
      status: params.status,
      updated_at: new Date().toISOString(),
    };
    if (params.paymentId) updates.payment_id = params.paymentId;
    if (params.signature) updates.signature = params.signature;
    if (params.providerEventId) updates.provider_event_id = params.providerEventId;

    const { error } = await supabase
      .from("payments")
      .update(updates)
      .eq("order_id", params.orderId);

    if (error) {
      console.error("PaymentRepository.updateStatus error:", error);
      return false;
    }

    return true;
  }

  async getByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async getByPaymentId(paymentId: string): Promise<PaymentRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async getByProviderEventId(eventId: string): Promise<PaymentRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapRow(data);
  }

  async expireStaleOrders(olderThanHours: number = 24): Promise<number> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return 0;

    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "created")
      .lt("created_at", cutoff)
      .select("id");

    if (error) {
      console.error("PaymentRepository.expireStaleOrders error:", error);
      return 0;
    }

    return data ? data.length : 0;
  }

  private mapRow(data: any): PaymentRecord {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      userId: data.user_id,
      orderId: data.order_id,
      paymentId: data.payment_id,
      providerEventId: data.provider_event_id,
      signature: data.signature,
      planId: data.plan_id,
      amountSubunits: data.amount_subunits,
      currency: data.currency,
      status: data.status,
      isSimulated: Boolean(data.is_simulated),
      idempotencyKey: data.idempotency_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const paymentRepository = new PaymentRepository();
