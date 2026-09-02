/**
 * Express Application Setup & Route Registry.
 * Mounts all domain module routers with identical URL paths and payload limits.
 */

import express, { type Express } from "express";
import { campaignRouter } from "../modules/campaigns/campaignRoutes.js";
import { billingRouter } from "../modules/billing/billingRoutes.js";
import { humanTouchRouter } from "../modules/humanTouch/humanTouchRoutes.js";
import { salesRouter } from "../modules/sales/salesRoutes.js";
import { proxyRouter } from "../modules/proxy/proxyRoutes.js";

export function createExpressApp(): Express {
  const app = express();

  // Add JSON parsing middleware to support post payload values (50mb limit preserved)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Mount API module routers with exact legacy URL prefixes
  app.use("/api/campaign", campaignRouter);
  app.use("/api/payment", billingRouter);
  app.use("/api", humanTouchRouter);
  app.use("/api", salesRouter);
  app.use("/api", proxyRouter);

  return app;
}
