import { GoogleGenAI, Modality, Type, ThinkingLevel } from "@google/genai";

// API key is managed server-side only — no user-provided keys
export const getAI = () => {
  const apiKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    '';
  if (!apiKey) {
    console.warn("[Gemini Service] No Gemini API key configured in environment.");
  }
  return new GoogleGenAI({ apiKey });
};

export const MODELS = {
  TEXT_FAST: 'gemini-2.5-flash',
  TEXT_PRO: 'gemini-2.5-pro',
  TEXT_STRATEGY: 'gemini-2.5-flash',
  IMAGE_FAST: 'gemini-2.5-flash-image',
  IMAGE_STANDARD: 'gemini-3.1-flash-image',
  IMAGE_PRO: 'gemini-3-pro-image',
  VIDEO_LITE: 'veo-3.1-lite-generate-preview',
  VIDEO_FAST: 'veo-3.1-fast-generate-preview',
  VIDEO_PRO: 'veo-3.1-generate-preview',
  TTS: 'gemini-2.5-flash-preview-tts',
} as const;


export function resizeImageIfNeeded(dataUrl: string, maxDim: number = 768): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(dataUrl);
        return;
      }

      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(resizedDataUrl);
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

function parseJSON(text: string) {
  try {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\n?|```/g, '').trim();

    // Try to handle truncated JSON by finding the last complete object/array
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // If it's a simple truncation, we might be able to close it
      // but it's safer to just try a few common patterns
      console.warn("JSON Parse failed, attempting to fix truncation...", e);

      if (cleaned.endsWith('"')) {
        // Truncated inside a string
        try { return JSON.parse(cleaned + '}'); } catch (e2) { }
        try { return JSON.parse(cleaned + '"}'); } catch (e2) { }
      } else if (cleaned.endsWith(',')) {
        // Truncated after a comma
        try { return JSON.parse(cleaned.slice(0, -1) + '}'); } catch (e2) { }
      } else {
        // General truncation - try adding closing braces
        try { return JSON.parse(cleaned + '}'); } catch (e2) { }
        try { return JSON.parse(cleaned + '"}'); } catch (e2) { }
        try { return JSON.parse(cleaned + '"]}'); } catch (e2) { }
      }
      throw e;
    }
  } catch (e) {
    console.error("JSON Parse error:", e, "Original text:", text);
    throw new Error("Unable to parse JSON string. The AI response might have been truncated or malformed.");
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    const isQuotaError = errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
    const isInternalError = errorStr.includes("INTERNAL") || error?.status === "INTERNAL" || error?.code === 500;
    const isServiceUnavailable = errorStr.includes("SERVICE_UNAVAILABLE") || errorStr.includes("UNAVAILABLE") || error?.status === "SERVICE_UNAVAILABLE" || error?.status === "UNAVAILABLE" || error?.code === 503;
    const isDeadlineExceeded = errorStr.includes("DEADLINE_EXCEEDED") || error?.status === "DEADLINE_EXCEEDED" || error?.code === 504;
    const isNotFoundError = errorStr.includes("Requested entity was not found");
    const isPermissionDenied = errorStr.includes("PERMISSION_DENIED") || error?.status === "PERMISSION_DENIED" || error?.code === 403;
    const isSpendingCap = errorStr.includes("exceeded its spending cap");

    if ((isNotFoundError || isPermissionDenied) && retries > 0 && typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
      // If the key is invalid/not found or permission denied, prompt to re-select
      await (window as any).aistudio.openSelectKey();
      return withRetry(fn, retries - 1, delay * 2);
    }

    if (isSpendingCap) {
      // Don't retry on spending cap errors
      throw error;
    }

    if ((isQuotaError || isInternalError || isServiceUnavailable || isDeadlineExceeded) && retries > 0) {
      let waitTime = delay;

      // Try to extract retryDelay from the error response
      try {
        const errorObj = typeof error === 'string' ? JSON.parse(error) : error;
        const details = errorObj?.error?.details || errorObj?.details;
        if (Array.isArray(details)) {
          const retryInfo = details.find((d: any) => d['@type']?.includes('RetryInfo') || d.retryDelay);
          if (retryInfo?.retryDelay) {
            const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
            if (!isNaN(seconds)) {
              waitTime = (seconds + 1) * 1000;
            }
          }
        }
      } catch (e) {
        // Fallback to exponential backoff
      }

      console.warn(`Transient error or quota exceeded. Retrying in ${waitTime}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return withRetry(fn, retries - 1, waitTime * 1.5);
    }
    throw error;
  }
}

export type GemType = 'image' | 'video' | 'text' | 'slideshow' | 'campaign' | 'storyline' | 'audio' | 'campaign-deck';

export const IMAGE_MODELS = [
  { id: 'openai/gpt-image-2', name: 'Fal Studio', modelName: 'GPT-Image-2 (Fal)', description: 'Commercial grade high-fidelity visual engine', credits: 3, humanTouch: 30 },
  { id: 'fal-ai/flux/schnell', name: 'Fal FLUX Schnell', modelName: 'FLUX Schnell (Fal)', description: 'Ultra-fast photorealistic visual composition', credits: 2, humanTouch: 20 },
  { id: 'fal-ai/flux/dev', name: 'Fal FLUX Pro', modelName: 'FLUX Dev Pro (Fal)', description: 'High-detail commercial advertising rendering', credits: 4, humanTouch: 40 },
  { id: 'gemini-2.5-flash-image', name: 'Gemini Preview', modelName: 'Nano Banana', description: 'Standard preview draft generator', credits: 2, humanTouch: 20 }
];

export const TEXT_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Campaign Strategy', modelName: 'Gemini Pro', description: 'Deep conversational discovery workshop and copywriting', credits: 5, humanTouch: 50 },
  { id: 'gemini-2.5-pro', name: 'Premium Strategy', modelName: 'Gemini Pro', description: 'Rich strategic planners and complex brand alignment models', credits: 5, humanTouch: 50 }
];

