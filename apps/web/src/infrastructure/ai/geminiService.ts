/**
 * Client Creative Generation Services (Images, Slides, Storylines, Video, Audio, Campaigns).
 * Preserves exact fallback cascade, JSON schemas, and generation workflows.
 */

import { Modality, Type } from "@google/genai";
import { getAI, parseJSON, withRetry, generateHistoryTitle } from "./geminiClient.js";
import { apiClient } from '../api/apiClient.js';
import { MODELS, promptEngineSettings } from "./modelRegistry.js";

import {
  getSupportedLogoData,
  appendAssetsToParts,
  generateBrandIdentity,
  initializeBrandKit,
  generateBrandLogoAI,
  analyzeAsset,
  generateFastPrompt
} from "./promptBuilders.js";
import { pcmToWav } from '@utils/audio.js';
import type { Gem, SlideStructure, StorylineStructure } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';

export {
  generateFastPrompt,
  generateBrandLogoAI,
  analyzeAsset,
  initializeBrandKit,
  generateBrandIdentity,
  generateHistoryTitle
};

export interface CampaignStrategistResult {
  campaignNames: string[];
  coreBigIdea: string;
  brandPositioningLine: string;
  taglinesAndHooks: string[];
  contentPillars: { title: string; strategy: string }[];
  platformWiseStrategy: { platform: string; strategy: string }[];
  creativeConcepts: { title: string; format: string; description: string }[];
  visualDirection: {
    colors: string;
    lighting: string;
    cameraStyle: string;
    typography: string;
    editingStyle: string;
    artDirection: string;
    motionLanguage: string;
  };
  copywritingSystem: {
    headlines: string[];
    ctas: string[];
    captions: string[];
    adCopy: string;
    longForm: string;
    emailCopy: string;
    shortHooks: string[];
  };
  funnelStructure: {
    awareness: string;
    contentEngagement: string;
    consideration: string;
    conversion: string;
    retention: string;
  };
  contentCalendar: {
    rollout: string;
    sequencing: string;
    teaser: string;
    reveal: string;
  };
  performanceStrategy: {
    retargeting: string;
    segmentation: string;
    abTesting: string;
    influencers: string;
    viral: string;
  };
  campaignLanguage?: string;
  countryRegion?: string;
}

export interface AssetBriefsResult {
  images: Array<{ title: string; prompt: string }>;
  videos: Array<{ title: string; prompt: string }>;
  copies: Array<{ title: string; topic: string }>;
}

