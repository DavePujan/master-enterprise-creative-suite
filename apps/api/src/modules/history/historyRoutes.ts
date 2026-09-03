/**
 * History Logs API Routes.
 * Serves GET, POST, and DELETE endpoints backed authoritatively by public.history_logs.
 */

import { Router, type Request, type Response } from "express";
import { historyRepository } from "../../repositories/historyRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";

export const historyRouter = Router();

// GET /api/history
historyRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const limitCount = parseInt(req.query.limit as string, 10) || 30;
    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const history = await historyRepository.listHistory(workspaceId, limitCount);

    res.json({ success: true, history });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load history";
    console.error("GET /api/history error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// POST /api/history
historyRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { gemId, title, prompt, resultSummary, jobId } = req.body;
    if (!prompt || !gemId) {
      res.status(400).json({ error: "Missing required fields: gemId and prompt are required", code: "INVALID_REQUEST" });
      return;
    }

    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const item = await historyRepository.addHistory({
      workspaceId,
      userId: user.uid,
      jobId,
      gemId,
      title: title || "Creative Generation",
      prompt,
      resultSummary: resultSummary || {}
    });

    res.json({ success: true, item });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save history log";
    console.error("POST /api/history error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// DELETE /api/history/:id
historyRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { id } = req.params;
    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    await historyRepository.deleteHistory(workspaceId, id);

    res.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete history log";
    console.error("DELETE /api/history/:id error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});
