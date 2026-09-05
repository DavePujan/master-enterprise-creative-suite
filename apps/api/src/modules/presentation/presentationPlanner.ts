/**
 * Presentation Planner (Stage 1: Strategy & Outline).
 * Determines deck objective, audience, narrative arc, slide count, and semantic purposes.
 * Enforces allowedLayoutsByPurpose and variable slide counts (4 to 15 slides).
 * Delegates LLM execution strictly to centralized presentationGeminiClient with versioned v1 contracts.
 */

import { Type } from '@google/genai';
import { presentationGeminiClient, StructuredExecutionTelemetry } from './presentationGeminiClient.js';
import { PresentationPolicyName } from './presentationModelResolver.js';
import { buildPresentationContext } from './presentationContextBuilder.js';
import {
  PlannerOutput_v1,
  PlannedSlideOutline_v1,
  validatePlannerOutput_v1
} from './presentationContracts.js';

export interface Stage1StrategyRequest {
  prompt: string;
  brandGuidelines?: any;
  targetSlideCount?: number;
  productContext?: any;
  generationId?: string;
  policyName?: PresentationPolicyName;
}

// Backward-compatible alias for existing imports
export type PlannedSlideOutline = PlannedSlideOutline_v1;
export type PresentationStrategyPlan = PlannerOutput_v1;

export interface Stage1StrategyResult {
  plan: PlannerOutput_v1;
  modelUsed: string;
  latencyMs: number;
  telemetry: StructuredExecutionTelemetry[];
}

/**
 * Stage 1 Gemini Response Schema using Google GenAI Type definitions.
 */
const stage1ResponseSchema = {
  type: Type.OBJECT,
  properties: {
    schemaVersion: { type: Type.STRING, description: 'Must be 1.0.0' },
    title: { type: Type.STRING, description: 'Executive presentation deck title under 10 words' },
    objective: { type: Type.STRING, description: 'Core strategic business objective' },
    targetAudience: { type: Type.STRING, description: 'Target stakeholder audience' },
    narrativeArc: { type: Type.STRING, description: 'Summary narrative arc' },
    brandName: { type: Type.STRING, description: 'Brand name' },
    industry: { type: Type.STRING, description: 'Industry or sector' },
    targetSlideCount: { type: Type.INTEGER, description: 'Number of formulated slides' },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          purpose: {
            type: Type.STRING,
            description:
              'Allowed purposes: cover, agenda, problem, opportunity, strategy, solution, process, timeline, comparison, metrics, market, team, financials, case-study, closing'
          },
          coreIdea: { type: Type.STRING, description: 'Core strategic message for this slide' },
          suggestedLayout: { type: Type.STRING },
          requiresChart: { type: Type.BOOLEAN },
          requiresMetric: { type: Type.BOOLEAN }
        },
        required: ['index', 'purpose', 'coreIdea']
      }
    }
  },
  required: [
    'title',
    'objective',
    'targetAudience',
    'narrativeArc',
    'brandName',
    'industry',
    'targetSlideCount',
    'slides'
  ]
};

/**
 * Formulates the presentation strategy plan and slide-by-slide purpose outlines.
 */
export async function planPresentationStrategy(
  request: Stage1StrategyRequest
): Promise<PlannerOutput_v1> {
  const generationId = request.generationId || `plan_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const context = buildPresentationContext(request);

  const result = await presentationGeminiClient.executeStructured<PlannerOutput_v1>({
    generationId,
    stage: 'strategy',
    policyName: request.policyName,
    userInput: context.sanitizedUserPrompt,
    systemInstruction: context.systemInstruction,
    responseSchema: stage1ResponseSchema,
    semanticValidator: validatePlannerOutput_v1
  });

  // Ensure schemaVersion is populated
  const plan = result.data;
  if (!plan.schemaVersion) {
    plan.schemaVersion = '1.0.0';
  }

  return plan;
}
