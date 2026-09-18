/**
 * Admin API Routes.
 * Serves endpoints backed authoritatively by PostgreSQL tables (human_touch_requests, payments, admin_settings, user_roles).
 * Enforces requireAdmin middleware across all routes.
 */

import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../../middleware/authMiddleware.js";
import { adminRepository } from "../../repositories/adminRepository.js";
import { humanTouchRepository } from "../../repositories/humanTouchRepository.js";
import { paymentRepository } from "../../repositories/paymentRepository.js";
import { getSupabaseAdmin } from "../../infrastructure/supabase/supabaseClient.js";

export const adminRouter = Router();

// Apply requireAdmin to all /api/admin routes
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/overview
 * Real operational metrics from PostgreSQL tables.
 */
adminRouter.get("/overview", async (req: Request, res: Response): Promise<void> => {
  try {
    const [curationMetrics, paymentMetrics] = await Promise.all([
      humanTouchRepository.getMetrics(),
      paymentRepository.getMetrics(),
    ]);

    const resendConfigured = Boolean(process.env.RESEND_API_KEY);
    const supabase = getSupabaseAdmin();
    let dbStatus = "connected";
    if (!supabase) {
      dbStatus = "disconnected";
    }

    res.json({
      success: true,
      curation: curationMetrics,
      payments: paymentMetrics,
      system: {
        dbStatus,
        resendConfigured,
        serverTime: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || "development",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load admin overview";
    console.error("GET /api/admin/overview error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

/**
 * GET /api/admin/payments
 * View & Audit payment transactions.
 */
adminRouter.get("/payments", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const status = req.query.status as string | undefined;

    const payments = await paymentRepository.listAll(limit, status);
    const metrics = await paymentRepository.getMetrics();

    res.json({
      success: true,
      payments,
      metrics,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load payments";
    console.error("GET /api/admin/payments error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

/**
 * GET /api/admin/activity
 * Real, auditable activity events across Curation, Payments, and System operations.
 */
adminRouter.get("/activity", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 40;
    const category = (req.query.category as string) || "all";

    const events: Array<{
      id: string;
      category: "curation" | "payment" | "system";
      actor: string;
      action: string;
      resourceId: string;
      status: string;
      timestamp: string;
      details?: string;
    }> = [];

    const supabase = getSupabaseAdmin();

    if (supabase && (category === "all" || category === "curation")) {
      const { data: curationRows } = await supabase
        .from("human_touch_requests")
        .select("id, email_receipt, status, asset_type, user_comment, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (curationRows) {
        for (const row of curationRows) {
          events.push({
            id: `cur_${row.id}`,
            category: "curation",
            actor: row.email_receipt || "Client",
            action: `Human Touch request (${row.asset_type}) is ${row.status}`,
            resourceId: row.id,
            status: row.status,
            timestamp: row.updated_at || row.created_at,
            details: row.user_comment ? `"${row.user_comment.slice(0, 80)}..."` : undefined,
          });
        }
      }
    }

    if (supabase && (category === "all" || category === "payment")) {
      const { data: paymentRows } = await supabase
        .from("payments")
        .select("id, order_id, plan_id, amount_subunits, currency, status, created_at, profiles:user_id(email)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (paymentRows) {
        for (const row of paymentRows) {
          const formattedAmount =
            row.currency === "INR"
              ? `₹${((row.amount_subunits || 0) / 100).toLocaleString("en-IN")}`
              : `$${((row.amount_subunits || 0) / 100).toFixed(2)}`;

          events.push({
            id: `pay_${row.id}`,
            category: "payment",
            actor: (row.profiles as any)?.email || "Customer",
            action: `Payment for ${row.plan_id} (${formattedAmount} ${row.currency}) — ${row.status}`,
            resourceId: row.order_id,
            status: row.status,
            timestamp: row.created_at,
          });
        }
      }
    }

    if (supabase && (category === "all" || category === "security")) {
      const { data: secRows } = await supabase
        .from("security_audit_logs")
        .select("id, event_type, severity, route, method, ip, reason, created_at, profiles:user_id(email)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (secRows) {
        for (const row of secRows) {
          events.push({
            id: `sec_${row.id}`,
            category: "system",
            actor: (row.profiles as any)?.email || row.ip || "Unknown",
            action: `[SECURITY ${row.severity.toUpperCase()}] ${row.event_type} (${row.method || ""} ${row.route || ""}) — ${row.reason || "Security violation"}`,
            resourceId: row.id,
            status: row.severity,
            timestamp: row.created_at,
          });
        }
      }
    }

    // Sort combined events descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      events: events.slice(0, limit),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load activity logs";
    console.error("GET /api/admin/activity error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

/**
 * GET /api/admin/health
 * Safe health probes (no secret leakage).
 */
adminRouter.get("/health", async (req: Request, res: Response): Promise<void> => {
  try {
    const supabase = getSupabaseAdmin();
    let dbStatus = "operational";
    if (supabase) {
      const { error } = await supabase.from("admin_settings").select("key").limit(1);
      if (error) dbStatus = "degraded";
    } else {
      dbStatus = "unavailable";
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendStatus = resendApiKey ? "operational" : "unconfigured";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Writopedia <onboarding@resend.dev>";

    res.json({
      success: true,
      services: {
        api: "operational",
        database: dbStatus,
        storage: "operational",
        email: resendStatus,
      },
      emailConfig: {
        fromEmail,
        isTestDomain: fromEmail.includes("onboarding@resend.dev"),
      },
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Health check failed";
    console.error("GET /api/admin/health error:", message);
    res.status(500).json({ error: message, code: "HEALTH_CHECK_FAILED" });
  }
});

// GET /api/admin/settings/:key
adminRouter.get("/settings/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const value = await adminRepository.getSetting(key);
    res.json({ success: true, key, value });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load setting";
    console.error(`GET /api/admin/settings/${req.params.key} error:`, message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// PUT /api/admin/settings/:key
adminRouter.put("/settings/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { key } = req.params;
    const { value } = req.body;
    if (!value || typeof value !== "object") {
      res.status(400).json({ error: "Missing or invalid setting value object", code: "INVALID_REQUEST" });
      return;
    }

    const updated = await adminRepository.setSetting(key, value, user.uid);
    res.json({ success: true, updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update setting";
    console.error(`PUT /api/admin/settings/${req.params.key} error:`, message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// GET /api/admin/roles/:userId
adminRouter.get("/roles/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const role = await adminRepository.getUserRole(userId);
    res.json({ success: true, userId, role: role?.role || "user" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get user role";
    console.error("GET /api/admin/roles error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// POST /api/admin/roles
adminRouter.post("/roles", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { targetUserId, role } = req.body;
    if (!targetUserId || !role) {
      res.status(400).json({ error: "Missing required fields: targetUserId and role", code: "INVALID_REQUEST" });
      return;
    }

    const assigned = await adminRepository.setUserRole(targetUserId, role, user.uid);
    res.json({ success: true, assigned });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign user role";
    console.error("POST /api/admin/roles error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});
