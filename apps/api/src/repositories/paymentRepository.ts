/**
 * Payment & Billing Audit Repository.
 * Direct persistence interface to public.payments table.
 */

import { getSupabaseAdmin } from "../infrastructure/supabase/supabaseClient.js";

export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
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

export class PaymentRepository {
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
      // Local dev fallback
      return {
        id: `pay_${Date.now()}`,
        workspaceId: record.workspaceId,
        userId: record.userId,
        orderId: record.orderId,
        planId: record.planId,
        amountSubunits: record.amountSubunits,
        currency: record.currency || "USD",
        status: "created",
        isSimulated: Boolean(record.isSimulated),
        idempotencyKey: record.idempotencyKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
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
        idempotency_key: record.idempotencyKey,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("PaymentRepository.create error:", error);
      return null;
    }

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
      isSimulated: data.is_simulated,
      idempotencyKey: data.idempotency_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
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

    const updates: any = {
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
      .single();

    if (error || !data) return null;

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
      isSimulated: data.is_simulated,
      idempotencyKey: data.idempotency_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const paymentRepository = new PaymentRepository();
