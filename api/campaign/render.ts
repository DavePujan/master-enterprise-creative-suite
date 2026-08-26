import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { prompt, size, engine, falKey, guidelines, referenceImages } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing render prompt text" });
    }

    console.log(`Rendering prompt on Vercel handler: "${prompt.slice(0, 40)}..." Engine: ${engine || 'default'}. References: ${referenceImages?.length || 0}`);

    // Try calling fal.ai if specified or if a key exists
    const targetFalKey = falKey || process.env.FAL_API_KEY || process.env.FAL_KEY;
    const useFal = engine === 'openai-gpt-image-2' && !!targetFalKey;

    if (useFal) {
      try {
        let sizeObj = "square";
        if (size === '16:9') sizeObj = "landscape_16_9";
        else if (size === '9:16') sizeObj = "portrait_16_9";
        else if (size === '4:3') sizeObj = "landscape_4_3";
        else if (size === '3:4') sizeObj = "portrait_4_3";

        const falPayload: any = {
          prompt: prompt,
          image_size: sizeObj,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          sync_mode: true
        };

        if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
          const imageObjects = referenceImages.map((img: string) => ({ url: img }));
          falPayload.images = imageObjects;
          falPayload.reference_images = imageObjects;
          falPayload.image_urls = referenceImages;
          
          // Single image fallbacks for single-image reference parameters
          falPayload.image_url = referenceImages[0];
          falPayload.image = imageObjects[0];
          falPayload.reference_image = imageObjects[0];
        }

        const falResponse = await fetch("https://queue.fal.run/openai/gpt-image-2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${targetFalKey.trim()}`
          },
          body: JSON.stringify(falPayload)
        });

        if (!falResponse.ok) {
          const errBody = await falResponse.text();
          throw new Error(`Fal API error (${falResponse.status}): ${errBody}`);
        }

        const falJson = await falResponse.json();
        if (falJson.images && falJson.images[0] && falJson.images[0].url) {
          return res.status(200).json({
            url: falJson.images[0].url,
            engine: 'openai/gpt-image-2',
            isFallback: false
          });
        }
        throw new Error("No images found in Fal response");
      } catch (err: any) {
        console.error("Fal API call failed, recovering with fallback model:", err.message);
        // Don't crash! Let it fall through to the public Pollinations Flux model
      }
    }

    // High-Quality Fallback Model (using public Pollinations Flux):
    const seed = Math.floor(Math.random() * 1000000);
    let width = 1024, height = 1024;
    
    if (size === '16:9') { width = 1280; height = 720; }
    else if (size === '9:16') { width = 720; height = 1280; }
    else if (size === '4:3') { width = 1024; height = 768; }
    else if (size === '3:4') { width = 768; height = 1024; }

    const brandDetails = guidelines?.name ? ` ${guidelines.name}` : '';
    const fallbackUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt + brandDetails)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

    return res.status(200).json({
      url: fallbackUrl,
      engine: 'pollinations-flux-fallback',
      isFallback: true,
      warning: !targetFalKey ? "No Fal API Key specified. Rendered using High-Quality Flux engine." : "Fal request failed. Reverted to High-Quality Flux fallback engine."
    });
  } catch (e: any) {
    console.error("Vercel render handler error:", e);
    return res.status(500).json({ error: e.message || "Failed to render asset image" });
  }
}
