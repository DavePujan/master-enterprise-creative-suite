/**
 * Presentation Content Compiler (Stage 2: Semantic Content + Layout Compilation).
 * Formulates detailed slide copy, speaker notes, and factual metrics with strict provenance enforcement.
 * Invokes packages/presentation-engine layout algorithms to synthesize the canonical PresentationDocument.
 */

import { getServerAI } from '../../infrastructure/gemini/serverGeminiClient.js';
import { resolvePresentationConfig } from './presentationModelResolver.js';
import {
  PresentationDocument,
  PresentationSlide,
  PresentationAsset,
  SemanticSlideInput,
  PresentationTheme
} from '@presentation-engine/index.js';
import { computeSlideLayout } from '@presentation-engine/layouts/layoutEngine.js';
import { resolveBrandTheme } from '@presentation-engine/theme/brandThemeResolver.js';
import { PresentationStrategyPlan } from './presentationPlanner.js';
import { sanitizeMetricProvenance } from '@presentation-engine/domain/provenance.js';

export interface Stage2CompileRequest {
  plan: PresentationStrategyPlan;
  brandGuidelines?: any;
  logoAssetId?: string;
  customTheme?: Partial<PresentationTheme>;
}

export async function compilePresentationContent(
  request: Stage2CompileRequest
): Promise<PresentationDocument> {
  const { plan, brandGuidelines, logoAssetId, customTheme } = request;
  const ai = getServerAI();
  const config = resolvePresentationConfig('content');
  const brandTheme = resolveBrandTheme(brandGuidelines, customTheme);

  const systemInstruction = `You are an elite corporate communications strategist and presentation copywriter.
You are compiling the detailed semantic content for a ${plan.slides.length}-slide executive presentation.

STRICT ANTI-FABRICATION RULE:
You may NEVER invent quantitative business statistics, market percentages, or reliability metrics.
- If a quantitative figure is supplied explicitly in the brief, use it with provenance: "user_provided".
- If a figure is not known or verified with certainty, you MUST use an explicit placeholder like:
  value: "[Insert verified YoY growth %]"
  provenance: "placeholder"
  source: "Requires verification against Category actuals"
Every metric MUST include: value, label, provenance ("user_provided" | "brand_context" | "verified_source" | "placeholder"), and confidence.

FORMATTING REQUIREMENTS:
- title: Under 8 words, authoritative, executive-ready.
- subtitle: Under 15 words, clear framing.
- bulletPoints: 2 to 4 crisp, high-impact bullet points (each under 18 words).
- visualPrompt: 1-2 sentence descriptive prompt for generating background visuals.
- speakerNotes: 2-3 sentences of conversational talking points for the presenter.
- Return strictly a JSON array of slide objects under the key "slides".`;

  const userInput = `Executive Deck: "${plan.title}"
Objective: ${plan.objective}
Target Audience: ${plan.targetAudience}
Narrative Arc: ${plan.narrativeArc}
Brand Name: ${plan.brandName}

Slide Outline Plan:
${JSON.stringify(plan.slides, null, 2)}

Generate the detailed semantic content for all ${plan.slides.length} slides conforming to the JSON schema.`;

  const modelsToTry = [config.model, ...config.fallbacks];
  let semanticSlides: SemanticSlideInput[] = [];
  let lastError: any = null;

  for (const modelId of modelsToTry) {
    try {
      console.log(`[PresentationCompiler] Executing Stage 2 semantic compilation with model: ${modelId}`);

      let responseText = '';

      if ((ai as any).interactions?.create) {
        const interaction = await (ai as any).interactions.create({
          model: modelId,
          input: userInput,
          system_instruction: systemInstruction,
          response_format: 'json',
          generation_config: {
            thinking_level: config.thinkingLevel,
            max_output_tokens: config.maxOutputTokens
          }
        });
        responseText = interaction.output_text || '';
      } else {
        const response = await ai.models.generateContent({
          model: modelId,
          contents: [{ text: `${systemInstruction}\n\n${userInput}` }],
          config: {
            responseMimeType: 'application/json'
          }
        });
        responseText = response.text || '';
      }

      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      semanticSlides = parsed.slides || parsed;

      if (!Array.isArray(semanticSlides) || semanticSlides.length === 0) {
        throw new Error('Stage 2 returned invalid slide array.');
      }
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[PresentationCompiler] Stage 2 attempt on ${modelId} failed:`, err?.message || err);
    }
  }

  if (semanticSlides.length === 0) {
    throw new Error(`Presentation Stage 2 Content Compilation failed: ${lastError?.message || lastError}`);
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

    // Sanitize any metrics using strict provenance rules
    if (semantic.metric) {
      semantic.metric = sanitizeMetricProvenance(semantic.metric);
    }
    if (semantic.metrics && Array.isArray(semantic.metrics)) {
      semantic.metrics = semantic.metrics.map(m => sanitizeMetricProvenance(m));
    }

    // Pass into packages/presentation-engine Layout Engine
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

  return document;
}
