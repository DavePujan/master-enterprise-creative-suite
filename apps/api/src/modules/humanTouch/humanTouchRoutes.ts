/**
 * Human Touch Module Router.
 * Persists review requests to PostgreSQL human_touch_requests table and dispatches notification.
 * Strictly production-oriented: requires authenticated session and authoritative workspace.
 * Routes: POST /api/human-touch
 */

import { Router } from "express";
import { humanTouchRepository } from "../../repositories/humanTouchRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import { assetRepository } from "../../repositories/assetRepository.js";
import { getSupabaseAdmin } from "../../infrastructure/supabase/supabaseClient.js";

export const humanTouchRouter = Router();

humanTouchRouter.post("/human-touch", async (req, res) => {
  try {
    const { originalPrompt, assetType = "image", assetUrl, modelsUsed, userComment, emailReceipt } = req.body;

    if (!originalPrompt || !assetUrl || !userComment) {
      return res.status(400).json({ error: "Missing required request parameters" });
    }

    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: User session required." });
    }

    const mailTarget = emailReceipt || "business@writopedia.com";
    const requesterId = req.user.uid;
    const workspaceId =
      req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(requesterId, req.user.email || ""));

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

    if (!record) {
      return res.status(500).json({ error: "Failed to persist human touch request in database" });
    }

    console.log("===============================");
    console.log(`HUMAN-TOUCH REQUEST RECEIVED`);
    console.log(`Request ID: ${record.id}`);
    console.log(`To: ${mailTarget}`);
    console.log(`Subject: New Writopedia Human-Touch Last-Mile Edit Request`);
    console.log(`-------------------------------`);
    console.log(`Original Prompt: ${originalPrompt}`);
    console.log(`Asset Type: ${assetType}`);
    console.log(`Asset Link: ${assetUrl.substring(0, 150)}${assetUrl.length > 150 ? "..." : ""}`);
    console.log(`Models Used: ${modelsUsed || "Not Specified"}`);
    console.log(`User Review Comments: ${userComment}`);
    console.log("===============================");

    // 2. Dispatch real notification email to writopedia.platform@gmail.com via Resend
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Writopedia <onboarding@resend.dev>";
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = "writopedia.platform@gmail.com";

    if (resendApiKey) {
      try {
        const isTestSender = fromEmail.includes("onboarding@resend.dev");
        const toRecipients = isTestSender ? [adminEmail] : Array.from(new Set([adminEmail, mailTarget]));

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Human Touch Creative Refinement Request</title>
</head>
<body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Accent Bar -->
    <div style="height: 4px; background: #e11d48;"></div>

    <!-- Header -->
    <div style="padding: 24px 28px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #e11d48; text-transform: uppercase;">
              HUMAN TOUCH &bull; PRODUCTION WORK ORDER
            </span>
            <h2 style="margin: 4px 0 0 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
              New Creative Refinement Request
            </h2>
          </td>
          <td align="right" valign="top">
            <span style="background-color: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-family: monospace; font-weight: 700;">
              PENDING
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px;">
      
      <!-- Requested Adjustments Card -->
      <div style="background-color: #f8fafc; border-left: 4px solid #e11d48; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 6px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          What the Artist Should Change (Client Instructions):
        </p>
        <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; font-style: italic; white-space: pre-wrap;">
          "${userComment}"
        </p>
      </div>

      <!-- Specs Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">Work Order ID:</td>
          <td style="padding: 10px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${record.id}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Client Account:</td>
          <td style="padding: 10px 0; color: #0f172a;">${req.user.email || "Authenticated Client"}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Receipt Target:</td>
          <td style="padding: 10px 0; color: #0f172a;"><a href="mailto:${mailTarget}" style="color: #e11d48; text-decoration: none;">${mailTarget}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Asset Media Type:</td>
          <td style="padding: 10px 0; color: #0f172a; text-transform: uppercase; font-weight: 700;">${assetType}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Model Engine:</td>
          <td style="padding: 10px 0; color: #0f172a;">${modelsUsed || "Default Production Ensemble"}</td>
        </tr>
      </table>

      <!-- Original Prompt -->
      <div style="margin-bottom: 24px;">
        <p style="margin: 0 0 6px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Original Generation Prompt:
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 12px; font-family: monospace; color: #334155; line-height: 1.5; word-break: break-word;">
          ${originalPrompt}
        </div>
      </div>

      <!-- Source Creative Thumbnail / Link -->
      <div style="margin-bottom: 28px;">
        <p style="margin: 0 0 6px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Source Creative Asset:
        </p>
        ${(assetType === "image" || assetUrl.includes(".png") || assetUrl.includes(".jpg") || assetUrl.includes(".webp")) ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc; text-align: center; margin-bottom: 8px;">
            <img src="${assetUrl}" alt="Source Creative" style="max-width: 100%; max-height: 320px; display: inline-block; vertical-align: middle;" />
          </div>
        ` : ""}
        <a href="${assetUrl}" target="_blank" style="color: #e11d48; font-size: 12px; font-weight: 600; text-decoration: none; word-break: break-all;">
          Open Raw Deliverable Source &rarr;
        </a>
      </div>

      <!-- CTA Button to Open Admin Panel -->
      <div style="text-align: center; padding-top: 8px; margin-bottom: 24px;">
        <a href="https://ai.writopedia.com/workspace" target="_blank" style="display: inline-block; background: #e11d48; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; padding: 12px 24px; border-radius: 6px; text-transform: uppercase;">
          Open Admin Curation Desk &rarr;
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">
          Writopedia Creative Operations &bull; Automated notification sent to ${adminEmail}
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: toRecipients,
            subject: `[Human Touch] New Creative Refinement Request (${record.id.slice(0, 8)})`,
            html: htmlContent,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`[HumanTouchRoutes] Resend API error (${response.status}):`, errorBody);
        } else {
          const data = (await response.json()) as any;
          console.log(`[HumanTouchRoutes] ✅ Real Human Touch email delivered to ${toRecipients.join(", ")} via Resend (ID: ${data?.id})`);
        }
      } catch (emailErr: any) {
        console.warn("[HumanTouchRoutes] Failed to dispatch Resend email notification:", emailErr?.message || emailErr);
      }
    }

    return res.json({
      success: true,
      requestId: record.id,
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

humanTouchRouter.get("/human-touch/queue", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: User session required." });
    }

    const userId = req.user.uid;
    const userEmail = req.user.email || "";
    const isAdmin = Boolean(req.user.admin);

    const limit = parseInt(req.query.limit as string, 10) || 50;

    // If admin explicitly requested global queue, list all requests
    if (req.query.scope === "all" && isAdmin) {
      const requests = await humanTouchRepository.listAll(limit);
      return res.json({ success: true, requests });
    }

    // Default: Strictly scoped to the user's active workspace
    const workspaceId =
      req.user.workspaceId || (await workspaceRepository.ensurePersonalWorkspace(userId, userEmail));

    const requests = await humanTouchRepository.listByWorkspace(workspaceId, limit);
    return res.json({ success: true, requests });
  } catch (e: any) {
    console.error("Error fetching human touch queue:", e);
    return res.status(500).json({ error: e.message || "Failed to fetch human touch queue" });
  }
});

humanTouchRouter.patch("/human-touch/:id", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: User session required." });
    }

    const { id } = req.params;
    const { status, completedAssetUrl, completedStoragePath, completedComment } = req.body;

    const existing = await humanTouchRepository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: "Human touch request not found" });
    }

    const userEmail = req.user.email || "";
    const isAdmin = Boolean(req.user.admin);

    // Only authorized admins or the workspace owner can update status
    if (!isAdmin && existing.requesterId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden: Not authorized to update this curation request" });
    }

    // State machine validation
    const validStatuses = ["pending", "in_review", "completed", "rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    // Deliverable asset check on completion
    const finalDeliverableUrl =
      completedStoragePath || completedAssetUrl || req.body.deliverableDataUrl || existing.completedStoragePath;
    if (status === "completed" && !finalDeliverableUrl) {
      return res.status(400).json({
        error: "Cannot mark request as completed: a deliverable asset file must be uploaded first.",
      });
    }

    const wasAlreadyCompleted = existing.status === "completed";

    const updated = await humanTouchRepository.updateStatus(id, {
      status: status || existing.status,
      completedStoragePath: finalDeliverableUrl,
      completedComment: completedComment !== undefined ? completedComment : existing.completedComment,
      assignedCuratorId: isAdmin ? req.user.uid : existing.assignedCuratorId,
    });

    if (!updated) {
      return res.status(500).json({ error: "Failed to update human touch request" });
    }

    console.log(`[HumanTouch] Request ${id} updated to status: ${updated.status} by ${req.user.email}`);

    let assetSaved = false;
    let emailDispatched = false;
    let emailError: string | null = null;

    // Actions on successful completion (idempotent: only trigger if freshly transitioned to completed)
    if (status === "completed" && !wasAlreadyCompleted) {
      // 1. Auto-save deliverable to client's Asset Library
      try {
        await assetRepository.create({
          workspaceId: existing.workspaceId,
          uploadedBy: existing.requesterId,
          name: `Human Touch Deliverable (${existing.id.slice(0, 8)})`,
          storagePath: finalDeliverableUrl!,
          type: ((existing.assetType ? existing.assetType.toLowerCase() : "image") as any),
          prompt: existing.originalPrompt,
        });
        assetSaved = true;
        console.log(`[HumanTouch] Curated asset saved to workspace ${existing.workspaceId} asset library.`);
      } catch (assetErr: any) {
        console.warn("[HumanTouch] Failed to auto-save deliverable to user asset library:", assetErr?.message || assetErr);
      }

      // 2. Dispatch Completion Notification Email to requester (lookup actual requester profile if needed)
      let recipientEmail = existing.emailReceipt;
      if (!recipientEmail || recipientEmail === "business@writopedia.com") {
        const supabase = getSupabaseAdmin();
        if (supabase && existing.requesterId) {
          const { data: requesterProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", existing.requesterId)
            .maybeSingle();
          if (requesterProfile?.email) {
            recipientEmail = requesterProfile.email;
          }
        }
      }
      if (!recipientEmail && !isAdmin) {
        recipientEmail = userEmail;
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Writopedia <notifications@writopedia.com>";

      if (resendApiKey && recipientEmail) {
        try {
          const isTestSender = fromEmail.includes("onboarding@resend.dev");
          // Onboarding domain only sends to verified account email on free tier
          const toRecipients = isTestSender ? ["writopedia.platform@gmail.com"] : [recipientEmail];

          const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Writopedia Human Touch request is complete</title>
</head>
<body style="margin: 0; padding: 24px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Accent Bar: Brand Emerald on Completion -->
    <div style="height: 4px; background: #10b981;"></div>

    <!-- Header -->
    <div style="padding: 24px 28px; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #10b981; text-transform: uppercase;">
              HUMAN TOUCH &bull; DELIVERABLE READY
            </span>
            <h2 style="margin: 4px 0 0 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">
              Your Creative Request is Complete
            </h2>
          </td>
          <td align="right" valign="top">
            <span style="background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-family: monospace; font-weight: 700;">
              COMPLETED
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px;">
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.5;">
        Hi,
      </p>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #334155; line-height: 1.5;">
        Your Human Touch creative request (<strong>#${existing.id.slice(0, 8)}</strong>) has been reviewed and finished by the Writopedia creative team. Your final deliverable is ready in your workspace.
      </p>

      <!-- Artist Notes Card -->
      ${(completedComment || updated.completedComment) ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #10b981; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 6px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Artist Completion Notes:
        </p>
        <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; font-style: italic;">
          "${completedComment || updated.completedComment}"
        </p>
      </div>
      ` : ""}

      <!-- Requested Adjustments Review -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Requested Adjustments:
        </p>
        <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
          ${existing.userComment}
        </p>
      </div>

      <!-- Deliverable Preview / Link -->
      <div style="margin-bottom: 28px;">
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Completed Creative Deliverable:
        </p>
        ${(existing.assetType === "image" || finalDeliverableUrl!.includes(".png") || finalDeliverableUrl!.includes(".jpg") || finalDeliverableUrl!.includes(".webp")) ? `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc; text-align: center; margin-bottom: 8px;">
            <img src="${finalDeliverableUrl}" alt="Completed Creative Deliverable" style="max-width: 100%; max-height: 340px; display: inline-block; vertical-align: middle;" />
          </div>
        ` : ""}
        <a href="https://ai.writopedia.com/assets" target="_blank" style="color: #e11d48; font-size: 12px; font-weight: 600; text-decoration: none; word-break: break-all;">
          View & Download Deliverable in Asset Library &rarr;
        </a>
      </div>

      <!-- Primary Action Button -->
      <div style="text-align: center; padding-top: 8px; margin-bottom: 24px;">
        <a href="https://ai.writopedia.com/workspace" target="_blank" style="display: inline-block; background: #e11d48; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 6px; text-transform: uppercase; box-shadow: 0 2px 8px rgba(225, 29, 72, 0.2);">
          Open in Writopedia Studio &rarr;
        </a>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
        <p style="margin: 0 0 4px 0; color: #64748b; font-size: 12px;">
          Thank you,<br><strong>Writopedia Creative Team</strong>
        </p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">
          Writopedia Enterprise Creative Suite &bull; Dispatched to ${recipientEmail}
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: toRecipients,
              subject: `Your Writopedia Human Touch request is complete (#${existing.id.slice(0, 8)})`,
              html: htmlContent,
            }),
          });

          if (!response.ok) {
            const errBody = await response.text();
            emailError = errBody;
            console.warn(`[HumanTouch] Resend completion email API error (${response.status}):`, errBody);
          } else {
            const data = (await response.json()) as any;
            emailDispatched = true;
            console.log(`[HumanTouch] ✅ Real completion email delivered to ${toRecipients.join(", ")} (ID: ${data?.id})`);
          }
        } catch (err: any) {
          emailError = err?.message || String(err);
          console.warn("[HumanTouch] Failed to dispatch completion email:", emailError);
        }
      }
    }

    return res.json({
      success: true,
      request: updated,
      assetSaved,
      emailDispatched,
      emailError,
    });
  } catch (e: any) {
    console.error("Error updating human touch request:", e);
    return res.status(500).json({ error: e.message || "Failed to update human touch request" });
  }
});