export async function generateCreative(
  gem: Gem,
  prompt: string,
  config?: {
    aspectRatio?: string;
    guidelines?: BrandGuidelines;
    model?: string;
    logicModel?: string;
    videoDuration?: string;
    videoShotType?: string;
    imageStyle?: string;
    assets?: any[];
    bakeLogo?: boolean;
  }
) {
  const guidelinesContext = config?.guidelines
    ? `
    Current Brand Guidelines for ${config.guidelines.name} (${config.guidelines.industry}):
    - Tone: ${config.guidelines.tone}
    - Pillars: ${config.guidelines.pillars.join(', ')}
    - Primary Colors: ${config.guidelines.colors.join(', ')}
    - Typography: ${config.guidelines.typography.primary} (Headings), ${config.guidelines.typography.secondary} (Body)
    - Location/Target Region: ${config.guidelines.location || 'Not Specified'}
    - Preferred Voice Accent Style: ${config.guidelines.voiceAccentStyle || 'Not Specified'}
    - Preferred Visual Ethnicity Demographics: ${config.guidelines.visualEthnicityStyle || 'Not Specified'}
  `
    : '';

  if (gem.type === 'image') {
    const styleInstruction =
      config?.imageStyle && promptEngineSettings.enablePhotoStyling
        ? `\n\nVisual Style: ${config.imageStyle}`
        : '';
    let culturalVisualInstruction = '';
    if (
      promptEngineSettings.enableGuidelines &&
      (config?.guidelines?.visualEthnicityStyle || config?.guidelines?.location)
    ) {
      culturalVisualInstruction = `\n\nCRITICAL CULTURAL/REGIONAL CONTEXT: Any human model, face, or character generated MUST look like they belong to the '${config.guidelines.visualEthnicityStyle}' ethnic demographic as per the brand guidelines. The clothing, background setting, and props must naturally and premiumly reflect a lifestyle scene in ${config.guidelines.location}. For example, if location is India and style is Indian, avoid western default faces/settings, and focus on beautiful, contemporary, high-fashion Indian characters and environments.`;
    }

    const finalGuidelinesContext = promptEngineSettings.enableGuidelines ? guidelinesContext : '';
    const finalSystemInstruction = promptEngineSettings.enablePhotoStyling
      ? gem.systemInstruction
      : 'Create a clean, natural brand image.';

    const parts: any[] = [
      {
        text: `${finalSystemInstruction}\n${finalGuidelinesContext}${styleInstruction}${culturalVisualInstruction}\n\nPrompt: ${prompt}`
      }
    ];

    await appendAssetsToParts(parts, config?.assets);

    if (!promptEngineSettings.allowTextOnAssets) {
      parts[0].text +=
        "\n\nCRITICAL TEXT OVERLAY RESTRICTION: ABSOLUTELY NO text, letters, typography, font, labels, captions, subtitles, words, logos, names, branding, or alphabetical/numerical overlays are allowed inside the generated image. All visual elements, backgrounds, product surfaces, and scenes must be completely clean of any text/words/labels. Make the image completely textless and empty of characters.";
    }

    if (config?.bakeLogo !== false && config?.guidelines?.logo && promptEngineSettings.allowTextOnAssets) {
      const supportedLogo = await getSupportedLogoData(config.guidelines.logo);
      if (supportedLogo) {
        parts.push({
          inlineData: {
            mimeType: supportedLogo.mimeType,
            data: supportedLogo.data
          }
        });
        parts[0].text +=
          "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. Incorporate it into the creative EXACTLY ONCE. The logo MUST be a clean, transparent overlay with NO background box, border, or container. It should blend naturally into the scene as if it were part of the environment or a high-end watermark. ABSOLUTELY NO grey, white, or colored background squares around the logo. DO NOT generate any other text or logos.";
      }
    } else {
      parts[0].text +=
        "\n\nCRITICAL: DO NOT overlay or draw any logo, text, or brand name on the image. Generate only the clean background scene, leaving space if needed for a layout watermark to be added later on.";
    }

    const modelId = config?.model || 'openai/gpt-image-2';
    const isFal = modelId.startsWith('fal-ai/') || modelId === 'openai/gpt-image-2' || !modelId.startsWith('gemini-');

    if (isFal) {
      const referenceImages: string[] = [];
      if (config?.assets) {
        config.assets.forEach((asset: any) => {
          if (asset.type === 'image' && asset.data) {
            referenceImages.push(asset.data);
          }
        });
      }

      const renderData = await apiClient.post<any>("/api/campaign/render", {
        prompt: parts[0].text,
        size: config?.aspectRatio || '1:1',
        engine: modelId,
        guidelines: config?.guidelines,
        referenceImages: referenceImages
      });
      return {
        type: 'image',
        data: renderData.url,
        newBalance: renderData.newBalance
      };
    }

    const ai = getAI();
    try {
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: modelId,
          contents: { parts },
          config: {
            imageConfig: { aspectRatio: (config?.aspectRatio as any) || "1:1" }
          }
        })
      );

      const imagePart = response.candidates?.[0]?.content?.parts.find((p) => p.inlineData);
      if (imagePart?.inlineData) {
        return {
          type: 'image',
          data: `data:image/png;base64,${imagePart.inlineData.data}`,
          groundingMetadata: response.candidates?.[0]?.groundingMetadata,
          newBalance: (response as any)?.newBalance
        };
      }
    } catch (gErr: any) {
      console.warn("Gemini image generation failed or quota reached, routing to Fal AI engine:", gErr.message);
      try {
        const referenceImages: string[] = [];
        if (config?.assets) {
          config.assets.forEach((asset: any) => {
            if (asset.type === 'image' && asset.data) {
              referenceImages.push(asset.data);
            }
          });
        }
        const renderData = await apiClient.post<any>("/api/campaign/render", {
          prompt: parts[0].text,
          size: config?.aspectRatio || '1:1',
          engine: 'openai-gpt-image-2',
          guidelines: config?.guidelines,
          referenceImages
        });
        if (renderData?.url) {
          return { type: 'image', data: renderData.url, newBalance: renderData.newBalance };
        }
      } catch (renderErr) {
        console.error("Fal AI fallback failed:", renderErr);
      }
      throw gErr;
    }
    throw new Error("No image generated");
  }

  if (gem.type === 'campaign') {
    const ai = getAI();
    const logicModelId = MODELS.TEXT_FAST;
    const imageModelId = config?.model || MODELS.IMAGE_FAST;
    const parts: any[] = [{ text: `${gem.systemInstruction}\n${guidelinesContext}\n\nPrompt: ${prompt}` }];

    await appendAssetsToParts(parts, config?.assets);

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: logicModelId,
        contents: { parts },
        config: {
          systemInstruction: `${gem.systemInstruction}\n\nSTRICT RULES: Your task is to generate a concise, professional marketing campaign in JSON format. \nCRITICAL: You MUST use explicit newline characters (\\n\\n) before and after every markdown heading and paragraph to ensure it formats properly.\nYou MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object. Keep all values extremely concise and avoid any repetitive or nonsensical strings.`,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              copy: { type: Type.STRING },
              concept: { type: Type.STRING },
              imagePrompts: {
                type: Type.ARRAY,
                minItems: 1,
                maxItems: 6,
                items: { type: Type.STRING }
              }
            },
            required: ["copy", "imagePrompts"]
          }
        }
      })
    );

    const result = parseJSON(response.text);
    if (result.copy) {
      result.copy = result.copy.replace(/([^\n])\s*(#{1,6})\s+/g, '$1\n\n$2 ');
    }

    if (!result.imagePrompts || !Array.isArray(result.imagePrompts)) {
      throw new Error("Failed to generate image prompts for campaign.");
    }

    const imagePromises = result.imagePrompts.slice(0, 3).map(async (imgPrompt: string) => {
      try {
        const imageResult = await generateImage(
          imgPrompt,
          config?.guidelines,
          config?.aspectRatio || "16:9",
          imageModelId,
          config?.assets
        );
        return imageResult.url;
      } catch (e) {
        console.error("Failed to generate one of the campaign images:", e);
      }
      return null;
    });

    const images = await Promise.all(imagePromises);

    return {
      type: 'campaign',
      data: {
        copy: result.copy,
        concept: result.concept || prompt,
        images: images.filter(Boolean)
      },
      concept: result.concept || prompt,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  }

  if (gem.type === 'text') {
    const ai = getAI();
    const modelId = config?.model || 'gemini-2.5-flash';
    const isCaptions = gem.id === 'strategy-captions';

    const strictFormatting = isCaptions
      ? "\n\nCRITICAL FORMATTING INSTRUCTION: Deliver clean, high-converting, platform-ready social media captions with engaging hooks, emojis, body copy, hashtags, and platform recommendations. ABSOLUTELY DO NOT output any raw SVG code, HTML tags, CSS, XML, programming code, or internal thoughts. Output ONLY formatted Markdown copy."
      : "\n\nCRITICAL FORMATTING INSTRUCTION: Deliver clean, high-impact brand copywriting in Markdown format. ABSOLUTELY DO NOT output any raw SVG code, HTML tags, XML, or code blocks. Output ONLY formatted Markdown text.";

    const parts: any[] = [{ text: `${gem.systemInstruction}\n${guidelinesContext}${strictFormatting}\n\nPrompt: ${prompt}` }];

    await appendAssetsToParts(parts, config?.assets);

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          systemInstruction: `${gem.systemInstruction}\n\nStrict Rule: Output ONLY clean human-readable marketing copy in Markdown. Never generate SVG, HTML, code tags, or developer metadata.`
        }
      })
    );

    let cleanedText = response.text || '';
    // Strip any accidental raw <svg>...</svg> blocks or ```xml ```svg code fences
    cleanedText = cleanedText.replace(/<svg[\s\S]*?<\/svg>/gi, '').trim();
    cleanedText = cleanedText.replace(/```(?:svg|xml|html)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, '').trim();

    return {
      type: 'text',
      data: cleanedText,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  }

  if (gem.type === 'video') {
    const ai = getAI();
    const modelId = config?.model || 'veo-3.1-fast-generate-preview';
    const logicModelId = config?.logicModel || 'gemini-2.5-flash';

    const shotTypeInstruction = config?.videoShotType ? `\nShot Type: ${config.videoShotType}` : '';

    const parts: any[] = [
      {
        text: `You are an elite commercial video Creative Director.
        The user wants an impactful video promo for their brand: ${config?.guidelines?.name}.
        We need a high-impact, short, and precise visual prompt for a text-to-video (Veo) compiler engine.
        ${shotTypeInstruction}
        
        CRITICAL: Your absolute goal is to write a short, specific, and crisp prompt. Avoid overly long, narrative, technical, or descriptive word-salad. Focus on concrete visual action, motion, or scenery.
        
        Requirements for the visualPrompt:
        - Max 1-2 short sentences (about 15-30 words).
        - Make it extremely clean, precise, and visually vivid.
        - Specify elegant cameras (e.g., macro zoom, slow-motion top-down sweep) and high-quality focus.
        
        ${
          !promptEngineSettings.allowTextOnAssets
            ? "CRITICAL VIDEO TEXT CONSTRAINT: The visual prompt MUST NOT specify any text, labels, overlays, names, typography, branding, logos, titles, words, captions, or alphabetical/numerical graphics to appear onscreen or on any of the product surfaces. The generated video must be 100% clean of any letters or typographic visual overlays. Make it a purely clean cinematic scenery/product shot without any text."
            : "CRITICAL: The visual prompt can optionally describe the brand logo appearing naturally on the packaging or as a clean watermark, but must remain extremely short and non-redundant. No grey, white, or colored background squares around the logo."
        }
        Also provide a 1-line voice-over (VO) and a music style recommendation that fits this video.
  
        CRITICAL CULTURAL AND ACCENT ALIGNMENT: 
        1. Human models/actors described in the visualPrompt MUST strictly look clearly representing the '${
          config?.guidelines?.visualEthnicityStyle || 'native'
        }' ethnic demographic and match the setting of '${
          config?.guidelines?.location || 'the target region'
        }'.
        2. The voiceOver (VO) text MUST be tailored to be spoken beautifully in the '${
          config?.guidelines?.voiceAccentStyle || 'local'
        }' accent or style.
        
        ${guidelinesContext}
        
        User Prompt: ${prompt}
        
        Return a JSON object with the following structure:
        {
          "visualPrompt": "The short, specific, and crisp video prompt (max 150 chars/30 words)",
          "voiceOver": "A short, punchy 1-line voice over",
          "musicStyle": "Description of the music style (e.g., 'Subtle acoustic, elegant ambient')",
          "cinematographyNotes": "Brief notes on the camera work and lighting"
        }`
      }
    ];

    await appendAssetsToParts(parts, config?.assets);

    let concept: any;
    if (promptEngineSettings.enableCinematicStoryboard) {
      const conceptResponse = await withRetry(() =>
        ai.models.generateContent({
          model: logicModelId,
          contents: { parts },
          config: {
            systemInstruction: `${gem.systemInstruction}\n\nSTRICT RULES: Your task is to generate a concise, professional video concept in JSON format. You MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object. Keep all values extremely concise and avoid any repetitive or nonsensical strings.`,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                visualPrompt: { type: Type.STRING },
                voiceOver: { type: Type.STRING },
                musicStyle: { type: Type.STRING },
                cinematographyNotes: { type: Type.STRING }
              },
              required: ["visualPrompt", "voiceOver", "musicStyle", "cinematographyNotes"]
            }
          }
        })
      );

      try {
        concept = parseJSON(conceptResponse.text);
      } catch (e) {
        console.error("Failed to parse video concept:", e);
        concept = {
          visualPrompt: prompt,
          voiceOver: "",
          musicStyle: "",
          cinematographyNotes: ""
        };
      }
    } else {
      concept = {
        visualPrompt: prompt,
        voiceOver: "",
        musicStyle: "Ambient acoustic",
        cinematographyNotes: "Direct rendering of raw user request."
      };
    }

    let startImagePayload: any = undefined;
    let endImagePayload: any = undefined;
    const ingredientsPayload: any[] = [];

    if (config?.assets && Array.isArray(config.assets)) {
      const startAsset = config.assets.find((a) => a.isFirstFrameContext);
      if (startAsset) {
        const supported = await getSupportedLogoData(startAsset.data);
        if (supported) {
          startImagePayload = {
            imageBytes: supported.data,
            mimeType: supported.mimeType
          };
        }
      }

      const endAsset = config.assets.find((a) => a.isLastFrameContext);
      if (endAsset) {
        const supported = await getSupportedLogoData(endAsset.data);
        if (supported) {
          endImagePayload = {
            imageBytes: supported.data,
            mimeType: supported.mimeType
          };
        }
      }

      const ingredientAssets = config.assets.filter((a) => a.isIngredientsContext);
      for (const ing of ingredientAssets) {
        const supported = await getSupportedLogoData(ing.data);
        if (supported) {
          ingredientsPayload.push({
            image: {
              imageBytes: supported.data,
              mimeType: supported.mimeType
            },
            referenceType: 'ASSET'
          });
        }
      }
    }

    const isFalVideo = modelId === 'bytedance/seedance-2.0' || modelId === 'kling-video';
    if (isFalVideo) {
      const queueJson = await apiClient.post<any>("/api/campaign/video", {
        prompt: concept.visualPrompt,
        size: config?.aspectRatio || '16:9',
        engine: modelId,
        guidelines: config?.guidelines
      });
      return {
        type: 'video_op',
        operationId: queueJson.request_id || queueJson.operationId,
        operation: {
          done: false,
          request_id: queueJson.request_id || queueJson.operationId,
          status_url: queueJson.status_url,
          response_url: queueJson.response_url,
          engine: modelId
        },
        concept
      };
    }

    let finalModelId = modelId;
    let finalResolution = modelId === 'veo-3.1-lite-generate-preview' ? '720p' : '1080p';
    let finalAspectRatio = (config?.aspectRatio as any) || '16:9';

    if (ingredientsPayload.length > 0) {
      finalModelId = 'veo-3.1-generate-preview';
      finalResolution = '720p';
    }

    const operation = await withRetry(() =>
      ai.models.generateVideos({
        model: finalModelId,
        prompt: concept.visualPrompt,
        image: startImagePayload,
        config: {
          aspectRatio: finalAspectRatio,
          numberOfVideos: 1,
          durationSeconds: parseInt(config?.videoDuration || '5', 10) || 5,
          personGeneration: 'ALLOW_ADULT' as any,
          resolution: finalResolution as any,
          lastFrame: endImagePayload,
          referenceImages: ingredientsPayload.length > 0 ? ingredientsPayload : undefined
        }
      })
    );

    return { type: 'video_op', operationId: operation.name, operation, concept };
  }

  if (gem.type === 'slideshow') {
    const ai = getAI();
    const logicModelId = MODELS.TEXT_FAST;
    const parts: any[] = [
      {
        text: `Generate a cohesive, highly professional deck of 4 presentation slides based on this prompt: ${prompt}.
        ${guidelinesContext}
        Use Google Search to find real facts, figures, and details relevant to the brand.
  
        Structure the 4 slides in a logical business flow:
        1. Slide 1: Title / Strategic Overview (Cover style)
        2. Slide 2: Strategic Challenge / Market Opportunity
        3. Slide 3: Core Solution / Execution Pillars
        4. Slide 4: Growth, Localized Activation & Impact
  
        For each slide, provide:
        - title: A short, punchy heading (under 8 words).
        - content: 2-3 high-impact concise bullet points (each under 15 words) containing data-oriented strategic concepts.
        - imagePrompt: A short, precise visual prompt to generate a premium background image for this slide. Keep it under 20 words, strictly specific and clean without narrative prose or technical photography jargon.
        
        Return as a JSON object containing an array of slides under the key "slides".`
      }
    ];

    if (config?.guidelines?.logo) {
      const supportedLogo = await getSupportedLogoData(config.guidelines.logo);
      if (supportedLogo) {
        parts.push({
          inlineData: {
            mimeType: supportedLogo.mimeType,
            data: supportedLogo.data
          }
        });
        parts[0].text +=
          "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. Ensure it is integrated into the presentation design conceptually. The logo MUST be a clean, transparent overlay with NO background box, border, or container. It should be well-positioned and blend seamlessly—ABSOLUTELY NO grey, white, or colored background squares around the logo.";
      }
    }

    await appendAssetsToParts(parts, config?.assets);

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: logicModelId,
        contents: { parts },
        config: {
          systemInstruction: `${gem.systemInstruction}\n\nSTRICT RULES: Your task is to generate a concise, professional presentation slide deck in JSON format. You MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object. Keep all values extremely concise and avoid any repetitive or nonsensical strings.`,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slides: {
                type: Type.ARRAY,
                minItems: 4,
                maxItems: 4,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.ARRAY, items: { type: Type.STRING } },
                    imagePrompt: { type: Type.STRING }
                  },
                  required: ["title", "content", "imagePrompt"]
                }
              }
            },
            required: ["slides"]
          }
        }
      })
    );

    try {
      const parsed = parseJSON(response.text);
      const slides = parsed.slides || [parsed];
      return {
        type: 'slideshow',
        data: slides,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    } catch (e) {
      console.error("Failed to parse slideshow:", e);
      throw new Error("Failed to generate slide structure.");
    }
  }

  if (gem.type === 'audio') {
    const ai = getAI();
    const logicModelId = MODELS.TEXT_FAST;
    const accentStyle = config?.guidelines?.voiceAccentStyle || 'Indian English';

    let audioScriptPrompt = `Generate a voice-over script or monologue for '${gem.name}' based on this user prompt: '${prompt}'. 
      ${guidelinesContext}
  
      CULTURAL AND PHRASING CONTEXT:
      The brand voiceover preference is '${accentStyle}'.
      The text script MUST be written naturally to sound authentic when spoken in '${accentStyle}'.
      - If Hinglish is the active style, generate natural-flowing dialogue containing a beautiful, creative mix of Hindi and English.
      - If Indian English is active, write elegant, formal, or high-fashion Indian-style phrasing.
      Keep the script concise (30-65 words), clear, and suitable for the requested duration. Avoid any stage directions, narration descriptions, sound effect markers, or conversational filler! Return ONLY the direct speakable voiceover script text.`;

    const scriptResponse = await withRetry(() =>
      ai.models.generateContent({
        model: logicModelId,
        contents: audioScriptPrompt
      })
    );
    const script = scriptResponse.text?.trim() || "Hello, this is a generated audio track.";

    try {
      const audioData = await generateTTS(script, 'Kore', 'Professional');
      return {
        type: 'audio',
        data: audioData,
        script: script
      };
    } catch (ttsErr) {
      console.error("Audio generation failed:", ttsErr);
      return {
        type: 'text',
        data: `Script: ${script}\n\n(Voice synthesis unavailable)`,
        groundingMetadata: scriptResponse.candidates?.[0]?.groundingMetadata
      };
    }
  }

  if (gem.type === 'storyline') {
    const ai = getAI();
    const logicModelId = MODELS.TEXT_FAST;
    const parts: any[] = [
      {
        text: `Generate a 6-8 image progressive storyline based on this prompt: ${prompt}.
        ${guidelinesContext}
        Provide a storyTitle and a list of scenes, each with a chapterTitle, narrative, and a short, precise imagePrompt.
        CRITICAL PROMPT CONSTRAINT: Each imagePrompt MUST be very short, specific, and crisp (under 25 words). Avoid overly long narrative stories, technical photography keywords, or buzzwords. Focus on concrete subjects, actions, or simple layouts.
        Return as a JSON object.`
      }
    ];

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: logicModelId,
        contents: { parts },
        config: {
          systemInstruction: `${gem.systemInstruction}\n\nSTRICT RULES: Your task is to generate a concise, professional storyline in JSON format. You MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object.`,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              storyTitle: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                minItems: 4,
                maxItems: 8,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    chapterTitle: { type: Type.STRING },
                    narrative: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                  },
                  required: ["chapterTitle", "narrative", "imagePrompt"]
                }
              }
            },
            required: ["storyTitle", "scenes"]
          }
        }
      })
    );

    try {
      const storyline = parseJSON(response.text);
      if (storyline.scenes && Array.isArray(storyline.scenes)) {
        storyline.scenes.forEach((scene: any) => {
          if (scene.narrative) {
            scene.narrative = scene.narrative.replace(/([^\n])\s*(#{1,6})\s+/g, '$1\n\n$2 ');
          }
        });
      }
      return {
        type: 'storyline',
        data: storyline,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    } catch (e) {
      console.error("Failed to parse storyline:", e);
      throw new Error("Failed to generate storyline structure.");
    }
  }

  throw new Error(`Unsupported gem type: ${gem.type}`);
}

export async function generateImage(
  prompt: string,
  guidelines?: BrandGuidelines,
  aspectRatio: string = "16:9",
  model?: string,
  assets?: any[],
  bakeLogo: boolean = true
): Promise<{ url: string; groundingMetadata?: any }> {
  const guidelinesContext =
    guidelines && promptEngineSettings.enableGuidelines
      ? `
      Current Brand Guidelines for ${guidelines.name}:
      - Pillars: ${guidelines.pillars.join(', ')}
      - Primary Colors: ${guidelines.colors.join(', ')}
      - Typography: ${guidelines.typography.primary} (Headings), ${guidelines.typography.secondary} (Body)
    `
      : '';

  const systemPromptHeader = promptEngineSettings.enablePhotoStyling
    ? `You are a Lead Visual Designer. Create a high-quality, professional corporate background image.`
    : `Create a clean, natural image.`;

  const parts: any[] = [{ text: `${systemPromptHeader}\n${guidelinesContext}\n\nPrompt: ${prompt}` }];

  if (!promptEngineSettings.allowTextOnAssets) {
    parts[0].text +=
      "\n\nCRITICAL TEXT OVERLAY RESTRICTION: ABSOLUTELY NO text, letters, typography, font, labels, captions, subtitles, words, logos, names, branding, or alphabetical/numerical overlays are allowed inside the generated image. All visual elements, backgrounds, product surfaces, and scenes must be completely clean of any text/words/labels. Make the image completely textless and empty of characters.";
  }

  if (bakeLogo && guidelines?.logo && promptEngineSettings.allowTextOnAssets) {
    const supportedLogo = await getSupportedLogoData(guidelines.logo);
    if (supportedLogo) {
      parts.push({
        inlineData: {
          mimeType: supportedLogo.mimeType,
          data: supportedLogo.data
        }
      });
      parts[0].text +=
        "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. Incorporate it into the creative EXACTLY ONCE. The logo MUST be a clean, transparent overlay with NO background box, border, or container. It should blend naturally into the scene as if it were part of the environment or a high-end watermark. ABSOLUTELY NO grey, white, or colored background squares around the logo.";
    }
  } else {
    parts[0].text +=
      "\n\nCRITICAL: DO NOT overlay or draw any logo, text, or brand name on the image. Generate only the clean, professional corporate photoshoot background scene.";
  }

  await appendAssetsToParts(parts, assets);

  const modelId = model || 'openai/gpt-image-2';
  const isFal = modelId.startsWith('fal-ai/') || modelId === 'openai/gpt-image-2' || !modelId.startsWith('gemini-');

  if (isFal) {
    const referenceImages: string[] = [];
    if (assets) {
      assets.forEach((asset: any) => {
        if (asset.type === 'image' && asset.data) {
          referenceImages.push(asset.data);
        }
      });
    }

    const renderData = await apiClient.post<any>("/api/campaign/render", {
      prompt: parts[0].text,
      size: aspectRatio,
      engine: modelId,
      guidelines: guidelines,
      referenceImages: referenceImages
    });
    return {
      url: renderData.url
    };
  }

  const ai = getAI();
  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          imageConfig: { aspectRatio: (aspectRatio as any) || "1:1" }
        }
      })
    );

    const imagePart = response.candidates?.[0]?.content?.parts.find((p) => p.inlineData);
    if (imagePart?.inlineData) {
      return {
        url: `data:image/png;base64,${imagePart.inlineData.data}`,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    }
  } catch (gErr: any) {
    console.warn("Gemini image generator failed, recovering with Fal AI:", gErr.message);
    try {
      const renderData = await apiClient.post<any>("/api/campaign/render", {
        prompt: parts[0].text,
        size: aspectRatio,
        engine: 'openai-gpt-image-2',
        guidelines: guidelines
      });
      if (renderData?.url) {
        return { url: renderData.url };
      }
    } catch (renderErr) {
      console.error("Fal image fallback failed:", renderErr);
    }
    throw gErr;
  }

  throw new Error("Failed to generate image");
}

export async function generateTTS(
  text: string,
  voice: string = 'Kore',
  emotion: string = 'Professional'
): Promise<string> {
  const data = await apiClient.post<{ audioPcmBase64?: string }>("/api/ai/tts", { text, voice, emotion });
  if (data?.audioPcmBase64) {
    return pcmToWav(data.audioPcmBase64);
  }
  throw new Error("Failed to generate audio");
}


export async function pollVideo(operation: any) {
  if (operation && (operation.engine || operation.status_url)) {
    return await apiClient.post<any>("/api/campaign/video-poll", { operation });
  }
  const ai = getAI();
  return await withRetry(() => ai.operations.getVideosOperation({ operation }));
}

export async function generateCampaignStrategistCampaign(
  brandGuidelines: BrandGuidelines,
  answers: Record<string, string>
): Promise<CampaignStrategistResult> {
  const ai = getAI();
  const prompt = `You are a legendary Chief Strategy Officer & Brand Architect at a world-class creative agency.
  Your mission is to compile the responses gathered during our discovery session and build a definitive, culturally intelligent, and emotionally sharp campaign system.
  
  CRITICAL GENERALIZATION & BRAND GROUNDING MANDATES:
  - This is an enterprise-grade generic generative system that supports all business sizes, startup categories, industries, and niches.
  - You MUST strictly build the campaign concept around the active Brand guidelines name: "${brandGuidelines.name}", active industry: "${brandGuidelines.industry}", and core pillars: "${brandGuidelines.pillars?.join(', ') || 'Innovation'}".
  - NEVER output any skincare, cosmetics, saffron, EverYuth, or wellness-specific campaigns unless the active brandGuidelines industry or name explicitly indicates that it is a skincare/beauty company.
  - Do NOT hallucinate skincare/wellness drops, creams, or Himalayan organic assets if we are working on a tech, finance, lifestyle, fashion, food, auto, or other generic sector brand. Ground the concepts 100% in the real industry: "${brandGuidelines.industry}".

  CRITICAL LANGUAGE & GEOGRAPHY LOCALIZATION DISCIPLINE:
  - You MUST evaluate the specified target language and country/region requirements under DISCOVERY GATHERED CONTEXT and WORKSHOP ANSWERS below.
  - If a Target Campaign Language is specified (e.g., Hindi, Spanish, French, Japanese, Bengali, Marathi, Tamil, etc.) and it is NOT English, you MUST generate and write all consumer-facing output values (including campaign names, raw positioning lines, taglines/hooks, content pillar titles, creative concept titles, headlines, captions, CTAs, adCopy, longForm, emailCopy, and shortHooks) ENTIRELY inside that specified target language (with appropriate fonts/alphabets, e.g. Devanagari script for Hindi/Marathi, etc.).
  - If a Target Country/Region is specified, adapt all platforms, cultural contexts, visual moods, and conversion triggers to fit that local territory natively.

  CONTEXT GATHERED:
  - Brand Guidelines name: ${brandGuidelines.name}
  - Brand Guidelines industry: ${brandGuidelines.industry}
  - Brand Guidelines tone: ${brandGuidelines.tone}
  - Brand Guidelines pillars: ${brandGuidelines.pillars?.join(', ')}
  - Brand Guidelines colors: ${brandGuidelines.colors?.join(', ')}
  - Brand Guidelines base location: ${brandGuidelines.location || 'India'}
  
  DISCOVERY WORKSHOP ANSWERS:
  1. Campaign Type & Goal: ${answers.campaignTypeGoal || "Product brand campaign, driving high sales and hype."}
  2. Brand Understanding & USP: ${answers.brandUnderstanding || "No custom USP specified; default to brand guidelines core pillars: " + brandGuidelines.pillars?.join(', ')}
  3. Target Audience & Reaction: ${answers.targetAudience || "General target demographic matching " + brandGuidelines.industry}
  4. Platforms & Channels selected: ${answers.timelinePlatforms || "1-month rollout across main platforms."}
  5. Content Deliverables & Style/Aesthetic: ${answers.contentStyle || "High-end style matching " + brandGuidelines.tone}
  6. Brand Assets & Inspiration: ${answers.assetsInspiration || "Brand kit and identity pillars"}
  7. Budget, Scale & Amplification: ${answers.budgetScale || "Standard scale campaign"}
  
  TASK:
  Analyze this information deeply through the following lenses: brand archetype, target audience pain points, memetic potential, platform-native content behavior, and emotional hooks.
  Compile a highly detailed multi-platform campaign. You MUST return exactly the JSON format requested by the schema.
  
  STRICT REDACTIONS REQUIRED:
  Do NOT, under any circumstance, mention, display, or name ANY of the following in any of the values, titles, headers, descriptions, or properties:
  "Gemini", "Fal", "Fal.ai", "GPT Image", "Kling", "Veo", "Seedance". Replace them with "System AI", "Enterprise Intelligent Engine", "Native Model", "Commercial Plus Engine", or "Cinematic High Engine" if referencing models or generation systems. Always keep references anonymous, sleek, and high-end.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction:
          "You are an elite Director of Strategy. You output valid JSON conforming exactly to the requested scheme with high depth, zero fluff, and exquisite copywriting.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaignNames: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 3 distinct, high-impact campaign name candidates."
            },
            coreBigIdea: { type: Type.STRING, description: "The central core creative mechanism or overarching campaign narrative." },
            brandPositioningLine: { type: Type.STRING, description: "One single sharp positioning line or manifesto statement." },
            taglinesAndHooks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 5 compelling launch taglines or audience hooks."
            },
            contentPillars: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  strategy: { type: Type.STRING }
                },
                required: ["title", "strategy"]
              },
              description: "Exactly 3 structured content pillars."
            },
            platformWiseStrategy: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  strategy: { type: Type.STRING }
                },
                required: ["platform", "strategy"]
              },
              description: "Platform-specific engagement strategy for relevant systems (e.g. Instagram, TikTok, LinkedIn, Search, YouTube)."
            },
            creativeConcepts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  format: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "format", "description"]
              },
              description: "Exactly 3 clever, production-ready creative concepts/moments."
            },
            visualDirection: {
              type: Type.OBJECT,
              properties: {
                colors: { type: Type.STRING },
                lighting: { type: Type.STRING },
                cameraStyle: { type: Type.STRING },
                typography: { type: Type.STRING },
                editingStyle: { type: Type.STRING },
                artDirection: { type: Type.STRING },
                motionLanguage: { type: Type.STRING }
              },
              required: ["colors", "lighting", "cameraStyle", "typography", "editingStyle", "artDirection", "motionLanguage"]
            },
            copywritingSystem: {
              type: Type.OBJECT,
              properties: {
                headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                ctas: { type: Type.ARRAY, items: { type: Type.STRING } },
                captions: { type: Type.ARRAY, items: { type: Type.STRING } },
                adCopy: { type: Type.STRING },
                longForm: { type: Type.STRING },
                emailCopy: { type: Type.STRING },
                shortHooks: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["headlines", "ctas", "captions", "adCopy", "longForm", "emailCopy", "shortHooks"]
            },
            funnelStructure: {
              type: Type.OBJECT,
              properties: {
                awareness: { type: Type.STRING },
                contentEngagement: { type: Type.STRING },
                consideration: { type: Type.STRING },
                conversion: { type: Type.STRING },
                retention: { type: Type.STRING }
              },
              required: ["awareness", "contentEngagement", "consideration", "conversion", "retention"]
            },
            contentCalendar: {
              type: Type.OBJECT,
              properties: {
                rollout: { type: Type.STRING },
                sequencing: { type: Type.STRING },
                teaser: { type: Type.STRING },
                reveal: { type: Type.STRING }
              },
              required: ["rollout", "sequencing", "teaser", "reveal"]
            },
            performanceStrategy: {
              type: Type.OBJECT,
              properties: {
                retargeting: { type: Type.STRING },
                segmentation: { type: Type.STRING },
                abTesting: { type: Type.STRING },
                influencers: { type: Type.STRING },
                viral: { type: Type.STRING }
              },
              required: ["retargeting", "segmentation", "abTesting", "influencers", "viral"]
            }
          },
          required: [
            "campaignNames",
            "coreBigIdea",
            "brandPositioningLine",
            "taglinesAndHooks",
            "contentPillars",
            "platformWiseStrategy",
            "creativeConcepts",
            "visualDirection",
            "copywritingSystem",
            "funnelStructure",
            "contentCalendar",
            "performanceStrategy"
          ]
        }
      }
    })
  );

  try {
    return JSON.parse(response.text || "{}") as CampaignStrategistResult;
  } catch (e) {
    return parseJSON(response.text || "{}") as CampaignStrategistResult;
  }
}

