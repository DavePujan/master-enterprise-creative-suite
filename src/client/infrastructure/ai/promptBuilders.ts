/**
 * Prompt Engineering & Brand Context Builders for Google GenAI.
 * Preserves exact system prompts, cultural instructions, logo injection, and asset extraction.
 */

import { Type } from "@google/genai";
import { getAI, parseJSON, withRetry } from "./geminiClient.js";
import { apiClient } from "../api/apiClient.js";
import { promptEngineSettings } from "./modelRegistry.js";

import type { BrandGuidelines } from "../../../shared/types/brand.js";
import type { Asset, AssetAnalysis } from "../../../shared/types/creative.js";

export async function getSupportedLogoData(logoData: string): Promise<{ mimeType: string; data: string } | null> {
  if (logoData.startsWith('http://') || logoData.startsWith('https://')) {
    try {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(logoData)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logo from proxy: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(getSupportedLogoData(result));
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Failed to fetch remote logo through internal proxy:", e);
      return null;
    }
  }

  const mimeTypeMatch = logoData.match(/^data:(image\/[a-z+]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
  const base64Data = logoData.includes(',') ? logoData.split(',')[1] : logoData;

  if (mimeType === 'image/svg+xml') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 512;
        canvas.height = img.height || 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          resolve({
            mimeType: 'image/png',
            data: pngDataUrl.split(',')[1]
          });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoData;
    });
  }

  return { mimeType, data: base64Data };
}

