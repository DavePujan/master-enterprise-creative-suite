/**
 * Server-Authoritative Billing Router with Idempotent Payment Fulfillment.
 * Delegates business logic to BillingService and persistence to PaymentRepository.
 * Routes: POST /api/payment/razorpay-order, POST /api/payment/razorpay-verify
 */

import { Router } from "express";
import { billingService } from "../../services/billingService.js";
import { PLAN_PRICING_CATALOG, type PlanId } from "../../../../../packages/types/billing.js";

export const billingRouter = Router();

billingRouter.post("/razorpay-order", async (req, res) => {
  try {
    const { planId, currency = "USD" } = req.body;
    if (!planId || !PLAN_PRICING_CATALOG[planId as PlanId]) {
      return res.status(400).json({ error: `Invalid or missing planId: "${planId}". Must be a valid catalog plan.` });
    }

    const workspaceId = req.user?.workspaceId || `ws_${req.user?.uid || "dev"}`;
    const userId = req.user?.uid || "dev_local_user";

    const orderResult = await billingService.createOrder({
      workspaceId,
      userId,
      planId: planId as PlanId,
      currency,
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

    const workspaceId = req.user?.workspaceId || `ws_${req.user?.uid || "dev"}`;
    const userId = req.user?.uid || "dev_local_user";
    const resolvedPlanId = (planId as PlanId) || "booster-starter";

    const fulfillment = await billingService.verifyAndFulfillPayment({
      workspaceId,
      userId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      planId: resolvedPlanId,
    });

    if (fulfillment.alreadyFulfilled) {
      return res.status(409).json({
        error: "Payment has already been processed and fulfilled.",
        alreadyFulfilled: true,
      });
    }

    if (!fulfillment.success) {
      return res.status(400).json({ error: fulfillment.error || "Payment verification failed" });
    }

    const plan = PLAN_PRICING_CATALOG[resolvedPlanId];
    const creditsToGrant = plan ? plan.credits : 100;

    return res.json({
      verified: true,
      paymentId: razorpay_payment_id,
      planId: resolvedPlanId,
      creditsGranted: creditsToGrant,
      newBalance: fulfillment.newBalance,
      message: `Successfully verified payment. ${creditsToGrant} credits granted.`,
    });
  } catch (err: any) {
    console.error("Razorpay signature verification exception:", err);
    return res.status(500).json({ error: err.message || "Failed to authenticate signatures" });
  }
});
