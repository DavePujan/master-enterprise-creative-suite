/**
 * Admin API Routes.
 * Serves endpoints backed authoritatively by public.admin_settings and public.user_roles.
 */

import { Router, type Request, type Response } from "express";
import { adminRepository } from "../../repositories/adminRepository.js";

export const adminRouter = Router();

// GET /api/admin/settings/:key
adminRouter.get("/settings/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { key } = req.params;
    const value = await adminRepository.getSetting(key);

    res.json({ success: true, key, value });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load setting";
    console.error(`GET /api/admin/settings/${req.params.key} error:`, message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// PUT /api/admin/settings/:key (Admin only)
adminRouter.put("/settings/:key", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    if (!user.admin) {
      res.status(403).json({ error: "Forbidden: Admin privileges required", code: "ADMIN_REQUIRED" });
      return;
    }

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
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { userId } = req.params;
    const role = await adminRepository.getUserRole(userId);

    res.json({ success: true, userId, role: role?.role || "user" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get user role";
    console.error("GET /api/admin/roles error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// POST /api/admin/roles (Admin only)
adminRouter.post("/roles", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    if (!user.admin) {
      res.status(403).json({ error: "Forbidden: Admin privileges required", code: "ADMIN_REQUIRED" });
      return;
    }

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
