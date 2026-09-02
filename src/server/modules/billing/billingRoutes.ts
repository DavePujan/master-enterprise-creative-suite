/**
 * Billing Module Router: Razorpay Order Creation & Verification.
 * Routes: POST /api/payment/razorpay-order, POST /api/payment/razorpay-verify
 */

import { Router } from "express";
import { createRazorpayOrder, verifyRazorpaySignature } from "../../infrastructure/payment/razorpayClient.js";

export const billingRouter = Router();

billingRouter.post("/razorpay-order", async (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Amount parameters are required" });
    }

    const orderResult = await createRazorpayOrder(amount, currency);
    return res.json(orderResult);
  } catch (err: any) {
    console.error("Razorpay checkout order exception:", err);
    return res.status(500).json({ error: err.message || "Failed to register checkout order" });
  }
});

billingRouter.post("/razorpay-verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(405).json({ error: "Required verification parameters missing" });
    }

    const verifyResult = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (verifyResult.verified) {
      return res.json(verifyResult);
    } else {
      return res.status(400).json({ error: "Invalid payment signature verification failed" });
    }
  } catch (err: any) {
    console.error("Razorpay signature verification exception:", err);
    return res.status(500).json({ error: err.message || "Failed to authenticate signatures" });
  }
});
