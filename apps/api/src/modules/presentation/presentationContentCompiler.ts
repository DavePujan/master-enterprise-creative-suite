/**
 * Presentation Content Compiler (Stage 2: Semantic Content + Layout Compilation).
 * Formulates detailed slide copy, speaker notes, and factual metrics with strict provenance enforcement.
 * Invokes packages/presentation-engine layout algorithms to synthesize the canonical PresentationDocument.
 * Delegates LLM execution strictly to centralized presentationGeminiClient with versioned v1 contracts.
 */

import { Type } from '@google/genai';
import {
  PresentationDocument,
  PresentationSlide,
  PresentationAsset,
  SemanticSlideInput,
  PresentationTheme,
  validatePresentationDocument
} from '@presentation-engine/index.js';
import { computeSlideLayout } from '@presentation-engine/layouts/layoutEngine.js';
import { resolveBrandTheme } from '@presentation-engine/theme/brandThemeResolver.js';
import { sanitizeMetricProvenance } from '@presentation-engine/domain/provenance.js';
import { presentationGeminiClient } from './presentationGeminiClient.js';
import { PresentationPolicyName } from './presentationModelResolver.js';
import { buildStage2Context } from './presentationContextBuilder.js';
import {
  PlannerOutput_v1,
  CompilerOutput_v1,
  validateCompilerOutput_v1
} from './presentationContracts.js';

export interface Stage2CompileRequest {
  plan: PlannerOutput_v1;
  brandGuidelines?: any;
  logoAssetId?: string;
  customTheme?: Partial<PresentationTheme>;
  generationId?: string;
  policyName?: PresentationPolicyName;
}

/**
 * Stage 2 Gemini Response Schema using Google GenAI Type definitions.
 */
const stage2ResponseSchema = {
  type: Type.OBJECT,
  properties: {
    schemaVersion: { type: Type.STRING, description: 'Must be 1.0.0' },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          purpose: { type: Type.STRING },
          title: { type: Type.STRING, description: 'Authoritative slide title under 8 words' },
          subtitle: { type: Type.STRING, description: 'Strategic subtitle framing under 15 words' },
          bulletPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 to 4 crisp bullet points'
          },
          visualPrompt: { type: Type.STRING, description: 'Description for visual imagery background' },
          speakerNotes: { type: Type.STRING, description: 'Talking points for the presenter' },
          metric: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING, description: 'Metric number or placeholder like [Insert verified %]' },
              label: { type: Type.STRING, description: 'KPI label' },
              provenance: {
                type: Type.STRING,
                description: 'user_provided | brand_context | verified_source | placeholder'
              },
              source: { type: Type.STRING }
            }
          }
        },
        required: ['index', 'purpose', 'title']
      }
    }
  },
  required: ['slides']
};

export async function compilePresentationContent(
  request: Stage2CompileRequest
): Promise<PresentationDocument> {
  const { plan, brandGuidelines, logoAssetId, customTheme } = request;
  const generationId = request.generationId || `compile_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const brandTheme = resolveBrandTheme(brandGuidelines, customTheme);

  // 1. Build Stage 2 prompt & instructions
  const { systemInstruction, userPrompt } = buildStage2Context({
    plan,
    brandGuidelines,
    logoAssetId
  });

  // 2. Execute via centralized presentationGeminiClient
  const result = await presentationGeminiClient.executeStructured<CompilerOutput_v1>({
    generationId,
    stage: 'content',
    policyName: request.policyName,
    userInput: userPrompt,
    systemInstruction,
    responseSchema: stage2ResponseSchema,
    semanticValidator: (data) => validateCompilerOutput_v1(data, plan.slides.length)
  });

  const parsedSlides = result.data.slides || (result.data as any);
  const semanticSlides: SemanticSlideInput[] = Array.isArray(parsedSlides) ? parsedSlides : [];

  if (semanticSlides.length === 0) {
    throw new Error('Presentation Stage 2 Content Compilation returned an empty slides array.');
  }

  // 3. Compile Semantic Content into Presentation Slides using packages/presentation-engine Layout Engine
  const presentationId = `pres_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const assets: PresentationAsset[] = [];
  const compiledSlides: PresentationSlide[] = [];

  // Register brand logo asset if provided
  if (logoAssetId) {
    assets.push({
      id: logoAssetId,
      type: 'logo',
      storagePath: `brand_logos/${logoAssetId}`,
      status: 'ready',
      mimeType: 'image/png'
    });
  }

  for (let idx = 0; idx < plan.slides.length; idx++) {
    const outline = plan.slides[idx];
    const semantic = semanticSlides[idx] || (semanticSlides[0] ? { ...semanticSlides[0], title: outline.coreIdea } : {
      purpose: outline.purpose,
      title: outline.coreIdea
    });

    const slideId = `${presentationId}_s${idx + 1}`;
    semantic.id = slideId;
    semantic.purpose = outline.purpose;
    semantic.preferredLayout = outline.suggestedLayout;
    semantic.logoAssetId = logoAssetId;
    semantic.brandName = plan.brandName;

    // Strict Anti-Fabrication & Provenance Sanitization
    if (semantic.metric) {
      semantic.metric = sanitizeMetricProvenance(semantic.metric);
    }
    if (semantic.metrics && Array.isArray(semantic.metrics)) {
      semantic.metrics = semantic.metrics.map(m => sanitizeMetricProvenance(m));
    }

    // Pass into packages/presentation-engine deterministic Layout Engine
    const { layout, elements } = computeSlideLayout(semantic, brandTheme, idx);

    // Register placeholder visual asset if visualPrompt provided
    let slideBackground: any = {
      type: 'color',
      color: brandTheme.colors.background
    };

    if (idx === 0 && semantic.visualPrompt) {
      const coverBgAssetId = `asset_bg_${slideId}`;
      assets.push({
        id: coverBgAssetId,
        type: 'image',
        storagePath: `presentations/${presentationId}/assets/${coverBgAssetId}.webp`,
        status: 'pending',
        mimeType: 'image/webp'
      });

      slideBackground = {
        type: 'image',
        assetId: coverBgAssetId,
        overlayOpacity: brandTheme.overlay
      };
    }

    compiledSlides.push({
      id: slideId,
      index: idx,
      purpose: outline.purpose,
      layout,
      title: semantic.title || outline.coreIdea,
      subtitle: semantic.subtitle,
      elements,
      background: slideBackground,
      speakerNotes: semantic.speakerNotes || `Focus on ${semantic.title || outline.coreIdea} for executive audience.`
    });
  }

  const document: PresentationDocument = {
    id: presentationId,
    title: plan.title,
    schemaVersion: 1,
    version: 1, // initial revision
    aspectRatio: '16:9',
    theme: brandTheme,
    slides: compiledSlides,
    assets,
    metadata: {
      objective: plan.objective,
      targetAudience: plan.targetAudience,
      narrativeArc: plan.narrativeArc,
      brandName: plan.brandName,
      industry: plan.industry,
      targetSlideCount: plan.slides.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };

  // Validate the completed Presentation IR
  const validation = validatePresentationDocument(document);
  if (!validation.isValid) {
    console.warn('[PresentationCompiler] Presentation IR validation warnings:', validation.errors);
  }

  return document;
}
