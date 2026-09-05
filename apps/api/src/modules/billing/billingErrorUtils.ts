/**
 * Centralized Server-Side Billing Error Utilities.
 * Produces strictly normalized HTTP 402 responses adhering to the canonical
 * InsufficientCreditsErrorPayload contract.
 */

import type { Response } from "express";
import type { InsufficientCreditsErrorPayload } from "../../../../../packages/types/billing.js";

export interface BuildInsufficientCreditsParams {
  available?: number;
  required: number;
  service: string;
  action?: string;
  model?: string;
  customMessage?: string;
}

export class InsufficientCreditsError extends Error {
  readonly status = 402;
  readonly code = "INSUFFICIENT_CREDITS" as const;
  readonly availableCredits: number;
  readonly requiredCredits: number;
  readonly missingCredits: number;
  readonly service: string;
  readonly action?: string;
  readonly model?: string;

  constructor(params: BuildInsufficientCreditsParams) {
    const available = typeof params.available === 'number' ? Math.max(0, params.available) : 0;
    const missing = Math.max(0, params.required - available);
    const message = params.customMessage || 
      `Insufficient credits for ${params.service}. Required: ${params.required}, available: ${available}.`;

    super(message);
    this.name = "InsufficientCreditsError";
    this.availableCredits = available;
    this.requiredCredits = params.required;
    this.missingCredits = missing;
    this.service = params.service;
    this.action = params.action;
    this.model = params.model;
  }

  toPayload(): InsufficientCreditsErrorPayload {
    return {
      error: this.message,
      code: "INSUFFICIENT_CREDITS",
      requiredCredits: this.requiredCredits,
      availableCredits: this.availableCredits,
      missingCredits: this.missingCredits,
      currency: "credits",
      service: this.service,
      action: this.action,
      model: this.model,
      retryable: false
    };
  }
}

export function buildInsufficientCreditsPayload(params: BuildInsufficientCreditsParams): InsufficientCreditsErrorPayload {
  return new InsufficientCreditsError(params).toPayload();
}

export function sendInsufficientCreditsResponse(
  res: Response,
  params: BuildInsufficientCreditsParams
): Response {
  const payload = buildInsufficientCreditsPayload(params);
  return res.status(402).json(payload);
}
