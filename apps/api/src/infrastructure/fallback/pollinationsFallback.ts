/**
 * Pollinations FLUX Resilient Fallback Engine.
 * Preserves exact fallback dimension mapping, seed randomization, and URL structure.
 */

export function generatePollinationsFallback(
  prompt: string,
  size?: string,
  guidelinesName?: string,
  hasTargetFalKey: boolean = false
): { url: string; engine: string; isFallback: boolean; warning: string } {
  const seed = Math.floor(Math.random() * 1000000);
  let width = 1024,
    height = 1024;

  if (size === '16:9') {
    width = 1280;
    height = 720;
  } else if (size === '9:16') {
    width = 720;
    height = 1280;
  } else if (size === '4:3') {
    width = 1024;
    height = 768;
  } else if (size === '3:4') {
    width = 768;
    height = 1024;
  }

  const brandDetails = guidelinesName ? ` ${guidelinesName}` : '';
  const fallbackUrl = `https://pollinations.ai/p/${encodeURIComponent(
    prompt + brandDetails
  )}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

  return {
    url: fallbackUrl,
    engine: 'pollinations-flux-fallback',
    isFallback: true,
    warning: !hasTargetFalKey
      ? "No Fal API Key specified. Rendered using High-Quality Flux engine."
      : "Fal request failed. Reverted to High-Quality Flux fallback engine."
  };
}
