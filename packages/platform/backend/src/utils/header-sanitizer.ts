/**
 * List of sensitive header names that should be masked in logs
 */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'authorization-token',
  'bearer',
]);

/**
 * Mask a sensitive value, showing only first 4 and last 4 characters
 * Example: "Bearer s4k_dev_21ipl5_6B6Wp8jtAqg42nLku588VCXHKJDZNn8G3BbTNu3Id0i" 
 *          -> "Bear...i0i"
 */
function maskValue(value: string): string {
  if (value.length <= 12) {
    return '***';
  }
  const prefix = value.substring(0, 4);
  const suffix = value.substring(value.length - 4);
  return `${prefix}...${suffix}`;
}

/**
 * Sanitize headers by masking sensitive values
 * @param headers - Raw headers object
 * @returns Sanitized headers with sensitive values masked
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      // Mask sensitive headers
      sanitized[key] = maskValue(value);
    } else {
      // Keep non-sensitive headers as-is
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize headers from Headers object (Web API)
 */
export function sanitizeHeadersFromHeaders(headers: Headers): Record<string, string> {
  const headersObj: Record<string, string> = {};
  headers.forEach((value, key) => {
    headersObj[key] = value;
  });
  return sanitizeHeaders(headersObj);
}

