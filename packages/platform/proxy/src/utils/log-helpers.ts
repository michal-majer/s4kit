import { createHash, randomUUID } from 'crypto';
import type { ErrorCategory, SecureLogData } from '../types.ts';

/**
 * Generate a unique request ID for correlation/tracing
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Hash client IP for privacy-preserving analytics
 * Uses SHA-256 with a daily salt to prevent rainbow table attacks
 * while still allowing same-day correlation
 */
export function hashClientIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;

  // Use date as salt - allows same-day correlation but not cross-day tracking
  const dateSalt = new Date().toISOString().split('T')[0];
  return createHash('sha256')
    .update(`${ip}:${dateSalt}`)
    .digest('hex');
}

/**
 * Extract entity name from OData path
 * e.g., "A_BusinessPartner('123')/to_Address" -> "A_BusinessPartner"
 */
export function extractEntity(path: string): string | undefined {
  // Strip /api/proxy prefix if present
  const entityPath = path.replace(/^\/api\/proxy\/?/, '');
  const match = entityPath.match(/^([A-Za-z0-9_]+)/);
  return match?.[1];
}

/**
 * Map HTTP method to operation type
 */
export function methodToOperation(method: string): SecureLogData['operation'] {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

/**
 * Categorize error based on status code and error details
 */
export function categorizeError(
  statusCode: number,
  errorCode?: string,
  errorMessage?: string
): ErrorCategory {
  // Authentication errors
  if (statusCode === 401) return 'auth';

  // Permission/authorization errors
  if (statusCode === 403) return 'permission';

  // Validation errors (bad request)
  if (statusCode === 400 || statusCode === 422) return 'validation';

  // Timeout errors
  if (statusCode === 408 || statusCode === 504) return 'timeout';
  if (errorMessage?.toLowerCase().includes('timeout')) return 'timeout';

  // Network errors
  if (statusCode === 502 || statusCode === 503) return 'network';
  if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND') return 'network';

  // Default to server error
  return 'server';
}

/**
 * Calculate byte size of a value
 */
export function calculateSize(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8');
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

/**
 * Count records in an OData response
 */
export function countRecords(response: unknown): number | undefined {
  if (!response || typeof response !== 'object') return undefined;

  const obj = response as Record<string, unknown>;

  // OData v4 format: { value: [...] }
  if (Array.isArray(obj.value)) {
    return obj.value.length;
  }

  // OData v2 format: { d: { results: [...] } }
  if (obj.d && typeof obj.d === 'object') {
    const d = obj.d as Record<string, unknown>;
    if (Array.isArray(d.results)) {
      return d.results.length;
    }
  }

  // Single entity response
  if (!Array.isArray(obj)) {
    return 1;
  }

  return undefined;
}

/**
 * Sanitize error message - remove potentially sensitive data
 */
export function sanitizeErrorMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;

  // Truncate to reasonable length
  let sanitized = message.length > 500 ? message.substring(0, 500) : message;

  // Remove potential credentials/tokens from error messages
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/Basic\s+[A-Za-z0-9+/]+=*/gi, 'Basic [REDACTED]');
  sanitized = sanitized.replace(/password['":\s]*[^,}\s]+/gi, 'password:[REDACTED]');

  return sanitized;
}