export async function analyzeAsset(imageData: string): Promise<AssetAnalysis> {
  const ai = getAI();
  const supportedAsset = await getSupportedLogoData(imageData);
  if (!supportedAsset) throw new Error("Unsupported image format");

  const prompt = `Analyze this image and extract its core visual brand identity elements. 
  Return a JSON object with the following fields:
  - theme: The overarching theme (e.g., "Minimalist Tech", "Organic Luxury")
  - tone: The emotional tone (e.g., "Professional", "Playful", "Sophisticated")
  - colors: An array of the 3-5 most prominent hex colors
  - style: The artistic style (e.g., "Flat Vector", "Photorealistic", "3D Render")
  - composition: How elements are arranged (e.g., "Centered", "Rule of Thirds", "Dynamic")
  - mood: The feeling it evokes (e.g., "Calm", "Energetic", "Trustworthy")
  
  STRICT RULES:
  1. Return ONLY valid JSON.
  2. Be concise.
  3. Ensure hex colors are accurate.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: supportedAsset.mimeType, data: supportedAsset.data } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING },
            tone: { type: Type.STRING },
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            style: { type: Type.STRING },
            composition: { type: Type.STRING },
            mood: { type: Type.STRING }
          },
          required: ["theme", "tone", "colors", "style", "composition", "mood"]
        }
      }
    })
  );

  return parseJSON(response.text);
}

export async function generateBrandIdentity(
  description: string,
  context?: { logo?: string; colors?: string; tone?: string }
): Promise<BrandGuidelines> {
  const ai = getAI();

  let prompt = `You are a Brand Identity Expert. Based on this brand description/name: "${description}", generate a comprehensive brand identity.

STRICT RULES:
1. Return ONLY a valid JSON object.
2. Do NOT include any conversational text, thinking process, or internal monologue inside the JSON values.
3. Keep all string values concise and professional.
4. Ensure the JSON is perfectly formatted and parseable.`;

  if (context?.colors) {
    prompt += `\n\nIMPORTANT: The user has provided specific brand colors: ${context.colors}. You MUST incorporate these colors into the generated identity.`;
  }

  if (context?.tone) {
    prompt += `\n\nIMPORTANT: The user has provided a specific brand tone: "${context.tone}". You MUST align the generated identity with this tone.`;
  }

  prompt += `\n\nReturn a JSON object with this exact structure:
    {
      "name": "Brand Name",
      "industry": "Industry",
      "tone": "Brand Tone (e.g., Professional, Playful, Minimalist)",
      "pillars": ["3-4 core brand pillars"],
      "colors": ["#HEXCODE1", "#HEXCODE2"],
      "typography": {
        "primary": "Font for headings",
        "secondary": "Font for body"
      },
      "location": "Detect physical location or target country base (e.g., 'India', 'United States', 'Japan', etc.). Pay close attention to descriptions implying Indian ingredients/names/cities.",
      "voiceAccentStyle": "Detect or suggest suitable audio voiceover accent (e.g., 'Indian English', 'Hinglish', 'US English', etc.) based on location.",
      "visualEthnicityStyle": "Specify demographic/ethnicity of main human faces for photography (e.g., 'Indian', 'Caucasian', 'East Asian', etc.) matching the brand location."
    }`;

  const parts: any[] = [{ text: prompt }];

  if (context?.logo) {
    const supportedLogo = await getSupportedLogoData(context.logo);
    if (supportedLogo) {
      parts.push({
        inlineData: {
          mimeType: supportedLogo.mimeType,
          data: supportedLogo.data
        }
      });
      parts[0].text += "\n\nI have also attached the brand's logo image. Analyze it to inform the color palette and overall aesthetic.";
    }
  }

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction:
          "You are a Brand Identity Expert. Your task is to generate a concise, professional brand identity in JSON format. You MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object. Keep all values extremely concise and avoid any repetitive or nonsensical strings. Under the 'location', 'voiceAccentStyle', and 'visualEthnicityStyle' fields, pay extremely close attention to regional descriptors in the brand prompt. For example, if the prompt uses terms like 'Indian', 'Vedic', 'Mumbai', 'Hinglish', 'Chai', 'Ayurveda', or describes localized services in India, you MUST set location to 'India', voiceAccentStyle to 'Indian English' (or 'Hinglish'), and visualEthnicityStyle to 'Indian'.",
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            industry: { type: Type.STRING },
            tone: { type: Type.STRING },
            pillars: { type: Type.ARRAY, items: { type: Type.STRING } },
            colors: {
              type: Type.ARRAY,
              maxItems: 4,
              items: { type: Type.STRING }
            },
            logoDescription: {
              type: Type.STRING,
              description:
                "A detailed description of the brand's visual mark/logo, including its symbolic meaning and geometric structure."
            },
            typography: {
              type: Type.OBJECT,
              properties: {
                primary: { type: Type.STRING },
                secondary: { type: Type.STRING }
              }
            },
            location: {
              type: Type.STRING,
              description: "Identified or recommended geographical region/country for the brand."
            },
            voiceAccentStyle: {
              type: Type.STRING,
              description: "Audio accent voice style (e.g., Hinglish, Indian English, US English, and so on)."
            },
            visualEthnicityStyle: {
              type: Type.STRING,
              description: "Target demographic/ethnicity style for all generated models/faces."
            }
          },
          required: [
            "name",
            "industry",
            "tone",
            "pillars",
            "colors",
            "typography",
            "logoDescription",
            "location",
            "voiceAccentStyle",
            "visualEthnicityStyle"
          ]
        }
      }
    })
  );


  const guidelines = parseJSON(response.text);
  guidelines.logo = context?.logo || '';
  return guidelines;
}

export async function crawlBrandLogoFromUrl(urlOrDomain: string): Promise<string | null> {

  try {
    let targetUrl = urlOrDomain.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://www.${targetUrl.replace(/^www\./, '')}`;
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    if (!html || html.length < 50) return null;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. Apple Touch Icon (high-res PNG 180x180 / 192x192)
    const appleTouchIcon = doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
                           doc.querySelector('link[rel="apple-touch-icon-precomposed"]')?.getAttribute('href');

    // 2. OpenGraph / Twitter Image
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="og:image"]')?.getAttribute('content') ||
                    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

    // 3. SVG or High-res Vector Icon
    const svgIcon = doc.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute('href');
    const highResIcon = doc.querySelector('link[rel="icon"][sizes="192x192"]')?.getAttribute('href') ||
                        doc.querySelector('link[rel="icon"][sizes="512x512"]')?.getAttribute('href') ||
                        doc.querySelector('link[rel="icon"][sizes="128x128"]')?.getAttribute('href');

    // 4. In-page Brand Logo Image (Header / Nav / Logo class or alt)
    const logoImg = doc.querySelector('header img[class*="logo" i]')?.getAttribute('src') ||
                    doc.querySelector('header img[alt*="logo" i]')?.getAttribute('src') ||
                    doc.querySelector('nav img[class*="logo" i]')?.getAttribute('src') ||
                    doc.querySelector('img[class*="logo" i]')?.getAttribute('src') ||
                    doc.querySelector('img[id*="logo" i]')?.getAttribute('src') ||
                    doc.querySelector('img[alt*="logo" i]')?.getAttribute('src') ||
                    doc.querySelector('header img')?.getAttribute('src');

    // 5. Standard Favicon
    const standardIcon = doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                         doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href');

    const candidates = [appleTouchIcon, svgIcon, highResIcon, ogImage, logoImg, standardIcon].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        const absoluteUrl = new URL(candidate, targetUrl).href;
        const imgCheck = await fetch(`/api/proxy?url=${encodeURIComponent(absoluteUrl)}`);
        if (imgCheck.ok) {
          const contentType = imgCheck.headers.get('content-type') || '';
          if (contentType.startsWith('image/')) {
            const blob = await imgCheck.blob();
            if (blob.size > 100) {
              return await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(absoluteUrl);
                reader.readAsDataURL(blob);
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[Logo Crawler] Candidate failed: ${candidate}`, err);
      }
    }

    return null;
  } catch (e) {
    console.error(`[Logo Crawler] Failed to crawl logo for ${urlOrDomain}:`, e);
    return null;
  }
}

export async function initializeBrandKit(
  description: string,
  context?: { logo?: string; colors?: string; tone?: string }
): Promise<{ guidelines: BrandGuidelines; assets: Asset[] }> {
  const guidelines = await generateBrandIdentity(description, context);
  const ai = getAI();
  const assets: Asset[] = [];

  const discoverLogoTask = async () => {
    // 1. Manual user uploaded logo
    if (context?.logo) {
      guidelines.logo = context.logo;
      return;
    }

    // 2. Web Crawl / URL extraction from description or brand domain
    try {
      const domainMatch = description.match(
        /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})/i
      );
      let domain = domainMatch ? domainMatch[1].toLowerCase().replace(/\/.*$/, '').trim() : null;

      if (!domain && guidelines.name) {
        const cleanName = guidelines.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanName && cleanName !== 'studioai' && cleanName !== 'brand') {
          domain = `${cleanName}.com`;
        }
      }

      if (domain) {
        const crawledLogo = await crawlBrandLogoFromUrl(domain);
        if (crawledLogo) {
          guidelines.logo = crawledLogo;
          return;
        }
      }

      guidelines.logo = '';
    } catch (e) {
      console.error("Failed to crawl brand logo during initialization:", e);
      guidelines.logo = '';
    }
  };


  const generateDocsTask = async () => {
    try {
      const docPromptsResponse = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Based on the brand identity for "${guidelines.name}" (${guidelines.industry}), generate 2 essential brand documents.
        1. A "Brand Manifesto" that captures the soul and mission of the brand.
        2. A "Market Context & Strategy" document that outlines the brand's position in the current market.
        
        FORMATTING: Use clear Markdown hierarchy (# Title, ## Section, ### Subsection).
        
        Return a JSON array of 2 objects, each with:
        - name: The document title (e.g., "Brand Manifesto")
        - content: The full markdown content of the document.
        
        Return ONLY the JSON array.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["name", "content"]
              }
            }
          }
        })
      );

      const docPrompts = parseJSON(docPromptsResponse.text);
      docPrompts.forEach((dp: any) => {
        assets.push({
          id: Math.random().toString(36).substring(7),
          name: `${dp.name}.md`,
          data: dp.content,
          type: 'doc',
          selected: false
        });
      });
    } catch (e) {
      console.error("Failed to generate brand setup documents:", e);
    }
  };

  await Promise.all([discoverLogoTask(), generateDocsTask()]);
  return { guidelines, assets };
}

export async function generateBrandLogoAI(
  name: string,
  industry: string,
  colors: string[],
  tone?: string
): Promise<string> {
  try {
    const logoPrompt = `An iconic, world-class modern minimalist logo for brand "${name}", ${industry} industry, tone ${tone || 'Professional'}. Clean vector art, geometric silhouette, brand colors ${colors.join(', ')}, solid clean pure white background #ffffff. Single centered mark, award-winning graphic design.`;
    const renderData = await apiClient.post("/api/campaign/render", {
      prompt: logoPrompt,
      size: "1:1",
      engine: "fal-ai/flux/schnell"
    });
    if (renderData?.url) return renderData.url;
  } catch (err) {
    console.warn("Fal logo generation fallback to AI client:", err);
  }


  const ai = getAI();
  const logoResponse = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create an iconic, world-class professional logo for a brand named "${name}".
          Industry: ${industry}. 
          Tone: ${tone || 'Professional'}. 
          
          DESIGN REQUIREMENTS:
          - Style: Minimalist, geometric, and timeless.
          - Composition: A clean, high-contrast silhouette.
          - Colors: Primarily use ${colors[0] || 'black'} and ${colors[1] || 'white'}.
          - Background: Solid, pure white background (#FFFFFF).
          - Format: Vector-style art with sharp edges.`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    })
  );

  for (const part of logoResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from image generator");
}

export async function appendAssetsToParts(parts: any[], assets?: any[]) {
  if (assets && assets.length > 0) {
    const hasProductContext = assets.some((a) => a.isProductContext);
    const hasFaceContext = assets.some((a) => a.isFaceContext);

    const analyses = assets.filter((a) => a.analysis).map((a) => a.analysis);
    if (analyses.length > 0) {
      parts[0].text += `\n\nVISUAL THEME & TONE GUIDELINES (Extracted from Assets):
      - Themes: ${[...new Set(analyses.map((a) => a.theme))].join(', ')}
      - Tones: ${[...new Set(analyses.map((a) => a.tone))].join(', ')}
      - Moods: ${[...new Set(analyses.map((a) => a.mood))].join(', ')}
      - Styles: ${[...new Set(analyses.map((a) => a.style))].join(', ')}
      - Prominent Colors: ${[...new Set(analyses.flatMap((a) => a.colors))].join(', ')}
      
      Please strictly adhere to these visual guidelines to ensure consistency across all brand creatives.`;
    }

    const images = assets.filter((a) => a.type === 'image');
    const docs = assets.filter((a) => a.type === 'doc');

    if (images.length > 0 || docs.length > 0) {
      parts[0].text += `\n\nADDITIONAL BRAND ASSETS: The user has provided ${images.length} images and ${docs.length} documents as context.`;

      if (hasProductContext) {
        parts[0].text += `\n\n[PRODUCT REFERENCE IMAGE USED]: Use the attached product photo (labeled 'Product Context Image') as reference. In your prompt or design, describe and replicate this product's shape, color scheme, design elements, labeling, and surface texture in detail to maintain maximum product consistency in the output.`;
      }
      if (hasFaceContext) {
        parts[0].text += `\n\n[FACE/MODEL REFERENCE IMAGE USED]: Use the attached face/model photo (labeled 'Face/Model Context Image') as reference. In your prompt or design, analyze the person's exact facial structure, features, hairstyle, and emotional expression to maintain model lookalike consistency in the output.`;
      }

      if (docs.length > 0) {
        parts[0].text += `\n\nBRAND DOCUMENTS:`;
        docs.forEach((doc) => {
          parts[0].text += `\n--- DOCUMENT: ${doc.name} ---\n${doc.data}\n--- END DOCUMENT ---`;
        });
      }
    }

    for (const asset of images) {
      const assetDataPart = asset.data.includes(',') ? asset.data.split(',')[1] : asset.data;
      if (parts.some((p) => p.inlineData && p.inlineData.data === assetDataPart)) {
        continue;
      }
      const supportedAsset = await getSupportedLogoData(asset.data);
      if (supportedAsset) {
        if (parts.some((p) => p.inlineData && p.inlineData.data === supportedAsset.data)) {
          continue;
        }
        parts.push({
          inlineData: {
            mimeType: supportedAsset.mimeType,
            data: supportedAsset.data
          }
        });
      }
    }
  }
}

