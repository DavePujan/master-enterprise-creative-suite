/**
 * Unified Serverless API Entry Point for Vercel & Edge Deployments.
 * Ensures 100% of /api/* traffic executes through the single authoritative modular Express app.
 */

import { createExpressApp } from "../apps/api/src/http/app.js";

const app = createExpressApp();

export default app;
