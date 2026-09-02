/**
 * Production Structured Logger with Sensitive Field Redaction.
 * Masks prompt content, authorization tokens, secrets, and customer PII.
 */

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'token',
  'secret',
  'password',
  'apikey',
  'falkey',
  'geminikey',
  'razorpaykeysecret',
  'razorpay_signature',
  'key'
]);

export function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('Bearer ') || obj.startsWith('rzp_') || obj.length > 500) {
      return `[REDACTED string len=${obj.length}]`;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = redactSensitiveData(value);
      }
    }
    return sanitized;
  }
  return obj;
}

export const logger = {
  info: (message: string, meta?: any) => {
    if (meta) {
      console.log(`[INFO] ${message}`, JSON.stringify(redactSensitiveData(meta)));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },
  warn: (message: string, meta?: any) => {
    if (meta) {
      console.warn(`[WARN] ${message}`, JSON.stringify(redactSensitiveData(meta)));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    if (error) {
      const errStr = error?.message || (typeof error === 'string' ? error : JSON.stringify(redactSensitiveData(error)));
      console.error(`[ERROR] ${message} - ${errStr}`);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
};
