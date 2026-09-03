/**
 * Brand Guidelines API Routes.
 * Serves GET and POST endpoints backed authoritatively by public.brand_guidelines.
 */

import { Router, type Request, type Response } from "express";
import { brandRepository } from "../../repositories/brandRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";

export const brandRouter = Router();

// GET /api/brand-guidelines
brandRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const guidelines = await brandRepository.getDefaultGuidelines(workspaceId);

    res.json({ success: true, guidelines });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load brand guidelines";
    console.error("GET /api/brand-guidelines error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// POST /api/brand-guidelines
brandRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { guidelines } = req.body;
    if (!guidelines || typeof guidelines !== "object") {
      res.status(400).json({ error: "Missing or invalid guidelines payload", code: "INVALID_REQUEST" });
      return;
    }

    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const saved = await brandRepository.saveDefaultGuidelines(workspaceId, user.uid, guidelines);

    res.json({ success: true, saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save brand guidelines";
    console.error("POST /api/brand-guidelines error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});
