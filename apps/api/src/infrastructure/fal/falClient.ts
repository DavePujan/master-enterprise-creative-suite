/**
 * Fal.ai Queue Runner & Video Poller.
 * Preserves exact endpoints, payload mappings, 2s polling loops, and response unpackers.
 */

import { serverConfig } from "../../config/env.js";

export function resolveFalKey(): string {
  return serverConfig.falApiKey.trim();
}

export async function renderFalImage(
  prompt: string,
  size?: string,
  engine?: string,
  _ignoredKey?: string,
  referenceImages?: string[]
): Promise<string> {
  const falKey = resolveFalKey();
  if (!falKey) {
    throw new Error("No Fal API key provided");
  }

  let sizeObj = "square";
  if (size === '16:9') sizeObj = "landscape_16_9";
  else if (size === '9:16') sizeObj = "portrait_16_9";
  else if (size === '4:3') sizeObj = "landscape_4_3";
  else if (size === '3:4') sizeObj = "portrait_4_3";

  const falEndpoint =
    engine === 'openai-gpt-image-2' || engine === 'openai/gpt-image-2'
      ? 'https://queue.fal.run/openai/gpt-image-2'
      : engine === 'fal-ai/flux/dev'
      ? 'https://queue.fal.run/fal-ai/flux/dev'
      : 'https://queue.fal.run/fal-ai/flux/schnell';

  const falPayload: any = {
    prompt: prompt,
    image_size: sizeObj,
    num_inference_steps: (engine && engine.includes('schnell')) ? 4 : 28,
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

  const falResponse = await fetch(falEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${falKey}`
    },
    body: JSON.stringify(falPayload)
  });

  if (!falResponse.ok) {
    const errBody = await falResponse.text();
    throw new Error(`Fal Queue submission failed (${falResponse.status}): ${errBody}`);
  }

  const queueJson = await falResponse.json();
  const { status_url, response_url, request_id } = queueJson;

  if (!status_url || !response_url) {
    if (queueJson.images && queueJson.images[0] && queueJson.images[0].url) {
      return queueJson.images[0].url;
    }
    throw new Error(`Invalid queue response structure from Fal: ${JSON.stringify(queueJson)}`);
  }

  console.log(`Successfully queued Fal request ${request_id || ''}. Polling status...`);

  let completed = false;
  let attempts = 0;
  const maxAttempts = 150; // up to 300 seconds (5 minutes) total polling budget
  let resultJson: any = null;

  while (!completed && attempts < maxAttempts) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusRes = await fetch(status_url, {
      headers: {
        "Authorization": `Key ${falKey}`
      }
    });

    if (!statusRes.ok) {
      console.warn(`Polling attempt ${attempts} received error status ${statusRes.status}. Retrying...`);
      continue;
    }

    const statusJson = await statusRes.json();
    const currentStatus = statusJson.status;
    console.log(`Fal request ${request_id || ''} status (Attempt ${attempts}): ${currentStatus}`);

    if (currentStatus === "COMPLETED") {
      completed = true;
      break;
    } else if (currentStatus === "FAILED" || currentStatus === "CANCELLED") {
      throw new Error(`Fal generation failed or was cancelled in queue: ${statusJson.error || 'Unknown error'}`);
    }
  }

  if (!completed) {
    throw new Error(`Fal generation timed out in queue after ${maxAttempts * 2} seconds`);
  }

  console.log(`Fal request ${request_id || ''} completed. Fetching response from ${response_url}`);
  const resultRes = await fetch(response_url, {
    headers: {
      "Authorization": `Key ${falKey}`
    }
  });

  if (!resultRes.ok) {
    const errBody = await resultRes.text();
    throw new Error(`Failed to fetch Fal queue final response (${resultRes.status}): ${errBody}`);
  }

  resultJson = await resultRes.json();

  if (resultJson && resultJson.images && resultJson.images[0] && resultJson.images[0].url) {
    return resultJson.images[0].url;
  }
  throw new Error("No images found in Fal response detail payload");
}

export async function createFalVideoJob(
  prompt: string,
  size?: string,
  engine?: string,
  _customFalKey?: string
): Promise<{ status_url: string; response_url: string; request_id: string; done: boolean; url?: string }> {
  const falKey = resolveFalKey();
  if (!falKey) {
    throw new Error("FAL_API_KEY environment variable is required for ByteDance/Kling video generation");
  }

  let falEndpoint = "";
  if (engine === 'bytedance/seedance-2.0') {
    falEndpoint = "https://queue.fal.run/fal-ai/bytedance/seedae-2.0";
  } else {
    falEndpoint = "https://queue.fal.run/fal-ai/kling-video/v1/standard/text-to-video";
  }

  const falPayload: any = {
    prompt: prompt,
    aspect_ratio: size || "16:9"
  };

  const falResponse = await fetch(falEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${falKey}`
    },
    body: JSON.stringify(falPayload)
  });

  if (!falResponse.ok) {
    const errBody = await falResponse.text();
    throw new Error(`Fal Queue submission failed (${falResponse.status}): ${errBody}`);
  }

  const queueJson = await falResponse.json();
  const { status_url, response_url, request_id } = queueJson;

  if (!status_url || !response_url) {
    if (queueJson.video && queueJson.video.url) {
      return {
        status_url: "",
        response_url: "",
        request_id: request_id || "completed",
        url: queueJson.video.url,
        done: true
      };
    }
    throw new Error(`Invalid queue response structure from Fal Video: ${JSON.stringify(queueJson)}`);
  }

  return {
    status_url: status_url,
    response_url: response_url,
    request_id: request_id,
    done: false
  };
}

