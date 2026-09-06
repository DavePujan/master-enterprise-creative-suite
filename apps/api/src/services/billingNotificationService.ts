/**
 * Billing & Webhook Email Notification Service.
 * Dispatches branded transactional receipts upon successful payment fulfillment via Resend API.
 * Adheres strictly to the Writopedia design system: Deep Obsidian (#090d16), Slate (#0f172a / #182235), and Brand Crimson (#dd1a46).
 */

export interface PaymentNotificationParams {
  orderId: string;
  paymentId?: string;
  planName: string;
  creditsGranted: number;
  amountSubunits: number;
  currency: string;
  customerEmail?: string;
  paymentMethod?: string;
  workspaceId: string;
  source: "webhook" | "client_verify";
}

export class BillingNotificationService {
  /**
   * Primary merchant alert email address where payment receipts and webhook alerts are delivered.
   */
  private get adminEmail(): string {
    return process.env.BILLING_ALERT_EMAIL || "writopedia.platform@gmail.com";
  }

  /**
   * Sender identity for Resend transactional emails.
   */
  private get fromEmail(): string {
    return process.env.RESEND_FROM_EMAIL || "Writopedia <onboarding@resend.dev>";
  }

  /**
   * Generates a branded, responsive HTML email receipt adhering strictly to the Writopedia theme.
   */
  public generateReceiptHtml(params: PaymentNotificationParams): string {
    const formattedAmount =
      params.currency === "INR"
        ? `₹${(params.amountSubunits / 100).toLocaleString("en-IN")}`
        : `$${(params.amountSubunits / 100).toFixed(2)}`;

    const dateStr = new Date().toUTCString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - Writopedia AI</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #070a11;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 12px; background-color: #070a11; color: #f8fafc; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  
  <!-- PREHEADER (Hidden preview text in email clients) -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #070a11; opacity: 0;">
    Your Writopedia workspace has been credited with +${params.creditsGranted} credits for ${params.planName}. Order ID: ${params.orderId}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
    <tr>
      <td align="center">
        <!-- MAIN CONTAINER (600px) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(221, 26, 70, 0.3); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(221, 26, 70, 0.1);">
          
          <!-- BRAND CRIMSON TOP ACCENT BAR -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #dd1a46 0%, #ee5b75 50%, #ba1235 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- HEADER SECTION -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center; background: radial-gradient(circle at 50% 0%, #1f0b12 0%, #0f172a 70%); border-bottom: 1px solid #1e293b;">
              <!-- WRITOPEDIA WORDMARK WITH CRIMSON GLOW -->
              <table border="0" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center">
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">
                      WRITOPEDIA <span style="color: #dd1a46;">AI</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <span style="font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #94a3b8; text-transform: uppercase;">
                      Enterprise Creative Suite &bull; Payment Receipt
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO ENTITLEMENT CARD -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141e33; border-radius: 12px; border: 1px solid #22324e; text-align: center;">
                <tr>
                  <td style="padding: 24px 20px;">
                    <!-- STATUS BADGE -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 12px;">
                      <tr>
                        <td style="background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 9999px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #34d399; text-transform: uppercase;">
                          &#10003; Payment Verified &bull; Balance Credited
                        </td>
                      </tr>
                    </table>

                    <!-- CREDITS GRANTED METRIC -->
                    <div style="font-size: 40px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1.1; margin: 8px 0;">
                      +${params.creditsGranted.toLocaleString("en-US")} <span style="font-size: 20px; font-weight: 700; color: #dd1a46; letter-spacing: 1px; vertical-align: middle;">CREDITS</span>
                    </div>

                    <div style="color: #94a3b8; font-size: 13px; font-weight: 500; margin-top: 6px;">
                      Allocated to Workspace <span style="font-family: 'JetBrains Mono', monospace; color: #cbd5e1; font-weight: 600;">${params.workspaceId}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TRANSACTION BREAKDOWN TABLE -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #111a2e; border-radius: 12px; border: 1px solid #1f2d47;">
                <tr>
                  <td style="padding: 8px 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; font-size: 13px;">
                      
                      <!-- PLAN -->
                      <tr style="border-bottom: 1px solid #1f2d47;">
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Purchased Plan</td>
                        <td style="padding: 12px 0; text-align: right; color: #ffffff; font-weight: 700;">
                          <span style="background-color: rgba(221, 26, 70, 0.15); color: #ee5b75; border: 1px solid rgba(221, 26, 70, 0.3); border-radius: 4px; padding: 2px 8px; font-size: 12px;">
                            ${params.planName}
                          </span>
                        </td>
                      </tr>

                      <!-- AMOUNT -->
                      <tr style="border-bottom: 1px solid #1f2d47;">
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Amount Paid</td>
                        <td style="padding: 12px 0; text-align: right; color: #ffffff; font-weight: 800; font-size: 15px;">
                          ${formattedAmount} <span style="color: #94a3b8; font-size: 12px; font-weight: 600;">${params.currency}</span>
                        </td>
                      </tr>

                      <!-- ORDER ID -->
                      <tr style="border-bottom: 1px solid #1f2d47;">
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Razorpay Order ID</td>
                        <td style="padding: 12px 0; text-align: right; font-family: 'JetBrains Mono', Consolas, monospace; color: #ee5b75; font-size: 12px; font-weight: 600;">
                          ${params.orderId}
                        </td>
                      </tr>

                      <!-- PAYMENT ID -->
                      ${params.paymentId ? `
                      <tr style="border-bottom: 1px solid #1f2d47;">
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Razorpay Payment ID</td>
                        <td style="padding: 12px 0; text-align: right; font-family: 'JetBrains Mono', Consolas, monospace; color: #cbd5e1; font-size: 12px;">
                          ${params.paymentId}
                        </td>
                      </tr>
                      ` : ""}

                      <!-- PAYMENT METHOD -->
                      <tr style="border-bottom: 1px solid #1f2d47;">
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Payment Method</td>
                        <td style="padding: 12px 0; text-align: right; color: #e2e8f0; font-weight: 600;">
                          ${params.paymentMethod || "Razorpay Gateway (Card / UPI / Netbanking)"}
                        </td>
                      </tr>

                      <!-- FULFILLMENT SOURCE -->
                      <tr style="border-bottom: 1px solid #1f2d47;">
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Fulfillment Channel</td>
                        <td style="padding: 12px 0; text-align: right; color: #e2e8f0; font-weight: 600;">
                          ${params.source === "webhook" ? "Server-to-Server Webhook (Automated)" : "Instant Cryptographic Client Verify"}
                        </td>
                      </tr>

                      <!-- DATE & TIME -->
                      <tr>
                        <td style="padding: 12px 0; color: #94a3b8; font-weight: 500;">Receipt Date</td>
                        <td style="padding: 12px 0; text-align: right; color: #94a3b8; font-size: 12px;">
                          ${dateStr}
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PRIMARY ACTION BUTTON (CRIMSON THEME) -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://ai.writopedia.com/workspace" target="_blank" style="display: block; background: linear-gradient(135deg, #e52c4d 0%, #dd1a46 50%, #ba1235 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 8px; box-shadow: 0 6px 20px rgba(221, 26, 70, 0.4); text-transform: uppercase;">
                      Open Writopedia AI Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SUPPORT & ENTERPRISE INVOICE CARD -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b1120; border-radius: 8px; border: 1px dashed #24344d; text-align: center;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                    Need a custom GSTIN tax invoice or corporate accounting receipt?<br>
                    Email our enterprise finance team at <a href="mailto:business@writopedia.com" style="color: #ee5b75; text-decoration: none; font-weight: 600;">business@writopedia.com</a>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; text-align: center; border-top: 1px solid #1e293b; background-color: #090d16;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: 500;">
                &copy; 2026 Writopedia AI Inc. &bull; All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.4;">
                Secured via Razorpay 256-bit SSL Gateway &amp; Supabase PostgreSQL Atomic Ledger.<br>
                This automated payment confirmation was dispatched to ${this.adminEmail}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
  }

