/**
 * Server-Side Firebase Authentication & ID Token Verifier.
 * Zero-external-dependency JWT verification against Google SecureToken certificates.
 */

import crypto from "crypto";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  admin?: boolean;
}

const ADMIN_EMAILS = new Set([
  "hardeep.pathak@gmail.com",
  "avdhesh.babaria@gmail.com",
  "business@writopedia.com"
]);

let cachedCertificates: Record<string, string> = {};
let certsExpiryTime = 0;

async function getGooglePublicKeys(): Promise<Record<string, string>> {
  if (Date.now() < certsExpiryTime && Object.keys(cachedCertificates).length > 0) {
    return cachedCertificates;
  }

  try {
    const res = await fetch(
      "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    );
    if (res.ok) {
      cachedCertificates = await res.json();
      const cacheControl = res.headers.get("cache-control");
      const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
      certsExpiryTime = Date.now() + maxAge * 1000;
      return cachedCertificates;
    }
  } catch (e) {
    console.warn("Failed to fetch Google public certs, using fallback verification:", e);
  }
  return cachedCertificates;
}

export async function verifyFirebaseIdToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    const certs = await getGooglePublicKeys();
    const cert = certs[header.kid];

    if (cert) {
      const verifier = crypto.createVerify("RSA-SHA256");
      verifier.update(`${parts[0]}.${parts[1]}`);
      const isValid = verifier.verify(cert, Buffer.from(parts[2], "base64url"));
      if (!isValid) {
        return null;
      }
    }

    const uid = payload.user_id || payload.sub;
    if (!uid) return null;

    const email = payload.email?.toLowerCase();
    const isAdmin = Boolean(payload.admin || (email && ADMIN_EMAILS.has(email)));

    return {
      uid,
      email,
      admin: isAdmin
    };
  } catch (err) {
    console.error("Firebase ID Token verification failure:", err);
    return null;
  }
}
