/**
 * PII (Personally Identifiable Information) redaction utilities
 * Used to sanitize logs and prevent sensitive data leakage
 */

const PII_PATTERNS = {
  // Phone numbers (various formats)
  phone: /(\+?1?[\s.-]?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Credit card numbers (simple pattern)
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  
  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Twilio SIDs (Account SID, Call SID, etc.)
  twilioSid: /\b(AC|CA|SM|PN|RE|MG)[a-f0-9]{32}\b/gi,
};

const SENSITIVE_KEYS = [
  'password',
  'apiKey',
  'api_key',
  'token',
  'secret',
  'authToken',
  'auth_token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'Authorization',
  'authorization',
];

/**
 * Redacts PII from a string
 */
export function redactString(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }

  let redacted = str;

  // Replace phone numbers
  redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');

  // Replace email addresses
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');

  // Replace credit card numbers
  redacted = redacted.replace(PII_PATTERNS.creditCard, '[CC_REDACTED]');

  // Replace SSN
  redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN_REDACTED]');

  // Replace Twilio SIDs (keep first 4 chars for debugging)
  redacted = redacted.replace(
    PII_PATTERNS.twilioSid,
    (match) => `${match.substring(0, 4)}...${match.substring(match.length - 4)}`
  );

  return redacted;
}

/**
 * Recursively redacts PII from an object
 */
export function redactObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return redactString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item));
  }

  const redacted: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if key is sensitive
    const isSensitiveKey = SENSITIVE_KEYS.some(
      (sensitiveKey) => key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    if (isSensitiveKey) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      redacted[key] = redactString(value);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Main redaction function - handles both strings and objects
 */
export function redactPII(data: any): any {
  if (typeof data === 'string') {
    return redactString(data);
  }
  
  if (typeof data === 'object' && data !== null) {
    return redactObject(data);
  }
  
  return data;
}

/**
 * Partially redacts a value (keeps first and last few characters)
 * Useful for debugging while maintaining security
 */
export function partialRedact(value: string, showChars: number = 4): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  if (value.length <= showChars * 2) {
    return '[REDACTED]';
  }

  const prefix = value.substring(0, showChars);
  const suffix = value.substring(value.length - showChars);
  const redactedLength = value.length - (showChars * 2);

  return `${prefix}${'*'.repeat(redactedLength)}${suffix}`;
}
