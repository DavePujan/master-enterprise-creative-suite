/**
 * Assets API Routes.
 * Serves endpoints backed authoritatively by public.assets and Supabase Storage (user-assets).
 */

import { Router, type Request, type Response } from "express";
import { assetRepository } from "../../repositories/assetRepository.js";
import { workspaceRepository } from "../../repositories/workspaceRepository.js";
import { storageService } from "../../services/storageService.js";

export const assetRouter = Router();

// GET /api/assets
assetRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const assets = await assetRepository.list(workspaceId, limit, offset);

    res.json({ success: true, assets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load assets";
    console.error("GET /api/assets error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// POST /api/assets
assetRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { name, storagePath, type, prompt, analysis, fileSizeBytes, mimeType, sha256 } = req.body;
    if (!name || !storagePath || !type) {
      res.status(400).json({ error: "Missing required fields: name, storagePath, and type are required", code: "INVALID_REQUEST" });
      return;
    }

    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const asset = await assetRepository.create({
      workspaceId,
      uploadedBy: user.uid,
      name,
      storagePath,
      type,
      prompt,
      analysis,
      fileSizeBytes,
      mimeType,
      sha256
    });

    if (!asset) {
      res.status(500).json({ error: "Failed to persist asset record", code: "DATABASE_ERROR" });
      return;
    }

    res.json({ success: true, asset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create asset";
    console.error("POST /api/assets error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});

// GET /api/assets/:id/signed-url
assetRouter.get("/:id/signed-url", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { id } = req.params;
    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const asset = await assetRepository.getById(id, workspaceId);

    if (!asset) {
      res.status(404).json({ error: "Asset not found", code: "NOT_FOUND" });
      return;
    }

    const signedUrl = await storageService.getSignedDownloadUrl(asset.storagePath, 3600);
    res.json({ success: true, signedUrl, asset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate signed download URL";
    console.error("GET /api/assets/:id/signed-url error:", message);
    res.status(500).json({ error: message, code: "STORAGE_ERROR" });
  }
});

// POST /api/assets/signed-upload-url
assetRouter.post("/signed-upload-url", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { path } = req.body;
    if (!path) {
      res.status(400).json({ error: "Missing required field: path", code: "INVALID_REQUEST" });
      return;
    }

    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const canonicalPath = `${workspaceId}/${path.replace(/^\/+/, "")}`;
    const result = await storageService.createSignedUploadUrl(canonicalPath, 3600);

    res.json({ success: true, ...result, canonicalPath });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate signed upload URL";
    console.error("POST /api/assets/signed-upload-url error:", message);
    res.status(500).json({ error: message, code: "STORAGE_ERROR" });
  }
});

// DELETE /api/assets/:id
assetRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized", code: "AUTH_REQUIRED" });
      return;
    }

    const { id } = req.params;
    const workspaceId = await workspaceRepository.ensurePersonalWorkspace(user.uid, user.email || "");
    const success = await assetRepository.delete(id, workspaceId);

    res.json({ success, deletedId: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete asset";
    console.error("DELETE /api/assets/:id error:", message);
    res.status(500).json({ error: message, code: "DATABASE_ERROR" });
  }
});
