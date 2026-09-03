/**
 * Image Prompt Builder.
 * Assembles structured, brand-aware, logo-safe prompts without asking the model to hallucinate logos.
 */

import type { NormalizedImageRequest, ImageModelDefinition } from "@shared-types/imageGeneration.js";

export class ImagePromptBuilder {
  buildPrompt(request: NormalizedImageRequest, model: ImageModelDefinition): string {
    const sections: string[] = [];

    // 1. Base creative objective
    sections.push("Professional commercial advertising visual composition.");

    // 2. User prompt (core subject)
    if (request.prompt) {
      sections.push(`Creative Brief: ${request.prompt.trim()}`);
    }

    // 3. Brand context
    if (request.guidelines) {
      const g = request.guidelines;
      const brandParts: string[] = [];
      if (g.name) brandParts.push(`Brand: ${g.name}`);
      if (g.industry) brandParts.push(`Industry: ${g.industry}`);
      if (g.tone) brandParts.push(`Tone: ${g.tone}`);
      if (g.colors && g.colors.length > 0) brandParts.push(`Brand Color Palette: ${g.colors.join(", ")}`);
      if (g.visualEthnicityStyle) brandParts.push(`Cultural & Ethnic Aesthetic: ${g.visualEthnicityStyle}`);
      if (brandParts.length > 0) {
        sections.push(`Brand Context:\n${brandParts.join("\n")}`);
      }
    }

    // 4. Style & Lighting (isolated from resolution)
    if (request.style) {
      // Clean out accidental 8k/resolution strings from the style
      const cleanStyle = request.style
        .replace(/,?\s*(?:8k|4k|high\s*res|resolution)\b/gi, "")
        .trim();
      if (cleanStyle) {
        sections.push(`Visual Style & Lighting: ${cleanStyle}`);
      }
    }

    // 5. Composition & Aspect Ratio
    sections.push(
      `Framing: Optimized for ${request.aspectRatio} aspect ratio, cinematic lighting, sharp focal depth, balanced aesthetic.`
    );

    // 6. Product reference context (if supported and enabled)
    if (
      request.productReference?.enabled &&
      model.capabilities.supportsProductReference !== "unsupported"
    ) {
      sections.push(
        "Product Placement: Highlight the product as the hero focal element of the scene, maintaining authentic textures and materials."
      );
    }

    // 7. Logo-Safe Space (Section 27)
    if (request.logo?.enabled) {
      sections.push(
        "COMPOSITION SAFETY: Reserve clean, uncluttered visual negative space in the composition for the brand mark. Avoid placing high-frequency visual noise or focal details in the corner/header region. ABSOLUTELY DO NOT draw, render, or invent any logo, brand name, typography, or text onto the image."
      );
    }

    // 8. Output constraints
    sections.push(
      "Output Constraints: ABSOLUTELY NO text, typography, letters, watermarks, signatures, or UI overlays. Pure photographic visual composition."
    );

    return sections.join("\n\n");
  }
}

export const imagePromptBuilder = new ImagePromptBuilder();
