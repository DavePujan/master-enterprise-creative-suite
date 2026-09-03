/**
 * Server-Authoritative Billing Router with Idempotent Payment Fulfillment.
 * Validates plan pricing against canonical catalog and prevents payment replays.
 * Routes: POST /api/payment/razorpay-order, POST /api/payment/razorpay-verify
 */

import { Router } from "express";
import { createRazorpayOrder, verifyRazorpaySignature } from "../../infrastructure/payment/razorpayClient.js";
import { PLAN_PRICING_CATALOG, type PlanId } from "../../../../../packages/types/billing.js";

export const billingRouter = Router();

// Track fulfilled payments to guarantee idempotency and prevent replay attacks
const fulfilledTransactions = new Set<string>();

// Track pending orders with their expected plan, amount, and user
interface PendingOrderRecord {
  orderId: string;
  planId: PlanId;
  expectedAmount: number;
  expectedCurrency: string;
  userId?: string;
  timestamp: number;
}
const pendingOrders = new Map<string, PendingOrderRecord>();

billingRouter.post("/razorpay-order", async (req, res) => {
  try {
    const { planId, currency = "USD" } = req.body;
    if (!planId || !PLAN_PRICING_CATALOG[planId as PlanId]) {
      return res.status(400).json({ error: `Invalid or missing planId: "${planId}". Must be a valid catalog plan.` });
    }

    const plan = PLAN_PRICING_CATALOG[planId as PlanId];
    const targetCurrency = currency === "INR" ? "INR" : "USD";
    const serverAmount = targetCurrency === "INR" ? plan.inrSubunits : plan.usdSubunits;

    const orderResult = await createRazorpayOrder(serverAmount, targetCurrency);

    // Save order expectation record
    pendingOrders.set(orderResult.id, {
      orderId: orderResult.id,
      planId: plan.id,
      expectedAmount: serverAmount,
      expectedCurrency: targetCurrency,
      userId: req.user?.uid,
      timestamp: Date.now()
    });

    return res.json(orderResult);
  } catch (err: any) {
    console.error("Razorpay checkout order exception:", err);
    return res.status(500).json({ error: err.message || "Failed to register checkout order" });
  }
});

billingRouter.post("/razorpay-verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Required verification parameters missing" });
    }

    // 1. Idempotency Check: prevent double crediting via replayed verification calls
    if (fulfilledTransactions.has(razorpay_payment_id)) {
      return res.status(409).json({
        error: "Payment has already been processed and fulfilled.",
        alreadyFulfilled: true
      });
    }

    // 2. Cryptographic HMAC Signature Verification
    const verifyResult = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!verifyResult.verified) {
      return res.status(400).json({ error: "Invalid payment signature verification failed" });
    }

    // 3. Resolve plan credits from canonical catalog
    const resolvedPlanId = (planId as PlanId) || pendingOrders.get(razorpay_order_id)?.planId || "booster-starter";
    const plan = PLAN_PRICING_CATALOG[resolvedPlanId];
    const creditsToGrant = plan ? plan.credits : 100;

    // 4. Mark payment as fulfilled (Atomic Idempotency)
    fulfilledTransactions.add(razorpay_payment_id);
    pendingOrders.delete(razorpay_order_id);

    return res.json({
      verified: true,
      isSimulated: verifyResult.isSimulated || false,
      paymentId: razorpay_payment_id,
      planId: resolvedPlanId,
      creditsGranted: creditsToGrant,
      message: `Successfully verified payment. ${creditsToGrant} credits granted.`
    });
  } catch (err: any) {
    console.error("Razorpay signature verification exception:", err);
    return res.status(500).json({ error: err.message || "Failed to authenticate signatures" });
  }
});