export const VIDEO_MODELS = [
  { id: 'veo-3.1-lite-generate-preview', name: 'Fast', modelName: 'Veo Lite', description: 'Cost-efficient rapid draft generation for testing layouts', credits: 10, humanTouch: 100 },
  { id: 'veo-3.1-fast-generate-preview', name: 'Standard', modelName: 'Veo Fast', description: 'Balanced fidelity and operational speed', credits: 20, humanTouch: 200 },
  { id: 'veo-3.1-generate-preview', name: 'Pro', modelName: 'Veo Standard', description: 'High-detail visual storytelling video with rich texture and lighting', credits: 40, humanTouch: 400 },
  { id: 'kling-video', name: 'Plus', modelName: 'Kling 3.0', description: 'Strategic simulation engine with high spatial and physics precision', credits: 40, humanTouch: 400 },
  { id: 'bytedance/seedance-2.0', name: 'Cinematic', modelName: 'Seedance 2.0', description: 'Alternative rendering for natural human and camera movements', credits: 80, humanTouch: 800 }
];
// ... (rest of the file remains similar but uses withRetry and getAI())

export const getQuotaErrorMessage = (error: any) => {
  const errorStr = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
  const isQuota = errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
  const isUnavailable = errorStr.includes("UNAVAILABLE") || error?.status === "UNAVAILABLE" || error?.code === 503;
  const isSpendingCap = errorStr.includes("exceeded its spending cap");

  if (isUnavailable) {
    return "The AI model is currently experiencing high demand. We are automatically retrying, but if this persists, please try again in a few minutes.";
  }

  if (isSpendingCap) {
    return "Your Google Cloud project has exceeded its spending cap. Please check your billing settings in the Google Cloud Console or Google AI Studio to increase your limit.";
  }

  if (!isQuota) return null;

  try {
    const errorObj = typeof error === 'string' ? JSON.parse(error) : error;
    const details = errorObj?.error?.details || errorObj?.details;
    if (Array.isArray(details)) {
      const retryInfo = details.find((d: any) => d['@type']?.includes('RetryInfo') || d.retryDelay);
      if (retryInfo?.retryDelay) {
        return `API Quota exceeded. Please wait ${retryInfo.retryDelay} or select a different API key.`;
      }
    }
  } catch (e) { }

  return "API Quota exceeded. Please wait a moment or select a different API key.";
};

