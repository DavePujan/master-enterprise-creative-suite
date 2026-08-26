import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { concept, commerceMode, guidelines, referenceContexts } = req.body;
    if (!concept) {
      return res.status(400).json({ error: "Missing campaign product description concept" });
    }

    console.log(`Generating Vercel campaign prompts for: "${concept}"`);

    const guidelinesContext = guidelines ? `
Brand Guidelines Context:
- Brand Name: ${guidelines.name || 'Not Specified'}
- Industry: ${guidelines.industry || 'Not Specified'}
- Pillars: ${(guidelines.pillars || []).join(', ')}
- Tone: ${guidelines.tone || 'Not Specified'}
- Prime Colors: ${(guidelines.colors || []).join(', ')}
- Location/Target: ${guidelines.location || 'India'}
- Target Voicestyle: ${guidelines.voiceAccentStyle || 'Indian English'}
- Ethnic Demographics: ${guidelines.visualEthnicityStyle || 'Indian'}
` : '';

    const referenceDescription = referenceContexts ? `
Reference Contexts Available:
- Product Reference uploaded: ${referenceContexts.hasProduct ? 'Yes, product photo' : 'No (Use fallback to guidelines/description)'}
- Face/Model Reference uploaded: ${referenceContexts.hasFace ? 'Yes, model/face photo' : 'No'}
- Logo Reference uploaded: ${referenceContexts.hasLogo ? 'Yes, guidelines logo' : 'No'}
` : '';

    const userTonePrompt = `
You are an award-winning Creative Director. Solve the following task:
Generate 5 cohesive, high-fashion, complementary image prompts suitable for a premium visual digital campaign centered on the product: "${concept}".

Commerce Mode: ${commerceMode === 'quick-commerce' ? 'Quick-Commerce (High visual impact, clear delivery details, clean uncluttered arrangements, extremely fast visual readability, vibrant pop framing)' : 'E-commerce (Editorial, rich storytelling, natural setting, studio premium soft lighting)'}

${guidelinesContext}
${referenceDescription}

CULTURAL/REGIONAL GUIDELINE:
Any human model, face, or characters described in the prompts MUST look like they belong to the '${guidelines?.visualEthnicityStyle || 'Indian'}' ethnic demographic. The environment, clothing, props, and lifestyle context must naturally and premiumly reflect a gorgeous contemporary style in ${guidelines?.location || 'India'}. Avoid generic default western styles.

DELIVERABLE SPECIFICS (You must generate prompt descriptions for these exact 5 assets):
1. 'Hero' Asset: A grand overarching banner displaying the key branding product, epic cinematic lighting, breathtaking clean framing.
2. 'Closeup' Asset: A macro-focus shot centering beautiful rich textures, delicate organic details, or glossy material finish of the product.
3. 'Lifestyle' Asset: A lifestyle/ambient scene featuring the product active in a real premium scenario (e.g. skin routine, kitchen counter, active run in local landmarks) styled with high-fashion models/faces matching the target ethnic demographic.
4. 'Offer' Asset: A beautifully polished commercial backdrop designed with generous breathing space, sleek flat lays, or side-lit empty area perfectly suited for clean overlay of digital discount tags or deal text.
5. 'Alternate' Asset: A creative, artistic or alternative color-mood variation that introduces a distinct perspective while sharing the unified aesthetic palette.

COHESION LAW: All 5 prompts must explicitly share a singular aesthetic, color temperature, lighting philosophy, and artistic direction. State this unified style directory in the "aesthetic" field.
NO TEXT IN VISUALS: Do NOT describe words, labels, text overlays, or synthetic credit lines in the image prompts themselves. Let the prompts depict purely natural visual elements.

Construct a gorgeous JSON response matching the precise structure schema requested.
`;

    const gClient = getAI();
    const promptResponse = await gClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userTonePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaign_title: { type: Type.STRING, description: "A catchy high-end title for this visual campaign" },
            aesthetic: { type: Type.STRING, description: "A high-level description of the unified visual aesthetic direction" },
            assets: {
              type: Type.OBJECT,
              properties: {
                Hero: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Closeup: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Lifestyle: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Offer: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                },
                Alternate: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    prompt: { type: Type.STRING, description: "Highly detailed visual description prompt for the image engine" }
                  },
                  required: ["title", "role", "description", "prompt"]
                }
              },
              required: ["Hero", "Closeup", "Lifestyle", "Offer", "Alternate"]
            }
          },
          required: ["campaign_title", "aesthetic", "assets"]
        }
      }
    });

    if (!promptResponse.text) {
      throw new Error("No response string from Gemini");
    }

    const campaignData = JSON.parse(promptResponse.text.trim());
    return res.status(200).json(campaignData);
  } catch (e: any) {
    console.error("Vercel prompts function error:", e);
    return res.status(500).json({ error: e.message || "Failed to generate cohesive campaign prompts" });
  }
}
