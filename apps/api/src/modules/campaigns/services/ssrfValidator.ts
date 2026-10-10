/**
 * Server-Side Request Forgery (SSRF) Protection Utility for Asset & Export Handlers.
 * Enforces strict HTTPS protocol, blocks loopback/private/link-local/metadata IP addresses,
 * and validates external hostnames against approved storage and provider CDN domains.
 */

import { URL } from "url";

const PRIVATE_IP_PREFIXES = [
  "127.",
  "10.",
  "192.168.",
  "169.254.", // AWS/GCP/Azure link-local metadata service
  "0.0.0.0",
  "::1",
  "fc00:",
  "fe80:",
];

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return true;
  }

  // Check private IP prefixes
  for (const prefix of PRIVATE_IP_PREFIXES) {
    if (lower.startsWith(prefix)) {
      return true;
    }
  }

  // Check 172.16.0.0 - 172.31.255.255
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)) {
    return true;
  }

  // Block cloud metadata hostnames
  if (lower.includes("metadata.google.internal") || lower.includes("metadata.azure.com")) {
    return true;
  }

  return false;
}

const ALLOWED_DOMAIN_PATTERNS = [
  /\.supabase\.co$/,
  /\.fal\.media$/,
  /\.fal\.run$/,
  /\.writopedia\.com$/,
  /^writopedia\.com$/,
  /pollinations\.ai$/,
];

export function validateSafeAssetUrl(rawUrl: string): { valid: boolean; error?: string } {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Empty or invalid URL provided" };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: `Malformed URL: ${rawUrl}` };
  }

  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      error: `Insecure URL protocol '${parsed.protocol}'. Only 'https:' is permitted for server fetch.`,
    };
  }

  if (isPrivateIpOrHost(parsed.hostname)) {
    return {
      valid: false,
      error: `Blocked unsafe host '${parsed.hostname}'. Loopback, private IP ranges, and internal services are forbidden.`,
    };
  }

  const matchesAllowedDomain = ALLOWED_DOMAIN_PATTERNS.some((pattern) =>
    pattern.test(parsed.hostname.toLowerCase())
  );

  if (!matchesAllowedDomain) {
    return {
      valid: false,
      error: `Host '${parsed.hostname}' is not in the approved CDN/storage allowlist.`,
    };
  }

  return { valid: true };
}
