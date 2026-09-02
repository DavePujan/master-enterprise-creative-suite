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

// Re-export pure image utilities for backward compatibility
export { compressBase64Image, resizeImageIfNeeded } from '../shared/utils/image.js';
