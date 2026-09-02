/**
 * Universal CORS Proxy Router with strict SSRF Protections.
 * Routes: GET /api/proxy, GET /api/proxy-image
 */

import { Router } from "express";

export const proxyRouter = Router();

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host === '::'
  ) {
    return true;
  }
  if (
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    host.endsWith('.lan') ||
    host.endsWith('.corp')
  ) {
    return true;
  }
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);
  if (match) {
    const octets = match.slice(1).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return true;
    const [a, b] = octets;
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

// Universal proxy endpoint with strict SSRF protections
proxyRouter.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("Missing url parameter");

  try {
    const sanitizedUrl = targetUrl.trim();
    let urlObj: URL;
    try {
      urlObj = new URL(sanitizedUrl);
    } catch {
      return res.status(400).send(`Invalid URL provided: ${sanitizedUrl}`);
    }

    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.status(400).send(`Protocol ${urlObj.protocol} is not allowed.`);
    }

    if (isBlockedHost(urlObj.hostname)) {
      return res.status(403).send("Requests to private, local, or metadata hostnames are forbidden.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(sanitizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Referer: urlObj.origin,
        Accept: '*/*'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch from target: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 25 * 1024 * 1024) {
      return res.status(413).send("Response exceeds maximum allowed size (25MB).");
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 25 * 1024 * 1024) {
      return res.status(413).send("Response exceeds maximum allowed size (25MB).");
    }

    const buffer = Buffer.from(arrayBuffer);

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
      const urlWithoutParams = targetUrl.split('?')[0];
      if (
        urlWithoutParams.toLowerCase().endsWith('.md') ||
        urlWithoutParams.toLowerCase().endsWith('.txt') ||
        contentType.includes('markdown') ||
        contentType.includes('text/plain')
      ) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    res.send(buffer);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).send("Proxy request timed out after 10 seconds.");
    }
    console.error("Proxy error:", error.message);
    res.status(500).send(`Proxy internal error: ${error.message}`);
  }
});

// Backward-compatibility redirect
proxyRouter.get("/proxy-image", (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("Missing url parameter");
  res.redirect(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
});