export async function generateCampaignStrategistAsset(
  brandGuidelines: BrandGuidelines,
  campaignData: any,
  assetType: string,
  extraInputs?: string,
  model?: string
): Promise<string> {
  const ai = getAI();
  const prompt = `You are a world-class Lead Creative & Chief Copywriter at an elite agency. This is Phase 4: Sequential Asset Generation.
  
  Campaign Details:
  - Theme/Brand Name: ${brandGuidelines.name}
  - Campaign Big Idea: ${campaignData.coreBigIdea}
  - Brand Positioning manifest line: ${campaignData.brandPositioningLine}
  - Visual Aesthetics direction: ${JSON.stringify(campaignData.visualDirection)}
  ${campaignData.campaignLanguage ? `- Target Campaign Language: ${campaignData.campaignLanguage}` : ''}
  ${campaignData.countryRegion ? `- Target Country/Region: ${campaignData.countryRegion}` : ''}
  
  Your task is to generate a pristine, fully detailed, and production-ready implementation of the following asset:
  ASSET TYPE: ${assetType}
  EXTRA REFINEMENT PARAMETERS: "${extraInputs || 'None'}"
  
  CRITICAL LANGUAGE & TRANSLATION MANDATE:
  If a Target Campaign Language is specified above (and is NOT "English"), you MUST draft and write all consumer-facing copywriting (like headings, body text, newsletter paragraphs, social media captions, tagline hooks, and scripts) ENTIRELY inside that exact target language (e.g. Hindi, French, Spanish, Japanese, Bengali, etc.) using the proper native script. The layout formatting and labels can be clear Markdown.
  
  STRICT REDACTIONS REQUIRED:
  Do NOT, under any circumstance, mention, display, or name ANY of the following:
  "Gemini", "Fal", "Fal.ai", "GPT Image", "Kling", "Veo", "Seedance" in your text. If referring to engines, write "Enterprise Intelligent System" or "Commercial Plus Renderer" or similar high-end descriptive synonyms.
  
  Deliver a masterful, copywriter-level presentation in clean, structured Markdown. Start directly with the styled asset name and content.`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an exceptional global agency senior copywriter. You produce vivid, emotionally resonant, and layout-perfect copy system implementations in pristine markdown.'
      }
    })
  );

  return response.text || "Verification failure during asset computation.";
}