export async function generateFastPrompt(
  regionType: 'brief' | 'creative' | 'campaign-concept',
  brandName?: string,
  gemType?: string,
  gemId?: string,
  hasProductContext?: boolean,
  hasFaceContext?: boolean,
  guidelines?: BrandGuidelines
): Promise<string> {
  const ai = getAI();
  const lowerGemId = gemId?.toLowerCase() || '';
  const lowerGemType = gemType?.toLowerCase() || '';

  const isVideoGem =
    regionType === 'creative' &&
    (lowerGemId.includes('video') || lowerGemType.includes('video'));

  const isAudioGem =
    regionType === 'creative' &&
    (lowerGemId.includes('audio') || lowerGemType.includes('audio') || lowerGemId.includes('voice'));

  const isTextGem =
    regionType === 'creative' &&
    (lowerGemId.includes('strategy') || lowerGemId.includes('caption') || lowerGemType === 'text');

  const isCampaignDeckGem =
    regionType === 'creative' &&
    (lowerGemId.includes('campaign-deck') || lowerGemId.includes('bundles') || lowerGemType === 'campaign-deck');

  const isSlideshowGem =
    regionType === 'creative' &&
    (lowerGemId.includes('corporate-presentations') || lowerGemType === 'slideshow');

  const location = guidelines?.location || 'India';
  const tone = guidelines?.tone || 'Premium';
  const ethnicity = guidelines?.visualEthnicityStyle || 'Indian';
  const accent = guidelines?.voiceAccentStyle || 'Indian English';
  const brandColors =
    guidelines?.colors && guidelines.colors.length > 0
      ? guidelines.colors.join(', ')
      : '#e52c4d, #111827';
  const pillarsStr =
    guidelines?.pillars && guidelines.pillars.length > 0
      ? guidelines.pillars.join(', ')
      : 'Innovation, Craftsmanship, Design';
  const industryStr = guidelines?.industry || 'Creative Enterprise';
  const finalBrandName = brandName || guidelines?.name || 'Brand Engine';

  let systemInstruction = '';
  let userMessage = '';

  if (regionType === 'brief') {
    systemInstruction = `You are a visionary Startup Founder and Brand Director.
Write an incredibly compelling, evocative, and modern single-sentence business description and brand tagline for a new company.
The description must feel deeply human, authentic, inspiring, and highly specific to a premium niche.

STRICT FORMATTING RULE:
- Return ONLY the single elegant sentence.
- Do NOT wrap in quotes, do NOT include intro/outro explanations, do NOT add lists. Make it feel clean, organic, and executive-level.
- Do NOT impose rigid word boundaries, but make it a coherent, complete human-readable statement.`;

    userMessage = `Generate a brilliant startup concept and tagline for a modern brand.`;
  } else if (regionType === 'campaign-concept') {
    systemInstruction = `You are a Chief Creative Officer overseeing premium branding campaigns.
Write a rich, poetic, and highly creative marketing campaign concept and product focus for the brand "${finalBrandName}".
The brand is in the "${industryStr}" space, has a "${tone}" tone, and is based in "${location}".
Its core pillars are: ${pillarsStr}.

Create a distinct campaign concept statement. The concept should sound highly premium, natural, and human-written. Incorporate a beautiful contrast of themes, textures, and sensory keywords suited for visual assets.

STRICT FORMATTING RULE:
- Return ONLY the campaign concept sentence/paragraph.
- Do NOT use labels, bullet points, introductory text, or quotes. Keep it fully coherent and ready to read.`;

    userMessage = `Develop a captivating visual campaign concept and product theme for "${finalBrandName}".`;
  } else if (isVideoGem && promptEngineSettings.enableCinematicStoryboard) {
    const productMention = hasProductContext ? "the active Product Context Image provided" : "the brand's core product";
    const characterMention = hasFaceContext ? "the active Model/Face Context Image provided" : "a central character";

    systemInstruction = `You are an award-winning cinematic director and commercial producer creating a breathtaking storyline for "${finalBrandName}" (${industryStr}).
The brand's tone is "${tone}", based in "${location}". Any human representation in the clip must embody the visual demographic/ethnicity of "${ethnicity}".

Write a beautiful, inspiring, and cohesive 5-line cinematic narrative story to guide video frames.
Each line must describe a progressive story step:
Line 1: Establish the setting (an elegant cinematic atmosphere in "${location}").
Line 2: Highlight "${characterMention}" depicting beautiful, subtle emotion, and smiles.
Line 3: Tight macro focus on the textures and design of "${productMention}".
Line 4: A slow-motion graceful interaction between the character and "${productMention}".
Line 5: An uplifting, premium final shot radiating the brand's main pillars (${pillarsStr}) and ambient color aesthetic featuring brand colors (${brandColors}).

STRICT RULES:
- Output exactly 5 lines (each line separated by a newline).
- Do NOT include numbering, prefixes, bullet points, labels like "Line 1:", "Shot 1:", etc.
- Do NOT output quotes, introductory text, or conversational explanations.
- Make every line a complete, gorgeous, highly cinematic sentence. Ensure the entire story reads coherently as a whole.`;

    userMessage = `Write a 5-line cinematic narrative story involving the product/context and a ${ethnicity} model in ${location}.`;
  } else if (isAudioGem) {
    systemInstruction = `You are a Radio Producer and Audio Sound Designer for the brand "${finalBrandName}" (${industryStr}) based in "${location}".
Write a highly creative audio production design directive or descriptive voiceover layout.
Specify vocal speed, emotional pacing congruent with "${tone}", the background score atmosphere, instrumentation (aligned with cultural location: ${location}), and a short 1-2 sentence peak storytelling script.

STRICT RULES:
- No labels, tags, or quotes.
- No rigid word boundaries; let it flow beautifully, detailed, and completely coherent.
- Deliver a premium production prompt.
- STRICT LENGTH BUDGET: Keep the entire output condensed under 8 lines (max 80 words) in a single compact block.`;

    userMessage = `Design an executive audio vocal and sound design direction prompt for "${finalBrandName}" using accent: ${accent}.`;
  } else if (isTextGem) {
    systemInstruction = `You are an Expert Social Media Strategist and Cultural Consultant.
Write a detailed strategy prompt focusing on targeted viral engagement for "${finalBrandName}".
Connect it deeply with the brand's niche in "${industryStr}" and its local demographics matching "${location}".
Instruct how to pitch hooks, provide high-value CTAs, and integrate specific brand pillars (${pillarsStr}).

STRICT RULES:
- Return a cohesive, beautifully structured strategic direction prompt. No conversational meta-replies.
- STRICT LENGTH BUDGET: Keep the entire output under 8 lines or a single compact paragraph (under 100 words total).`;

    userMessage = `Create a smart strategy direction request for an audience campaign of "${finalBrandName}".`;
  } else if (isCampaignDeckGem) {
    systemInstruction = `You are an Art Director designing a 5-asset visual marketing launch deck for "${finalBrandName}".
Write a stunning multichannel production prompt outlining the creative theme, specified aesthetic color schemes matching: ${brandColors}, lighting parameters, and visual synergy.

STRICT RULES:
- Make it a highly detailed, coherent, and premium production brief. Return only the core brief text.
- STRICT LENGTH BUDGET: Keep the entire brief under 8 lines total (max 100 words) in a single paragraph.`;

    userMessage = `Create a 5-asset marketing design layout brief for "${finalBrandName}".`;
  } else if (isSlideshowGem) {
    systemInstruction = `You are an elite Chief Strategy Officer, Corporate Communications Director, and AI Prompt Engineer.
Your objective is to generate an incredibly professional, highly creative, and detailed draft prompt for a corporate presentation / slideshow deck tailored to the brand "${finalBrandName}".

The brand industry space is "${industryStr}". The brand tone is "${tone}", its primary location is "${location}", and its core pillars are: ${pillarsStr}.

The prompt you generate MUST serve as a direct prompt to an AI deck generation assistant (such as Gemini Pro Presentation Agent). It must act as a blueprint for drafting a world-class presentation.
Your generated prompt MUST look EXACTLY like one of the following four styles, chosen or synthesized dynamically to best fit the brand guidelines (colors: ${brandColors}, tone: "${tone}", pillars: "${pillarsStr}"):

STYLE 1: Marketing/Campaign Launch
"Act as the Global Head of Marketing for ${finalBrandName}. Draft the content for a 12-slide campaign launch presentation for a new limited-edition or flagship release aimed at a specific key high-growth audience (e.g., Gen Z gamers, urban professionals, or sustainability champions). The overarching theme must be highly creative and culturally plugged-in. Structure the deck to cover: The Core Insight, Target Audience Persona, Phased Digital/Social Rollout, Experiential Pop-Ups/Activations, and KPI Measurement. Maintain an energetic, optimistic, and culturally plugged-in tone. Include a 'Speaker Notes' section for each slide to guide the presenter."

STYLE 2: ESG / Sustainability / Stakeholder Update
"Act as a Corporate Sustainability Director at ${finalBrandName}. Outline a 10-slide presentation updating stakeholders on our 2030 sustainability goals or social impact initiatives. The narrative should focus on three clear pillars: Design (how we design sustainable products/services), Collect (how we handle circularity/collection), and Partner (NGO or local community collaborations). For each slide, provide a concise headline, 3 bullet points of data-driven copy, and a description for a visual placeholder."

STYLE 3: B2B Strategic Alignment / Partner Pitch
"Design the content for a 7-slide B2B strategic alignment presentation intended for ${finalBrandName}'s primary distribution, manufacturing, or retail partners. The objective is to pitch a new smart, AI-powered, or innovative operational technology that optimizes inventory or distribution for localized micro-markets. Outline the slides to flow from the 'Industry/Retail Challenge' to 'The Solution,' 'Revenue Impact for Partners,' and 'Implementation Timeline.' The tone should be B2B-focused, emphasizing mutual ROI, operational efficiency, and the strength of the franchise/partner system."

STYLE 4: Internal Business Expansion / Growth Strategy
"Write the script and slide structure for an internal 5-slide pitch deck defining ${finalBrandName}'s strategy to expand our core portfolio or introduce brand-new product innovations for the local market in ${location}. Include a slide on competitor benchmarking and a slide detailing the localized flavor/feature strategy. Ensure the language balances consumer-centric brand building with rigorous market sizing."

STRICT RULES:
- Output ONLY the single generated prompt.
- Do NOT wrap in quotes.
- Do NOT include any introductory or conversational metalanguage (e.g., do NOT say "Here is a prompt for you", "Based on your guidelines...", etc.).
- The output must be completely ready-to-use, highly professional, and natural. Use the real values for brand name, industry, tone, and location.`;

    userMessage = `Develop a highly sophisticated, specific, and professionally written corporate presentation draft prompt for "${finalBrandName}".`;
  } else if (isVideoGem) {
    systemInstruction = `You are a professional copywriter. Write a simple, elegant sequence of 5 sentences describing direct steps of a scene for "${finalBrandName}" at "${location}" involving the product. Do NOT use fancy photographic, cinematographic or lighting buzzwords. No labels, prefixes, or line numbers.
STRICT LENGTH BUDGET: Output exactly 5 short, elegant sentences (1 sentence per line).`;
    userMessage = `Write a clean, beautiful human-style narrative story direction for "${finalBrandName}".`;
  } else if (regionType === 'creative' && !promptEngineSettings.enableAiRewrite) {
    systemInstruction = `You are a helpful copywriter. Write a simple, clean, and direct one-sentence image description suitable for "${finalBrandName}". Keep it extremely short (under 20 words) and specific. No text. Avoid narrative prose or photographic lighting buzzwords.`;
    userMessage = `Write a simple, clean, highly precise direct image prompt for "${finalBrandName}".`;
  } else {
    systemInstruction = `You are an elite Creative Director and Visual Designer.
Write a short, highly specific, precise, and crisp design prompt for an image generator (like Imagen or Midjourney) for "${finalBrandName}" (Industry: "${industryStr}").
The brand location/region is "${location}", tone is "${tone}", with color palette ${brandColors}.

Our absolute core goal is to generate short, specific, and crisp prompts rather than long-winded, overly narrative ones.

CRITICAL PLACEMENT & CONTENT REQUIREMENTS:
Every prompt you generate MUST have the following structure:
- [Target Media] + [Occasion/Campaign] + [Specific core subject/scene] + [Design Suggestion & Typography]
- Keep the entire prompt very short and concise (under 20-25 words total).
- Avoid long-winded storytelling or heavy photographic/technical buzzwords (never say 'Rembrandt split lighting', 'volumetric rays', or raw camera settings).

CRITICAL OCCASION & CAMPAIGN DIVERSITY RULES:
- DO NOT default to or repeat "Diwali" or "Holi" unless explicitly requested by the user. Getting stuck on any single repetitive festival is a system failure. You must think of fresh, unique options.
- You MUST select a completely unique and diverse occasion, campaign, celebration, season, or UN Observance for EVERY single generation. This is crucial for variety!
- Draw randomly from a vast set of global and local occasions matching the brand context, such as:
  * UN International Days: Earth Day, World Space Week, World Water Day, World Environment Day, International Women's Day, World Oceans Day, World Food Day, World Coffee Day, World Health Day, International Day of Forests, World Oceans Day, etc.
  * Seasonal/Secular milestones: Summer Solstice, Winter Blue Frost Edit, Autumn Golden Harvest, Spring Equinox, Coastal Getaway, Vintage Archive Editorial.
  * Local cultural occasions: Uttarayan, Sakura Spring Festival, Lantern Festival, Mid-Autumn Festival, Oktoberfest, Carnival, local artisan craft weeks, etc.
  * Premium commercial launches: Neo-Sleek Brand Launch, Kinetic Tech Reveal, Future Sustainable Initiative, Vanguard Fashion Showcase, Urban Minimalism Edit.

Examples of the required short, specific, three-layer prompt format:
- "Create an Instagram Creative for Uttarayan with minimalist typography"
- "A LinkedIn Post for modern Earth Day sustainable initiative with elegant green hues and clean serif lettering"
- "Outdoor billboard advertisement for high-fashion activewear campaign styled with bold typography and high contrast"
- "A clean Pinterest Graphic for World Food Day focusing on organic visual design and beautiful typography overlays"
- "An Instagram post for World Coffee Day showcasing a gourmet brew with elegant bold editorial typography"
- "A Twitter header for Spring Equinox Floral Collection with soft branding and crisp typography"

Generate a fresh, highly diverse prompt that fits the visual identity of "${finalBrandName}" (industrial context: "${industryStr}"). Make sure it strictly includes Target Media, a compelling Occasion/Campaign (using a diverse global/local/UN occasion), and a concrete Design Suggestion.`;

    userMessage = `Generate an exceptionally short, specific, and precise creative design prompt matching the visual identity of "${finalBrandName}". It MUST integrate a highly creative, unique global/local/UN occasion or campaign, target media, and typography/design suggestion.`;
  }

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemInstruction,
          candidateCount: 1,
          temperature: 0.9
        }
      })
    );

    let text = response.text?.trim() || '';
    text = text.replace(/^["'«“‘(]|["'»”’)]$/g, '').trim();

    if (isVideoGem) {
      let lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      lines = lines
        .map((line) => {
          return line
            .replace(/^(Line|Scene|Shot|Moment|Step|Part)\s*\d+[:.-]?\s*/gi, '')
            .replace(/^\d+[:.-]?\s*/, '')
            .trim();
        })
        .filter(Boolean);

      lines = lines.filter((line) => {
        const lower = line.toLowerCase();
        return !lower.startsWith("here is") && !lower.startsWith("cinematic story") && !lower.startsWith("sure, here");
      });

      if (lines.length >= 3) {
        if (lines.length > 5) {
          lines = lines.slice(0, 5);
        } else {
          while (lines.length < 5) {
            lines.push(`A smooth camera movement completes this cinematic moment with stunning atmospheric lighting.`);
          }
        }
        return lines.join('\n');
      }
    }

    if (text.length > 10) {
      return text;
    }
  } catch (e) {
    console.error("Gemini failed in generateFastPrompt:", e);
  }

  if (regionType === 'brief') {
    return `Crafting timeless premium ${industryStr.toLowerCase()} experiences driven by ${pillarsStr}, centered around exquisite quality.`;
  } else if (regionType === 'campaign-concept') {
    return `The ${finalBrandName} Ascent: A high-end lifestyle launch campaign celebrating ${finalBrandName}'s commitment to ${pillarsStr}, featuring minimalist contemporary art direction suited for ${location}.`;
  } else if (isSlideshowGem) {
    return `Act as the Chief Strategy Officer for ${finalBrandName}. Draft the content for a 10-slide B2B strategic alignment and growth presentation for our expansion in ${location}. Structure the deck to cover: Market Opportunity, Competitor Benchmarking, The AI-Powered Solution to optimize operational efficiency, Localized Strategy based on our pillars of ${pillarsStr}, and financial ROI impact. Maintain a ${tone.toLowerCase()} and executive-level tone. Include a concise headline, 3 data-driven bullet points of copy, and a visual placeholder description for each slide.`;
  } else if (isVideoGem) {
    const pContext = hasProductContext ? "the sleek product" : "the brand's handcrafted premium product";
    const fContext = hasFaceContext ? "the serene model" : `the premium ${ethnicity} character`;
    return [
      `A beautifully lit studio setting filled with soft morning light as ${fContext} slowly steps into the frame.`,
      `Close-up on ${fContext}'s calm and focused eyes as they lift their gaze with a warm, subtle smile.`,
      `The camera smoothly glides down, focusing on ${pContext} standing elegantly amongst polished stone surfaces.`,
      `With a precise and gentle touch, ${fContext} interacts with the beautiful texture of ${pContext}.`,
      `A soft golden sunbeam sweeps across the space, bathing the scene in a premium and breathtaking final shot.`
    ].join('\n');
  } else {
    return `Minimalist studio configuration showcasing the exquisite flagship product surrounded by beautiful textured ${location} stone accents under dramatic volumetric soft-box rays, rendered in a striking palette of ${brandColors}`;
  }
}