// Admin-only retry notification endpoint
humanTouchRouter.post("/human-touch/:id/notify-retry", async (req, res) => {
  try {
    if (!req.user || !req.user.admin) {
      return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
    }

    const { id } = req.params;
    const existing = await humanTouchRepository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: "Human touch request not found" });
    }

    if (existing.status !== "completed") {
      return res.status(400).json({ error: "Can only send completion notifications for completed requests." });
    }

    const recipientEmail = existing.emailReceipt;
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Writopedia <onboarding@resend.dev>";

    if (!resendApiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY is not configured on the server." });
    }

    const isTestSender = fromEmail.includes("onboarding@resend.dev");
    const toRecipients = isTestSender ? ["writopedia.platform@gmail.com"] : [recipientEmail];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toRecipients,
        subject: `Your Writopedia Human Touch request is complete (#${existing.id.slice(0, 8)})`,
        html: `<p>Your creative request #${existing.id.slice(0, 8)} is complete. View your deliverable at <a href="https://ai.writopedia.com/workspace">Writopedia Studio</a>.</p>`,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Resend error: ${errText}` });
    }

    const data = await response.json();
    return res.json({ success: true, message: `Notification re-sent to ${toRecipients.join(", ")}`, data });
  } catch (err: any) {
    console.error("Error in notify-retry:", err);
    return res.status(500).json({ error: err.message || "Failed to retry notification" });
  }
});

humanTouchRouter.post("/human-touch/:id/cancel", async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized: User session required." });
    }

    const { id } = req.params;
    const existing = await humanTouchRepository.getById(id);
    if (!existing) {
      return res.status(404).json({ error: "Human touch request not found" });
    }

    if (existing.requesterId !== req.user.uid && !req.user.admin) {
      return res.status(403).json({ error: "Forbidden: You can only cancel your own requests" });
    }

    if (existing.status !== "pending") {
      return res.status(400).json({ error: `Cannot cancel request in '${existing.status}' state` });
    }

    const cancelled = await humanTouchRepository.cancelRequest(id, existing.requesterId);
    if (!cancelled) {
      return res.status(500).json({ error: "Failed to cancel request" });
    }

    return res.json({ success: true, message: "Request cancelled successfully", request: cancelled });
  } catch (e: any) {
    console.error("Error cancelling human touch request:", e);
    return res.status(500).json({ error: e.message || "Failed to cancel request" });
  }
});

