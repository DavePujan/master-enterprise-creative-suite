/**
 * Workspaces API Routes.
 * Serves endpoints backed authoritatively by public.workspaces and public.workspace_members.
 */

import { Router, type Request, type Response } from "express";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import { getSupabaseAdmin } from "../../infrastructure/supabase/supabaseClient.js";

export const workspaceRouter = Router();

// GET /api/workspaces/primary
workspaceRouter.get("/primary", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const workspace = await workspaceRepository.getPrimaryWorkspaceForUser(user.uid);

    res.json({ success: true, workspaceId, workspace });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load primary workspace";
    console.error("GET /api/workspaces/primary error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// GET /api/workspaces
workspaceRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const workspaces = await workspaceRepository.getUserWorkspaces(user.uid);
    res.json({ success: true, workspaces });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load workspaces";
    console.error("GET /api/workspaces error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// GET /api/workspaces/:id/members
workspaceRouter.get("/:id/members", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { id } = req.params;
    const members = await workspaceRepository.getWorkspaceMembers(id);

    res.json({ success: true, members });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load workspace members";
    console.error("GET /api/workspaces/:id/members error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// POST /api/workspaces/:id/members
workspaceRouter.post("/:id/members", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { id } = req.params;
    const { targetUserId, role } = req.body;
    if (!targetUserId || !role) {
      res.status(400).json({ error: "Missing required fields: targetUserId and role", code: "INVALID_REQUEST" });
      return;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      res.status(500).json({ error: "Database unconfigured", code: "DATABASE_ERROR" });
      return;
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .upsert({
        workspace_id: id,
        user_id: targetUserId,
        role,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !data) {
      res.status(500).json({ error: error?.message || "Failed to add member", code: "DATABASE_ERROR" });
      return;
    }

    res.json({ success: true, member: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to add workspace member";
    console.error("POST /api/workspaces/:id/members error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});