export async function generateCampaignAssetBriefs(
  brandGuidelines: BrandGuidelines,
  campaignData: any,
  counts: { numImages: number; numVideos: number; numCopy: number },
  aesthetic: string
): Promise<AssetBriefsResult> {
  const ai = getAI();
  const prompt = `You are an elite Creative Director at a global multi-niche agency. We have a campaign: "${brandGuidelines.name}" in the "${brandGuidelines.industry}" industry.
Campaign Big Idea: "${campaignData.coreBigIdea}"
Campaign Brand Positioning: "${campaignData.brandPositioningLine}"
Visual Style: "${aesthetic}"
Brand Core Pillars: "${brandGuidelines.pillars?.join(', ')}"
${campaignData.campaignLanguage ? `- Target Campaign Language: ${campaignData.campaignLanguage}` : ''}
${campaignData.countryRegion ? `- Target Country/Region: ${campaignData.countryRegion}` : ''}

CRITICAL BRANDING RULES:
1. Ground all visual prompts and visual concepts strictly in the brand's actual industry: "${brandGuidelines.industry}".
2. NEVER mention or suggest skincare drop, cremes, oils, cosmetics, saffron, EverYuth or other beauty components unless the brand name/industry explicitly states it is a face, body, skincare or beauty brand. 
3. If this is a tech, finance, fashion, food, lifestyle or other brand, align the concepts 100% with that industry. Keep it highly relevant, elegant, and native.
4. If a Target Campaign Language is specified (and is not English), write the Copy briefs' main titles or topic details using or targeted to "${campaignData.campaignLanguage}".

We need exactly:
- ${counts.numImages} high-quality photographic/stylistic image ideas and prompts (highly detailed prompt for Imagen, under 40 words, no text overlays specified)
- ${counts.numVideos} cinematic video concepts and prompts (detailed video motion prompt for Veo, under 30 words, specifying smooth camera motion and scene, no text overlays specified)
- ${counts.numCopy} distinct copywriting topic areas (e.g. "Social Ad Copy", "Newsletter Email", "Influencer Pitch Script", "Launch Manifesto")

Return as a JSON object matching this schema:
{
  "images": [
    { "title": "Unique descriptive title", "prompt": "Vivid visual description prompt, strictly textless, beautiful lighting" }
  ],
  "videos": [
    { "title": "Unique cinematic title", "prompt": "Vivid motion description prompt, smooth camera work, dramatic lighting" }
  ],
  "copies": [
    { "title": "Unique copy title", "topic": "Brief description of the copy theme and channel" }
  ]
}
`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {

        responseMimeType: "application/json",
        systemInstruction: "You are a master Creative Director at a top agency. Output strictly valid JSON with zero conversational fluff.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            images: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                },
                required: ["title", "prompt"]
              }
            },
            videos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                },
                required: ["title", "prompt"]
              }
            },
            copies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  topic: { type: Type.STRING }
                },
                required: ["title", "topic"]
              }
            }
          },
          required: ["images", "videos", "copies"]
        }
      }
    })
  );

  try {
    return JSON.parse(response.text || "{}") as AssetBriefsResult;
  } catch (e) {
    return parseJSON(response.text || "{}") as AssetBriefsResult;
  }
}
