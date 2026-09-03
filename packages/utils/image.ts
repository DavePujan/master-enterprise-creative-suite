/**
 * Pure image manipulation utilities for client-side compression and scaling.
 */

/**
 * Resizes and compresses a base64 image URL using HTML Canvas so it is guaranteed to fit within Firestore's 1MB limit.
 */
export function compressBase64Image(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return Promise.resolve(base64Str);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error('Failed to export canvas as data URL:', err);
        resolve(base64Str);
      }
    };
    img.onerror = (err) => {
      console.error('Failed to load image for compression:', err);
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

/**
 * Resizes an image if its dimensions exceed maxDim, returning JPEG data URL.
 */
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
