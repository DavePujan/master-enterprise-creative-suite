/**
 * Universal CORS Proxy Router with Production Multi-IP SSRF & Rebinding Protections.
 * Validates all resolved DNS records (IPv4/IPv6) and manually checks redirect targets.
 * Routes: GET /api/proxy, GET /api/proxy-image
 */

import { Router } from "express";
import dns from "dns/promises";

export const proxyRouter = Router();

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is unsafe
  }

  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 Current network
  if (a === 127) return true; // 127.0.0.0/8 Loopback
  if (a === 10) return true; // 10.0.0.0/8 Private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 Private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 Private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local & Cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 Carrier-grade NAT
  if (a >= 224 && a <= 239) return true; // 224.0.0.0/4 Multicast
  if (a >= 240) return true; // 240.0.0.0/4 Reserved / Broadcast
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const cleanIp = ip.toLowerCase().trim();

  // Loopback & Unspecified
  if (cleanIp === '::1' || cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (cleanIp.startsWith('::ffff:')) {
    const v4 = cleanIp.substring(7);
    return isPrivateOrReservedIPv4(v4);
  }

  // Unique Local (fc00::/7)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;

  // Link-Local (fe80::/10)
  if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true;

  // Multicast (ff00::/8)
  if (cleanIp.startsWith('ff')) return true;

  return false;
}

export async function validateDestinationUrl(urlStr: string): Promise<URL> {
  let urlObj: URL;
  try {
    urlObj = new URL(urlStr.trim());
  } catch {
    throw new Error(`Invalid URL provided: "${urlStr}"`);
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error(`Protocol "${urlObj.protocol}" is forbidden. Only HTTP/HTTPS are allowed.`);
  }

  // Reject URLs with embedded credentials (userinfo)
  if (urlObj.username || urlObj.password) {
    throw new Error("Embedded credentials in target URL are forbidden.");
  }

  const hostname = urlObj.hostname.toLowerCase().trim();

  // Blocked hostnames & metadata identifiers
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.corp')
  ) {
    throw new Error("Target hostname is restricted or internal.");
  }

  // Resolve all DNS records (both IPv4 and IPv6) and validate every returned IP
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      throw new Error("DNS resolution produced no address records.");
    }

    for (const record of records) {
      if (record.family === 4 && isPrivateOrReservedIPv4(record.address)) {
        throw new Error(`DNS resolved to private/reserved IPv4 address: ${record.address}`);
      }
      if (record.family === 6 && isPrivateOrReservedIPv6(record.address)) {
        throw new Error(`DNS resolved to private/reserved IPv6 address: ${record.address}`);
      }
    }
  } catch (err: any) {
    if (err.message.includes("DNS resolved to private") || err.message.includes("restricted")) {
      throw err;
    }
    throw new Error(`DNS resolution failed for hostname "${hostname}": ${err.message}`);
  }

  return urlObj;
}

// Universal proxy endpoint with strict SSRF & manual redirect protections
proxyRouter.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("Missing url parameter");

  try {
    let currentUrl = targetUrl;
    let redirectCount = 0;
    const maxRedirects = 3;
    let response: Response | null = null;

    while (redirectCount <= maxRedirects) {
      const validatedUrl = await validateDestinationUrl(currentUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        response = await fetch(validatedUrl.toString(), {
          signal: controller.signal,
          redirect: 'manual', // Manual redirect check to prevent DNS rebinding SSRF
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: validatedUrl.origin,
            Accept: '*/*'
          }
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Handle Redirects Manually
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return res.status(502).send("Redirect location header missing from target.");
        }
        currentUrl = new URL(location, validatedUrl).toString();
        redirectCount++;
        continue;
      }

      break;
    }

    if (!response) {
      return res.status(502).send("Failed to receive response from target.");
    }

    if (!response.ok) {
      return res.status(response.status).send(`Target returned error status: ${response.statusText}`);
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
      const urlWithoutParams = currentUrl.split('?')[0];
      if (
        urlWithoutParams.toLowerCase().endsWith('.md') ||
        urlWithoutParams.toLowerCase().endsWith('.txt') ||
        contentType.includes('markdown') ||
        contentType.includes('text/plain')
      ) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    }

    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    res.send(buffer);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).send("Proxy request timed out after 10 seconds.");
    }
    const isSecurityError = error.message.includes("forbidden") || error.message.includes("restricted") || error.message.includes("private");
    const statusCode = isSecurityError ? 403 : 500;
    return res.status(statusCode).send(`SSRF Security Error: ${error.message}`);
  }
});

// Backward-compatibility redirect
proxyRouter.get("/proxy-image", (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("Missing url parameter");
  res.redirect(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
});