export async function generateHistoryTitle(prompt: string, gemName: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short, clear, and descriptive title (max 5 words) for a creative task based on the following prompt and tool name. 
      Tool: ${gemName}
      Prompt: ${prompt}
      
      Return ONLY the title string, no quotes or extra text.`,
    }));
    return response.text?.trim() || prompt.substring(0, 30) + '...';
  } catch (e) {
    console.error("Failed to generate history title:", e);
    return prompt.substring(0, 30) + '...';
  }
}

export interface PromptEngineSettings {
  enableAiRewrite: boolean;       // Gemini Auto-Write / Prompt Expansion
  enableGuidelines: boolean;      // Brand guidelines & demographics context injection 
  enablePhotoStyling: boolean;    // Photographic elite lighting & composition style rules
  enableCinematicStoryboard: boolean; // 5-line storyboard expansion for Veo video gems
  allowTextOnAssets: boolean;     // Allow text / labels / overlays on generated images & videos
}

export let promptEngineSettings: PromptEngineSettings = {
  enableAiRewrite: true,
  enableGuidelines: true,
  enablePhotoStyling: true,
  enableCinematicStoryboard: true,
  allowTextOnAssets: true,
};

// Auto-load from localStorage if available in browser context
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('writopedia_prompt_engine_settings');
    if (saved) {
      promptEngineSettings = { ...promptEngineSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load prompt engine settings from lstorage", e);
  }
}

export function updatePromptEngineSettings(newSettings: Partial<PromptEngineSettings>) {
  promptEngineSettings = { ...promptEngineSettings, ...newSettings };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('writopedia_prompt_engine_settings', JSON.stringify(promptEngineSettings));
    } catch (e) {
      console.error("Failed to save prompt engine settings to lstorage", e);
    }
  }
}

export interface Gem {
  id: string;
  name: string;
  description: string;
  type: GemType;
  systemInstruction: string;
  icon: string;
  cost: number;
}

export const GENERIC_GEMS: Gem[] = [
  {
    id: 'campaign-strategist-y',
    name: 'Campaign Strategy',
    description: 'Deep conversational discovery workshop and high-octane multi-platform strategic campaign system.',
    type: 'campaign',
    icon: 'Target',
    cost: 5,
    systemInstruction: 'You are an elite Creative Director + Brand Strategist + Performance Marketer + Launch Consultant from a world-class creative agency. Keep your tone direct, strategically sharp, emotionally intelligent, and completely free of generic marketing clichés.'
  },
  {
    id: 'bundles-campaigns',
    name: 'Ecommerce Bundle',
    description: 'Cohesive 5-asset visual marketing and campaign bundle package rendered with premium GPT technology.',
    type: 'campaign-deck',
    icon: 'Layers',
    cost: 25,
    systemInstruction: 'Cohesive 5-Asset Campaign Builder designed for Multi-Asset Visual Marketing.'
  },
  {
    id: 'strategy-captions',
    name: 'Captions',
    description: 'Create high-converting, platform-ready captions for all social networks based on your brand identity.',
    type: 'text',
    icon: 'FileText',
    cost: 1,
    systemInstruction: `You are an elite integrated Social Media Director and Chief Copywriter. Your goal is to deliver beautiful, high-converting, platform-optimized social media captions with relevant hashtags and punchy hooks.

FORMATTING & STRUCTURE:
1. # Captions Campaign: [Brief Campaign Theme]

2. ## Platform Caption Pack
- Generate 3 distinct high-converting, platform-ready social captions (with engaging Hooks, CTA, and tags).
- For each caption, specify:
  - ### Caption: [Theme/Angle, e.g., Lifestyle, Promo, Educational]
  - Platform recommendation (e.g., Instagram, LinkedIn, or Threads)
  - Clear content and formatting to keep them highly engaging.`
  },
  {
    id: 'standard-image',
    name: 'Standard Brand Image',
    description: 'Generates high-quality social media imagery tailored to your brand identity.',
    type: 'image',
    icon: 'Image',
    cost: 3,
    systemInstruction: `You are a Lead Visual Designer. Your goal is to create vibrant, high-impact imagery that strictly adheres to the provided brand guidelines.
    Use Google Search to find real-world context if needed, but prioritize the brand's unique aesthetic.
    Guidelines:
    - Strictly follow the provided brand colors and pillars.
    - Use clean, professional lighting.
    - Style: Modern and professional unless specified otherwise.
    - Avoid cluttered backgrounds.`
  },
  {
    id: 'cinematic-video',
    name: 'Cinematic & Social Video (5-8s)',
    description: 'High-end custom and social video generation for premium brand moments.',
    type: 'video',
    icon: 'Video',
    cost: 20,
    systemInstruction: `You are a Cinematic Video Director and Producer. Create breathtaking, high-end promotional video clips (approx. 8 seconds) with dramatic lighting, smooth camera movements, and social-media optimized pacing.`
  },
  {
    id: 'audio-studio',
    name: 'Voiceover & Audio Studio',
    description: 'Integrated workspace for professional AI voiceovers or custom-composed brand soundtracks & audio paths.',
    type: 'audio',
    icon: 'Volume2',
    cost: 2,
    systemInstruction: `You are an Integrated Audio Director and Soundtrack Composer. 
    1. If the user requests a voiceover or spoken audio script, write a compelling, speakable 1-minute script.
    2. If they ask for background music, production beds, or theme tracks, describe a highly detailed musical piece, outlining instruments, mood, tempo, and arrangement parameters suitable for their campaign.
    Format your output elegantly. Refine the style to match the brand identity and location parameters.`
  },
  {
    id: 'corporate-presentations',
    name: 'Corporate Presentations',
    description: 'Generates professional high-end slide decks under a structured corporate canvas framework powered by Gemini Pro.',
    type: 'slideshow',
    icon: 'Presentation',
    cost: 10,
    systemInstruction: 'You are an elite corporate presentations architect and visual designer. Create highly structured, polished slides centering deep corporate narratives, data-oriented points, and elegant executive style.'
  }
];

export interface BrandGuidelines {
  name: string;
  industry: string;
  tone: string;
  pillars: string[];
  colors: string[];
  typography: { primary: string; secondary: string };
  logo?: string; // base64
  location?: string;
  voiceAccentStyle?: string;
  visualEthnicityStyle?: string;
}

export interface AssetAnalysis {
  theme: string;
  tone: string;
  colors: string[];
  style: string;
  composition: string;
  mood: string;
}

async function getSupportedLogoData(logoData: string): Promise<{ mimeType: string, data: string } | null> {
  if (logoData.startsWith('http://') || logoData.startsWith('https://')) {
    try {
      // Use our local completely reliable proxy instead of fragile public proxies
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

  const response = await withRetry(() => ai.models.generateContent({
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
  }));

  return parseJSON(response.text);
}

export interface Asset {
  id: string;
  name: string;
  data: string;
  type: 'image' | 'doc';
  selected: boolean;
  analysis?: AssetAnalysis;
}

export async function initializeBrandKit(
  description: string,
  context?: { logo?: string, colors?: string, tone?: string }
): Promise<{ guidelines: BrandGuidelines, assets: Asset[] }> {
  // 1. Generate Guidelines (Core details generated very fast first)
  const guidelines = await generateBrandIdentity(description, context);

  const ai = getAI();
  const assets: Asset[] = [];

  // Define parallel tasks to optimize the brand initialization speed
  const discoverLogoTask = async () => {
    if (context?.logo) {
      guidelines.logo = context.logo;
      return;
    }

    try {
      // 1. Try to extract domain directly from the user's description (e.g. www.google.com -> google.com)
      const domainMatch = description.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,})/i);
      let domain = domainMatch ? domainMatch[1].toLowerCase().replace(/\/.*$/, '').trim() : null;

      // 2. If no domain in description but guidelines.name is available, derive domain
      if (!domain && guidelines.name) {
        const cleanName = guidelines.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanName) {
          domain = `${cleanName}.com`;
        }
      }

      if (domain) {
        // High-resolution, reliable Google Favicons / Brand Icon API (sz=256)
        guidelines.logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
        return;
      }

      guidelines.logo = '';
    } catch (e) {
      console.error("Failed to discover logo in initialization:", e);
      guidelines.logo = '';
    }
  };

  const generateDocsTask = async () => {
    try {
      // Generating text documents does not require slow Google search grounding if we have core guidelines
      const docPromptsResponse = await withRetry(() => ai.models.generateContent({
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
      }));

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

  const generateImageTask = async () => {
    try {
      // Avoid calling slow AI image generation during setup.
      // Instead, we instantly select a stunning curated premium abstract background from Unsplash,
      // which loads instantly and matches sleek, professional creative suites.
      const premiumBackgrounds = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop", // Warm chic peach/purple
        "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1200&auto=format&fit=crop", // Sleek holographic
        "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=1200&auto=format&fit=crop", // Modern minimalist art
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop"  // Deep slate geometric
      ];

      // Select pseudo-randomly based on brand name
      const charCodeSum = guidelines.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const selectedImage = premiumBackgrounds[charCodeSum % premiumBackgrounds.length];

      assets.push({
        id: Math.random().toString(36).substring(7),
        name: `Hero Brand Visual.jpg`,
        data: selectedImage,
        type: 'image',
        selected: false
      });
    } catch (e) {
      console.error("Failed to generate brand setup images:", e);
    }
  };

  // Run all initialization actions simultaneously (manifesto and market context strategy are fine, hero image generation excluded)
  await Promise.all([
    discoverLogoTask(),
    generateDocsTask()
  ]);

  return { guidelines, assets };
}

export async function generateBrandIdentity(
  description: string,
  context?: { logo?: string, colors?: string, tone?: string }
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
      "colors": ["#HEXCODE1", "#HEXCODE2"], // Generate exactly 2 to 4 core brand hex colors. Do not generate more than 4.
      "typography": {
        "primary": "Font for headings",
        "secondary": "Font for body"
      },
      "location": "Detect physical location or target country base (e.g., 'India', 'United States', 'Japan', etc.). Pay close attention to descriptions implying Indian ingredients/names/cities.",
      "voiceAccentStyle": "Detect or suggest suitable audio voiceover accent (e.g., 'Indian English', 'Hinglish', 'US English', 'British English', etc.) based on location.",
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

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts },
    config: {
      systemInstruction: "You are a Brand Identity Expert. Your task is to generate a concise, professional brand identity in JSON format. You MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object. Keep all values extremely concise and avoid any repetitive or nonsensical strings. Under the 'location', 'voiceAccentStyle', and 'visualEthnicityStyle' fields, pay extremely close attention to regional descriptors in the brand prompt. For example, if the prompt uses terms like 'Indian', 'Vedic', 'Mumbai', 'Hinglish', 'Chai', 'Ayurveda', or describes localized services in India, you MUST set location to 'India', voiceAccentStyle to 'Indian English' (or 'Hinglish'), and visualEthnicityStyle to 'Indian'.",
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
            description: "A detailed description of the brand's visual mark/logo, including its symbolic meaning and geometric structure."
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
        required: ["name", "industry", "tone", "pillars", "colors", "typography", "logoDescription", "location", "voiceAccentStyle", "visualEthnicityStyle"]
      }
    }
  }));

  const guidelines = parseJSON(response.text);
  guidelines.logo = context?.logo || '';
  return guidelines;
}

export async function generateBrandLogoAI(
  name: string,
  industry: string,
  colors: string[],
  tone?: string
): Promise<string> {
  try {
    // Generate high-end logo using Fal AI rendering engine
    const logoPrompt = `An iconic, world-class modern minimalist logo for brand "${name}", ${industry} industry, tone ${tone || 'Professional'}. Clean vector art, geometric silhouette, brand colors ${colors.join(', ')}, solid clean pure white background #ffffff. Single centered mark, award-winning graphic design.`;
    const renderRes = await fetch("/api/campaign/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: logoPrompt,
        size: "1:1",
        engine: "fal-ai/flux/schnell"
      })
    });
    if (renderRes.ok) {
      const renderData = await renderRes.json();
      if (renderData.url) return renderData.url;
    }
  } catch (err) {
    console.warn("Fal logo generation fallback to AI client:", err);
  }

  const ai = getAI();
  const logoResponse = await withRetry(() => ai.models.generateContent({
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
          - Format: Vector-style art with sharp edges.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  }));

  for (const part of logoResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from image generator");
}

