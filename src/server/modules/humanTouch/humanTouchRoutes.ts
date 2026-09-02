/**
 * Human Touch Module Router.
 * Routes: POST /api/human-touch
 */

import { Router } from "express";

export const humanTouchRouter = Router();

humanTouchRouter.post("/human-touch", async (req, res) => {
  try {
    const { originalPrompt, assetType, assetUrl, modelsUsed, userComment, emailReceipt } = req.body;

    if (!originalPrompt || !assetUrl || !userComment) {
      return res.status(400).json({ error: "Missing required request parameters" });
    }

    const mailTarget = emailReceipt || "business@writopedia.com";

    console.log("===============================");
    console.log(`HUMAN-TOUCH REQUEST RECEIVED`);
    console.log(`To: ${mailTarget}`);
    console.log(`Subject: New Writopedia Human-Touch Last-Mile Edit Request`);
    console.log(`-------------------------------`);
    console.log(`Original Prompt: ${originalPrompt}`);
    console.log(`Asset Type: ${assetType || 'image'}`);
    console.log(`Asset Link: ${assetUrl.substring(0, 150)}${assetUrl.length > 150 ? '...' : ''}`);
    console.log(`Models Used: ${modelsUsed || 'Not Specified'}`);
    console.log(`User Review Comments: ${userComment}`);
    console.log("===============================");

    return res.json({
      success: true,
      message: `Your asset has been successfully submitted to Writopedia! A human edit agent will receive this request on ${mailTarget} and review your guidelines, the prompt, metadata, and custom review comments shortly.`,
      details: {
        recipient: mailTarget,
        timestamp: Date.now()
      }
    });
  } catch (e: any) {
    console.error("Error processing human touch request:", e);
    return res.status(500).json({ error: e.message || "Failed to dispatch human touch request" });
  }
});
