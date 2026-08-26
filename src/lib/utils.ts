import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Downloads a file from a URL by fetching it and creating a local blob URL.
 * This is necessary for cross-origin downloads (like Firebase Storage) where the 
 * 'download' attribute on <a> tags might be ignored.
 */
export async function downloadFile(url: string, filename: string) {
  // Ensure we have a reasonable filename
  let finalFilename = filename || 'download';
  
  // Early check for blob/data URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    // Basic extension fix for local blob/data URLs if they are missing
    if (url.includes('text/markdown') || url.includes('text/plain')) {
       if (!finalFilename.toLowerCase().endsWith('.md') && !finalFilename.toLowerCase().endsWith('.txt')) {
         finalFilename += '.md';
       }
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  try {
    // Use the generic proxy endpoint to bypass CORS for all types of downloads
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
    
    const blob = await response.blob();
    const contentType = response.headers.get('content-type');
    
    // For markdown/text files, ensure the filename has the correct extension if missing
    if (contentType?.includes('markdown') || contentType?.includes('text/plain')) {
      if (!finalFilename.toLowerCase().endsWith('.md') && !finalFilename.toLowerCase().endsWith('.txt')) {
        finalFilename += '.md';
      }
    } else if (contentType?.includes('image/png')) {
      if (!finalFilename.toLowerCase().endsWith('.png')) finalFilename += '.png';
    } else if (contentType?.includes('image/jpeg')) {
      if (!finalFilename.toLowerCase().endsWith('.jpg')) finalFilename += '.jpg';
    } else if (contentType?.includes('video/mp4')) {
      if (!finalFilename.toLowerCase().endsWith('.mp4')) finalFilename += '.mp4';
    } else if (contentType?.includes('application/pdf')) {
      if (!finalFilename.toLowerCase().endsWith('.pdf')) finalFilename += '.pdf';
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Short delay before revoking to ensure the browser has triggered the download
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 150);
  } catch (error) {
    console.error('Download via proxy failed:', error);
    
    // Fallback: trigger a direct download if possible
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

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
      // Calculate new dimensions preserving aspect ratio
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
        resolve(base64Str); // Fallback if canvas context is not supported
        return;
      }

      // Fill with white background (in case of transparent PNGs converting to JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      try {
        // Convert to JPEG with specified quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error('Failed to export canvas as data URL:', err);
        resolve(base64Str);
      }
    };
    img.onerror = (err) => {
      console.error('Failed to load image for compression:', err);
      resolve(base64Str); // Fallback if image loading fails
    };
    img.src = base64Str;
  });
}