async function appendAssetsToParts(parts: any[], assets?: any[]) {
  if (assets && assets.length > 0) {
    const hasProductContext = assets.some(a => a.isProductContext);
    const hasFaceContext = assets.some(a => a.isFaceContext);

    const analyses = assets.filter(a => a.analysis).map(a => a.analysis);
    if (analyses.length > 0) {
      parts[0].text += `\n\nVISUAL THEME & TONE GUIDELINES (Extracted from Assets):
      - Themes: ${[...new Set(analyses.map(a => a.theme))].join(', ')}
      - Tones: ${[...new Set(analyses.map(a => a.tone))].join(', ')}
      - Moods: ${[...new Set(analyses.map(a => a.mood))].join(', ')}
      - Styles: ${[...new Set(analyses.map(a => a.style))].join(', ')}
      - Prominent Colors: ${[...new Set(analyses.flatMap(a => a.colors))].join(', ')}
      
      Please strictly adhere to these visual guidelines to ensure consistency across all brand creatives.`;
    }

    const images = assets.filter(a => a.type === 'image');
    const docs = assets.filter(a => a.type === 'doc');

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
        docs.forEach(doc => {
          parts[0].text += `\n--- DOCUMENT: ${doc.name} ---\n${doc.data}\n--- END DOCUMENT ---`;
        });
      }
    }

    for (const asset of images) {
      const assetDataPart = asset.data.includes(',') ? asset.data.split(',')[1] : asset.data;
      if (parts.some(p => p.inlineData && p.inlineData.data === assetDataPart)) {
        continue;
      }
      const supportedAsset = await getSupportedLogoData(asset.data);
      if (supportedAsset) {
        if (parts.some(p => p.inlineData && p.inlineData.data === supportedAsset.data)) {
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

export async function generateCreative(gem: Gem, prompt: string, config?: {
  aspectRatio?: string;
  guidelines?: BrandGuidelines;
  model?: string;
  logicModel?: string;
  videoDuration?: string;
  videoShotType?: string;
  imageStyle?: string;
  assets?: any[];
  bakeLogo?: boolean;
}) {
  const guidelinesContext = config?.guidelines ? `
    Current Brand Guidelines for ${config.guidelines.name} (${config.guidelines.industry}):
    - Tone: ${config.guidelines.tone}
    - Pillars: ${config.guidelines.pillars.join(', ')}
    - Primary Colors: ${config.guidelines.colors.join(', ')}
    - Typography: ${config.guidelines.typography.primary} (Headings), ${config.guidelines.typography.secondary} (Body)
    - Location/Target Region: ${config.guidelines.location || 'Not Specified'}
    - Preferred Voice Accent Style: ${config.guidelines.voiceAccentStyle || 'Not Specified'}
    - Preferred Visual Ethnicity Demographics: ${config.guidelines.visualEthnicityStyle || 'Not Specified'}
  ` : '';

  if (gem.type === 'image') {
    const styleInstruction = (config?.imageStyle && promptEngineSettings.enablePhotoStyling) ? `\n\nVisual Style: ${config.imageStyle}` : '';
    let culturalVisualInstruction = '';
    if (promptEngineSettings.enableGuidelines && (config?.guidelines?.visualEthnicityStyle || config?.guidelines?.location)) {
      culturalVisualInstruction = `\n\nCRITICAL CULTURAL/REGIONAL CONTEXT: Any human model, face, or character generated MUST look like they belong to the '${config.guidelines.visualEthnicityStyle}' ethnic demographic as per the brand guidelines. The clothing, background setting, and props must naturally and premiumly reflect a lifestyle scene in ${config.guidelines.location}. For example, if location is India and style is Indian, avoid western default faces/settings, and focus on beautiful, contemporary, high-fashion Indian characters and environments.`;
    }

    const finalGuidelinesContext = promptEngineSettings.enableGuidelines ? guidelinesContext : '';
    const finalSystemInstruction = promptEngineSettings.enablePhotoStyling ? gem.systemInstruction : 'Create a clean, natural brand image.';

    const parts: any[] = [{ text: `${finalSystemInstruction}\n${finalGuidelinesContext}${styleInstruction}${culturalVisualInstruction}\n\nPrompt: ${prompt}` }];

    await appendAssetsToParts(parts, config?.assets);

    if (!promptEngineSettings.allowTextOnAssets) {
      parts[0].text += "\n\nCRITICAL TEXT OVERLAY RESTRICTION: ABSOLUTELY NO text, letters, typography, font, labels, captions, subtitles, words, logos, names, branding, or alphabetical/numerical overlays are allowed inside the generated image. All visual elements, backgrounds, product surfaces, and scenes must be completely clean of any text/words/labels. Make the image completely textless and empty of characters.";
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
        parts[0].text += "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. Incorporate it into the creative EXACTLY ONCE. The logo MUST be a clean, transparent overlay with NO background box, border, or container. It should blend naturally into the scene as if it were part of the environment or a high-end watermark. ABSOLUTELY NO grey, white, or colored background squares around the logo. DO NOT generate any other text or logos.";
      }
    } else {
      parts[0].text += "\n\nCRITICAL: DO NOT overlay or draw any logo, text, or brand name on the image. Generate only the clean background scene, leaving space if needed for a layout watermark to be added later on.";
    }

    const modelId = config?.model || 'openai/gpt-image-2';
    const isFal = modelId.startsWith('fal-ai/') || modelId === 'openai/gpt-image-2' || !modelId.startsWith('gemini-');

    // Primary: Generate using Fal.ai server proxy
    if (isFal) {
      const referenceImages: string[] = [];
      if (config?.assets) {
        config.assets.forEach((asset: any) => {
          if (asset.type === 'image' && asset.data) {
            referenceImages.push(asset.data);
          }
        });
      }

      const renderRes = await fetch("/api/campaign/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: parts[0].text,
          size: config?.aspectRatio || '1:1',
          engine: modelId,
          guidelines: config?.guidelines,
          referenceImages: referenceImages
        })
      });
      if (!renderRes.ok) {
        const errText = await renderRes.text();
        throw new Error(`Fal AI rendering error: ${errText}`);
      }
      const renderData = await renderRes.json();
      return {
        type: 'image',
        data: renderData.url
      };
    }

    // Fallback or explicit Gemini Image Model selection
    const ai = getAI();
    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          imageConfig: { aspectRatio: (config?.aspectRatio as any) || "1:1" }
        }
      }));

      const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imagePart?.inlineData) {
        return {
          type: 'image',
          data: `data:image/png;base64,${imagePart.inlineData.data}`,
          groundingMetadata: response.candidates?.[0]?.groundingMetadata
        };
      }
    } catch (gErr: any) {
      console.warn("Gemini image generation failed or quota reached, routing to Fal AI engine:", gErr.message);
      // Auto-recover via Fal.ai rendering engine!
      const renderRes = await fetch("/api/campaign/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: parts[0].text,
          size: config?.aspectRatio || '1:1',
          engine: 'openai-gpt-image-2',
          guidelines: config?.guidelines
        })
      });
      if (renderRes.ok) {
        const renderData = await renderRes.json();
        return { type: 'image', data: renderData.url };
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

    const response = await withRetry(() => ai.models.generateContent({
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
    }));

    const result = parseJSON(response.text);
    if (result.copy) {
      result.copy = result.copy.replace(/([^\n])\s*(#{1,6})\s+/g, '$1\n\n$2 ');
    }

    if (!result.imagePrompts || !Array.isArray(result.imagePrompts)) {
      throw new Error("Failed to generate image prompts for campaign.");
    }

    const imagePromises = result.imagePrompts.slice(0, 3).map(async (imgPrompt: string) => {
      try {
        const imageResult = await generateImage(imgPrompt, config?.guidelines, config?.aspectRatio || "16:9", imageModelId, config?.assets);
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
        images: images.filter(Boolean)
      },
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  }

  if (gem.type === 'text') {
    const ai = getAI();
    const modelId = config?.model || 'gemini-2.5-flash';
    const parts: any[] = [{ text: `${gem.systemInstruction}\n${guidelinesContext}\n\nPrompt: ${prompt}` }];

    if (config?.guidelines?.logo) {
      const supportedLogo = await getSupportedLogoData(config.guidelines.logo);
      if (supportedLogo) {
        parts.push({
          inlineData: {
            mimeType: supportedLogo.mimeType,
            data: supportedLogo.data
          }
        });
        parts[0].text += "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. In your generated SVG, represent this logo accurately using SVG paths/shapes or include a clear placeholder for it. Ensure it is well-positioned and blends with the brand aesthetics. Place it as a clear, well-positioned element with a transparent background—DO NOT place it inside a box, label, or rounded rectangle.";
      }
    }

    await appendAssetsToParts(parts, config?.assets);

    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction: `${gem.systemInstruction}\n\nSTRICT RULES: Your task is to generate a concise, professional brand narrative in JSON format. Use clear Markdown hierarchy (# Heading, ## Subheading, ### Specifics). \nCRITICAL: You MUST use explicit newline characters (\\n\\n) before and after every markdown heading and paragraph to ensure it formats properly.\nYou MUST NOT include any internal monologue, thinking process, or conversational text. Return ONLY the JSON object. Keep all values extremely concise and avoid any repetitive or nonsensical strings.`,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            copy: { type: Type.STRING }
          },
          required: ["copy"]
        }
      }
    }));

    try {
      const result = parseJSON(response.text);
      if (result.copy) {
        result.copy = result.copy.replace(/([^\n])\s*(#{1,6})\s+/g, '$1\n\n$2 ');
      }
      return {
        type: 'text',
        data: result.copy,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    } catch (e) {
      console.error("Failed to parse narrative JSON:", e);
      return {
        type: 'text',
        data: response.text,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      };
    }
  }

  if (gem.type === 'video') {
    // Veo implementation
    const ai = getAI();
    const modelId = config?.model || 'veo-3.1-fast-generate-preview';
    const logicModelId = config?.logicModel || 'gemini-2.5-flash';

    // Step 1: Generate the short and precise video concept
    const shotTypeInstruction = config?.videoShotType ? `\nShot Type: ${config.videoShotType}` : '';

    const parts: any[] = [{
      text: `You are an elite commercial video Creative Director.
      The user wants an impactful video promo for their brand: ${config?.guidelines?.name}.
      We need a high-impact, short, and precise visual prompt for a text-to-video (Veo) compiler engine.
      ${shotTypeInstruction}
      
      CRITICAL: Your absolute goal is to write a short, specific, and crisp prompt. Avoid overly long, narrative, technical, or descriptive word-salad. Focus on concrete visual action, motion, or scenery.
      
      Requirements for the visualPrompt:
      - Max 1-2 short sentences (about 15-30 words).
      - Make it extremely clean, precise, and visually vivid.
      - Specify elegant cameras (e.g., macro zoom, slow-motion top-down sweep) and high-quality focus.
      - Examples of ideal short/specific video prompts:
        - "A clean, high-speed macro zoom rotating around a glass perfume bottle on a wet dark stone surface with gentle water drops splashing outwards."
        - "A crisp cinematic close-up of a skincare dropper depositing a single golden oil droplet onto water, showing beautiful surface tension ripples."
        - "A slow-motion top-down sweep revealing a premium leather messenger bag opening to show neatly organized traveler accessories."
      
      ${!promptEngineSettings.allowTextOnAssets
          ? "CRITICAL VIDEO TEXT CONSTRAINT: The visual prompt MUST NOT specify any text, labels, overlays, names, typography, branding, logos, titles, words, captions, or alphabetical/numerical graphics to appear onscreen or on any of the product surfaces. The generated video must be 100% clean of any letters or typographic visual overlays. Make it a purely clean cinematic scenery/product shot without any text."
          : "CRITICAL: The visual prompt can optionally describe the brand logo appearing naturally on the packaging or as a clean watermark, but must remain extremely short and non-redundant. No grey, white, or colored background squares around the logo."
        }
      Also provide a 1-line voice-over (VO) and a music style recommendation that fits this video.

      CRITICAL CULTURAL AND ACCENT ALIGNMENT: 
      1. Human models/actors described in the visualPrompt MUST strictly look clearly representing the '${config?.guidelines?.visualEthnicityStyle || 'native'}' ethnic demographic and match the setting of '${config?.guidelines?.location || 'the target region'}'.
      2. The voiceOver (VO) text MUST be tailored to be spoken beautifully in the '${config?.guidelines?.voiceAccentStyle || 'local'}' accent or style. For example, if Hinglish is active, write the VO with a natural blended phrasing of Hindi and English (e.g., using both English and high-impact Hindi words beautifully). If Indian English, use phrasing that sounds premium and locally native. No generic Western-only expressions.
      
      ${guidelinesContext}
      
      User Prompt: ${prompt}
      
      Return a JSON object with the following structure:
      {
        "visualPrompt": "The short, specific, and crisp video prompt (max 150 chars/30 words)",
        "voiceOver": "A short, punchy 1-line voice over",
        "musicStyle": "Description of the music style (e.g., 'Subtle acoustic, elegant ambient')",
        "cinematographyNotes": "Brief notes on the camera work and lighting"
      }` }];

    await appendAssetsToParts(parts, config?.assets);

    let concept;
    if (promptEngineSettings.enableCinematicStoryboard) {
      const conceptResponse = await withRetry(() => ai.models.generateContent({
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
      }));

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

    // Step 2: Extract references if present (first frame, last frame, ingredients)
    let startImagePayload: any = undefined;
    let endImagePayload: any = undefined;
    const ingredientsPayload: any[] = [];

    if (config?.assets && Array.isArray(config.assets)) {
      const startAsset = config.assets.find(a => a.isFirstFrameContext);
      if (startAsset) {
        const supported = await getSupportedLogoData(startAsset.data);
        if (supported) {
          startImagePayload = {
            imageBytes: supported.data,
            mimeType: supported.mimeType
          };
        }
      }

      const endAsset = config.assets.find(a => a.isLastFrameContext);
      if (endAsset) {
        const supported = await getSupportedLogoData(endAsset.data);
        if (supported) {
          endImagePayload = {
            imageBytes: supported.data,
            mimeType: supported.mimeType
          };
        }
      }

      const ingredientAssets = config.assets.filter(a => a.isIngredientsContext);
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
      const renderRes = await fetch("/api/campaign/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: concept.visualPrompt,
          size: config?.aspectRatio || '16:9',
          engine: modelId,
          guidelines: config?.guidelines,
        })
      });
      if (!renderRes.ok) {
        const errorText = await renderRes.text();
        throw new Error(`Fal AI video generation error: ${errorText}`);
      }
      const queueJson = await renderRes.json();
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
      finalAspectRatio = '16:9';
    }

    const veoParams: any = {
      model: finalModelId,
      prompt: concept.visualPrompt,
      config: {
        numberOfVideos: 1,
        resolution: finalResolution,
        aspectRatio: finalAspectRatio
      }
    };

    if (startImagePayload) {
      veoParams.image = startImagePayload;
    }
    if (endImagePayload) {
      veoParams.config.lastFrame = endImagePayload;
    }
    if (ingredientsPayload.length > 0) {
      veoParams.config.referenceImages = ingredientsPayload;
    }

    // Call Veo with the detailed visual prompt
    let operation = await withRetry(() => ai.models.generateVideos(veoParams));

    return { type: 'video_op', operationId: operation.name, operation, concept };
  }

  if (gem.type === 'slideshow') {
    const ai = getAI();
    const logicModelId = MODELS.TEXT_FAST;
    const parts: any[] = [{
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
      
      Return as a JSON object containing an array of slides under the key "slides".` }];

    if (config?.guidelines?.logo) {
      const supportedLogo = await getSupportedLogoData(config.guidelines.logo);
      if (supportedLogo) {
        parts.push({
          inlineData: {
            mimeType: supportedLogo.mimeType,
            data: supportedLogo.data
          }
        });
        parts[0].text += "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. Ensure it is integrated into the presentation design conceptually. The logo MUST be a clean, transparent overlay with NO background box, border, or container. It should be well-positioned and blend seamlessly—ABSOLUTELY NO grey, white, or colored background squares around the logo.";
      }
    }

    await appendAssetsToParts(parts, config?.assets);

    const response = await withRetry(() => ai.models.generateContent({
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
    }));

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

    const scriptResponse = await withRetry(() => ai.models.generateContent({
      model: logicModelId,
      contents: audioScriptPrompt,
    }));
    const script = scriptResponse.text?.trim() || "Hello, this is a generated audio track.";

    const audioData = await generateTTS(script, 'Kore', accentStyle);

    return {
      type: 'audio',
      data: audioData,
      script: script
    };
  }

  if (gem.type === 'storyline') {
    const ai = getAI();
    const logicModelId = MODELS.TEXT_FAST;
    const parts: any[] = [{
      text: `Generate a 6-8 image progressive storyline based on this prompt: ${prompt}.
      ${guidelinesContext}
      Provide a storyTitle and a list of scenes, each with a chapterTitle, narrative, and a short, precise imagePrompt.
      CRITICAL PROMPT CONSTRAINT: Each imagePrompt MUST be very short, specific, and crisp (under 25 words). Avoid overly long narrative stories, technical photography keywords, or buzzwords. Focus on concrete subjects, actions, or simple layouts.
      Return as a JSON object.` }];

    const response = await withRetry(() => ai.models.generateContent({
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
    }));

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
}

export async function generateImage(prompt: string, guidelines?: BrandGuidelines, aspectRatio: string = "16:9", model?: string, assets?: any[], bakeLogo: boolean = true): Promise<{ url: string; groundingMetadata?: any }> {
  const guidelinesContext = (guidelines && promptEngineSettings.enableGuidelines) ? `
    Current Brand Guidelines for ${guidelines.name}:
    - Pillars: ${guidelines.pillars.join(', ')}
    - Primary Colors: ${guidelines.colors.join(', ')}
    - Typography: ${guidelines.typography.primary} (Headings), ${guidelines.typography.secondary} (Body)
  ` : '';

  const systemPromptHeader = promptEngineSettings.enablePhotoStyling
    ? `You are a Lead Visual Designer. Create a high-quality, professional corporate background image.`
    : `Create a clean, natural image.`;

  const parts: any[] = [{ text: `${systemPromptHeader}\n${guidelinesContext}\n\nPrompt: ${prompt}` }];

  if (!promptEngineSettings.allowTextOnAssets) {
    parts[0].text += "\n\nCRITICAL TEXT OVERLAY RESTRICTION: ABSOLUTELY NO text, letters, typography, font, labels, captions, subtitles, words, logos, names, branding, or alphabetical/numerical overlays are allowed inside the generated image. All visual elements, backgrounds, product surfaces, and scenes must be completely clean of any text/words/labels. Make the image completely textless and empty of characters.";
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
      parts[0].text += "\n\nIMPORTANT: Use the provided logo image as the definitive brand mark. Incorporate it into the creative EXACTLY ONCE. The logo MUST be a clean, transparent overlay with NO background box, border, or container. It should blend naturally into the scene as if it were part of the environment or a high-end watermark. ABSOLUTELY NO grey, white, or colored background squares around the logo.";
    }
  } else {
    parts[0].text += "\n\nCRITICAL: DO NOT overlay or draw any logo, text, or brand name on the image. Generate only the clean, professional corporate photoshoot background scene.";
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

    const renderRes = await fetch("/api/campaign/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: parts[0].text,
        size: aspectRatio,
        engine: modelId,
        guidelines: guidelines,
        referenceImages: referenceImages
      })
    });
    if (!renderRes.ok) {
      const errText = await renderRes.text();
      throw new Error(`Fal AI rendering error: ${errText}`);
    }
    const renderData = await renderRes.json();
    return {
      url: renderData.url
    };
  }

  // Fallback if Gemini model is explicitly selected
  const ai = getAI();
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: (aspectRatio as any) || "1:1" }
      }
    }));

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      return {
        url: `data:image/png;base64,${imagePart.inlineData.data}`
      };
    }
  } catch (gErr: any) {
    console.warn("Gemini image generator failed, recovering with Fal AI:", gErr.message);
    const renderRes = await fetch("/api/campaign/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: parts[0].text,
        size: aspectRatio,
        engine: 'openai-gpt-image-2',
        guidelines: guidelines
      })
    });
    if (renderRes.ok) {
      const renderData = await renderRes.json();
      return { url: renderData.url };
    }
    throw gErr;
  }
  throw new Error("Failed to generate image");
}

function pcmToWav(base64Pcm: string, sampleRate: number = 24000): string {
  const binaryString = atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  // file length
  view.setUint32(4, 36 + len, true);
  // RIFF type
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk identifier
  view.setUint32(12, 0x666d7420, false); // "fmt "
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  view.setUint32(36, 0x64617461, false); // "data"
  // data chunk length
  view.setUint32(40, len, true);

  const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function generateTTS(text: string, voice: string = 'Kore', emotion: string = 'Professional') {
  const ai = getAI();
  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say in a natural, ${emotion} accent: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice as any },
        },
      },
    },
  }));

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return pcmToWav(base64Audio);
  }
  throw new Error("Failed to generate audio");
}

export async function pollVideo(operation: any) {
  if (operation && (operation.engine || operation.status_url)) {
    const res = await fetch("/api/campaign/video-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation })
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Fal video poll error: ${errorText}`);
    }
    return await res.json();
  }
  const ai = getAI();
  return await withRetry(() => ai.operations.getVideosOperation({ operation }));
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

  const isVideoGem = regionType === 'creative' && (
    lowerGemId.includes('video') ||
    lowerGemType.includes('video')
  );

  const isAudioGem = regionType === 'creative' && (
    lowerGemId.includes('audio') ||
    lowerGemType.includes('audio') ||
    lowerGemId.includes('voice')
  );

  const isTextGem = regionType === 'creative' && (
    lowerGemId.includes('strategy') ||
    lowerGemId.includes('caption') ||
    lowerGemType === 'text'
  );

  const isCampaignDeckGem = regionType === 'creative' && (
    lowerGemId.includes('campaign-deck') ||
    lowerGemId.includes('bundles') ||
    lowerGemType === 'campaign-deck'
  );

  const isSlideshowGem = regionType === 'creative' && (
    lowerGemId.includes('corporate-presentations') ||
    lowerGemType === 'slideshow'
  );

  // Fallback defaults
  const location = guidelines?.location || 'India';
  const tone = guidelines?.tone || 'Premium';
  const ethnicity = guidelines?.visualEthnicityStyle || 'Indian';
  const accent = guidelines?.voiceAccentStyle || 'Indian English';
  const brandColors = (guidelines?.colors && guidelines.colors.length > 0) ? guidelines.colors.join(', ') : '#e52c4d, #111827';
  const pillarsStr = (guidelines?.pillars && guidelines.pillars.length > 0) ? guidelines.pillars.join(', ') : 'Innovation, Craftsmanship, Design';
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
    // Standard Image Gem or default image prompt
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
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemInstruction,
        candidateCount: 1,
        temperature: 0.9,
      }
    }));

    let text = response.text?.trim() || '';

    // Remove quote wrapping if generated
    text = text.replace(/^["'«“‘(]|["'»”’)]$/g, '').trim();

    if (isVideoGem) {
      // Clean prefix labels line-by-line helper for video
      let lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      lines = lines.map(line => {
        return line.replace(/^(Line|Scene|Shot|Moment|Step|Part)\s*\d+[:.-]?\s*/gi, '')
          .replace(/^\d+[:.-]?\s*/, '')
          .trim();
      }).filter(Boolean);

      // Filter out meta-lines
      lines = lines.filter(line => {
        const lower = line.toLowerCase();
        return !lower.startsWith("here is") && !lower.startsWith("cinematic story") && !lower.startsWith("sure, here");
      });

      if (lines.length >= 3) {
        // Enforce exactly 5 lines
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

  // Robust, context-aware beautiful fallbacks (completely natural sounding, no robotic feel!)
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
    // Visual design prompt fallback
    return `Minimalist studio configuration showcasing the exquisite flagship product surrounded by beautiful textured ${location} stone accents under dramatic volumetric soft-box rays, rendered in a striking palette of ${brandColors}`;
  }
}

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
    engagement: string;
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

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are an elite Director of Strategy. You output valid JSON conforming exactly to the requested scheme with high depth, zero fluff, and exquisite copywriting.",
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
          "campaignNames", "coreBigIdea", "brandPositioningLine", "taglinesAndHooks",
          "contentPillars", "platformWiseStrategy", "creativeConcepts", "visualDirection",
          "copywritingSystem", "funnelStructure", "contentCalendar", "performanceStrategy"
        ]
      }
    }
  }));

  try {
    return JSON.parse(response.text || "{}") as CampaignStrategistResult;
  } catch (e) {
    // Attempt fallback JSON parse in case of extra backticks
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

  const response = await withRetry(() => ai.models.generateContent({
    model: model || 'gemini-3.5-flash',
    contents: prompt,
    config: {
      systemInstruction: 'You are an exceptional global agency senior copywriter. You produce vivid, emotionally resonant, and layout-perfect copy system implementations in pristine markdown.',
    }
  }));

  return response.text || "Verification failure during asset computation.";
}

export interface AssetBriefsResult {
  images: Array<{ title: string; prompt: string }>;
  videos: Array<{ title: string; prompt: string }>;
  copies: Array<{ title: string; topic: string }>;
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

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.5-flash',
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
  }));

  try {
    return JSON.parse(response.text || "{}") as AssetBriefsResult;
  } catch (e) {
    return parseJSON(response.text || "{}") as AssetBriefsResult;
  }
}

