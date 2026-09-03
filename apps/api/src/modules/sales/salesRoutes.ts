/**
 * Sales Inquiry Module Router.
 * Routes: POST /api/contact-sales
 */

import { Router } from "express";

export const salesRouter = Router();

salesRouter.post(["/", "/contact-sales"], async (req, res) => {
  try {
    const { companyName, contactName, email, teamSize, message } = req.body;

    if (!companyName || !contactName || !email || !teamSize || !message) {
      return res.status(400).json({ error: "Missing required sales query parameters" });
    }

    const mailTarget = "business@writopedia.com";

    console.log("=================================================================");
    console.log(`✉️ EMAIL DISPATCH SIMULATOR - ENTERPRISE SALES LEAD`);
    console.log(`To: ${mailTarget}`);
    console.log(`From: noreply@writopedia.com`);
    console.log(`Subject: New Enterprise Query - ${companyName}`);
    console.log(`-----------------------------------------------------------------`);
    console.log(`Contact Person : ${contactName}`);
    console.log(`Contact Email  : ${email}`);
    console.log(`Company / Brand: ${companyName}`);
    console.log(`Est. Team Size : ${teamSize}`);
    console.log(`Message Details:`);
    console.log(`"${message}"`);
    console.log("=================================================================");

    return res.json({
      success: true,
      message: `Your custom sales request has been successfully dispatched to ${mailTarget}. Our enterprise relations managers will follow up soon!`,
      details: {
        recipient: mailTarget,
        timestamp: Date.now()
      }
    });
  } catch (e: any) {
    console.error("Error processing contact sales request:", e);
    return res.status(500).json({ error: e.message || "Failed to dispatch sales query" });
  }
});