export async function pollFalVideoJob(
  operation: { status_url: string; response_url: string; request_id?: string; engine?: string },
  _customFalKey?: string
): Promise<{ done: boolean; response?: any; operation?: any; status_url?: string; response_url?: string; request_id?: string; engine?: string }> {
  const falKey = resolveFalKey();
  if (!falKey) {
    throw new Error("FAL_API_KEY is required to check status");
  }

  const statusRes = await fetch(operation.status_url, {
    headers: {
      "Authorization": `Key ${falKey}`
    }
  });

  if (!statusRes.ok) {
    const errBody = await statusRes.text();
    throw new Error(`Failed to check status: ${errBody}`);
  }

  const statusJson = await statusRes.json();
  const currentStatus = statusJson.status;
  console.log(`Fal Video Operation ${operation.request_id || ''} status checked: ${currentStatus}`);

  if (currentStatus === "COMPLETED") {
    const responseRes = await fetch(operation.response_url, {
      headers: {
        "Authorization": `Key ${falKey}`
      }
    });

    if (!responseRes.ok) {
      const errBody = await responseRes.text();
      throw new Error(`Failed to fetch completed response: ${errBody}`);
    }

    const responseJson = await responseRes.json();
    let videoUrl = "";
    if (responseJson.video && responseJson.video.url) {
      videoUrl = responseJson.video.url;
    } else if (responseJson.video_url) {
      videoUrl = responseJson.video_url;
    } else if (responseJson.videos && responseJson.videos[0] && responseJson.videos[0].url) {
      videoUrl = responseJson.videos[0].url;
    } else if (responseJson.images && responseJson.images[0] && responseJson.images[0].url) {
      videoUrl = responseJson.images[0].url;
    } else {
      throw new Error(`Could not find video URL in completed payload: ${JSON.stringify(responseJson)}`);
    }

    return {
      done: true,
      response: {
        generatedVideos: [
          {
            video: {
              uri: videoUrl
            }
          }
        ]
      },
      operation: {
        ...operation,
        done: true
      }
    };
  } else if (currentStatus === "FAILED" || currentStatus === "CANCELLED") {
    throw new Error(`Fal Video generation failed or was cancelled in queue: ${statusJson.error || 'Unknown error'}`);
  }

  return {
    done: false,
    response_url: operation.response_url,
    status_url: operation.status_url,
    request_id: operation.request_id,
    engine: operation.engine
  };
}