  /**
   * Dispatches a payment success email notification.
   */
  async notifyPaymentSuccess(params: PaymentNotificationParams): Promise<void> {
    const formattedAmount =
      params.currency === "INR"
        ? `₹${(params.amountSubunits / 100).toLocaleString("en-IN")}`
        : `$${(params.amountSubunits / 100).toFixed(2)}`;

    const targetMerchant = this.adminEmail;
    const targetCustomer = params.customerEmail || targetMerchant;

    console.log("=================================================================");
    console.log("✉️  BILLING TRANSACTION DISPATCH - PAYMENT RECEIPT & WEBHOOK ALERT");
    console.log(`Source         : ${params.source.toUpperCase()}`);
    console.log(`To (Merchant)  : ${targetMerchant}`);
    console.log(`To (Customer)  : ${targetCustomer}`);
    console.log(`Subject        : [Writopedia] Payment Received: ${params.planName} (${formattedAmount})`);
    console.log(`-----------------------------------------------------------------`);
    console.log(`Plan Purchased : ${params.planName}`);
    console.log(`Credits Added  : +${params.creditsGranted} Credits`);
    console.log(`Total Paid     : ${formattedAmount} ${params.currency}`);
    console.log(`Order ID       : ${params.orderId}`);
    console.log(`Payment ID     : ${params.paymentId || "Pending capture confirmation"}`);
    console.log(`Method         : ${params.paymentMethod || "Razorpay Gateway"}`);
    console.log(`Workspace ID   : ${params.workspaceId}`);
    console.log(`Timestamp      : ${new Date().toISOString()}`);
    console.log("=================================================================");

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return;
    }

    try {
      const isTestSender = this.fromEmail.includes("onboarding@resend.dev");
      // Onboarding domain on Resend free tier can only deliver to the verified account owner email
      const toRecipients = isTestSender ? [targetMerchant] : Array.from(new Set([targetMerchant, targetCustomer]));

      const htmlContent = this.generateReceiptHtml(params);

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: toRecipients,
          subject: `[Writopedia] Payment Confirmed: ${params.planName} (${formattedAmount})`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`[BillingNotificationService] Resend API error (${response.status}):`, errorBody);
      } else {
        const data = await response.json();
        console.log(`[BillingNotificationService] ✅ Real email delivered to ${toRecipients.join(", ")} via Resend (Message ID: ${data?.id})`);
      }
    } catch (emailErr: any) {
      console.warn("[BillingNotificationService] Failed to send email via Resend:", emailErr.message);
    }
  }
}

export const billingNotificationService = new BillingNotificationService();
