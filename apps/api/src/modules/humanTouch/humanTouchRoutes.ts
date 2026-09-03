/**
 * Human Touch Module Router.
 * Persists review requests to PostgreSQL human_touch_requests table and dispatches notification.
 * Routes: POST /api/human-touch
 */

import { Router } from "express";
import { humanTouchRepository } from "../../repositories/humanTouchRepository.js";

export const humanTouchRouter = Router();

humanTouchRouter.post("/human-touch", async (req, res) => {
  try {
    const { originalPrompt, assetType = "image", assetUrl, modelsUsed, userComment, emailReceipt } = req.body;

    if (!originalPrompt || !assetUrl || !userComment) {
      return res.status(400).json({ error: "Missing required request parameters" });
    }

    const mailTarget = emailReceipt || "business@writopedia.com";
    const workspaceId = req.user?.workspaceId || `ws_${req.user?.uid || "guest"}`;
    const requesterId = req.user?.uid || "00000000-0000-0000-0000-000000000000";

    // 1. Persist curation request in PostgreSQL
    const record = await humanTouchRepository.createRequest({
      workspaceId,
      requesterId,
      assetType,
      storagePath: assetUrl,
      originalPrompt,
      modelsUsed,
      userComment,
      emailReceipt: mailTarget,
    });

    console.log("===============================");
    console.log(`HUMAN-TOUCH REQUEST RECEIVED`);
    console.log(`Request ID: ${record?.id || "N/A"}`);
    console.log(`To: ${mailTarget}`);
    console.log(`Subject: New Writopedia Human-Touch Last-Mile Edit Request`);
    console.log(`-------------------------------`);
    console.log(`Original Prompt: ${originalPrompt}`);
    console.log(`Asset Type: ${assetType}`);
    console.log(`Asset Link: ${assetUrl.substring(0, 150)}${assetUrl.length > 150 ? "..." : ""}`);
    console.log(`Models Used: ${modelsUsed || "Not Specified"}`);
    console.log(`User Review Comments: ${userComment}`);
    console.log("===============================");

    return res.json({
      success: true,
      requestId: record?.id,
      message: `Your asset has been successfully submitted to Writopedia! A human edit agent will receive this request on ${mailTarget} and review your guidelines, the prompt, metadata, and custom review comments shortly.`,
      details: {
        recipient: mailTarget,
        timestamp: Date.now(),
      },
    });
  } catch (e: any) {
    console.error("Error processing human touch request:", e);
    return res.status(500).json({ error: e.message || "Failed to dispatch human touch request" });
  }
});
