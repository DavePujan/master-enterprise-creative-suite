import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { serverConfig } from "./apps/api/src/config/env.js";
import { createExpressApp } from "./apps/api/src/http/app.js";
import { videoJobWorker } from "./apps/api/src/modules/videoGeneration/videoJobWorker.js";

async function startServer() {
  const app = createExpressApp();
  const PORT = serverConfig.port;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Start background video generation worker & reconcile stale jobs
    videoJobWorker.start();
    videoJobWorker.reconcileStaleJobs().catch(err => {
      console.warn("Error reconciling stale video jobs:", err);
    });
  });
}

startServer();
