/**
 * Utility functions for formatting error messages for user display
 */

/**
 * Formats a verification error message into a user-friendly string
 * Returns both a friendly message and preserves the raw error for debugging
 */
export function formatVerificationError(error: string | null | undefined): {
  message: string;
  raw: string | null;
} {
  if (!error) {
    return { message: 'Unknown error', raw: null };
  }

  let rawError = error;

  // Try to parse as JSON first (in case full response is stored)
  try {
    const parsed = JSON.parse(error);
    if (parsed.error) {
      rawError = parsed.error;
    }
  } catch {
    // Not JSON, use original
  }

  // Extract status code
  const statusMatch = rawError.match(/status (\d{3})/i);
  const statusCode = statusMatch?.[1];

  // Map common errors to friendly messages
  if (statusCode === '404' || rawError.includes('does not exist')) {
    return {
      message: 'Service endpoint not found. Check the URL and service path.',
      raw: error,
    };
  }

  if (statusCode === '401' || rawError.toLowerCase().includes('unauthorized')) {
    return {
      message: 'Authentication failed. Check your credentials.',
      raw: error,
    };
  }

  if (statusCode === '403' || rawError.toLowerCase().includes('forbidden')) {
    return {
      message: 'Access denied. Check your permissions.',
      raw: error,
    };
  }

  if (statusCode === '500' || rawError.toLowerCase().includes('internal server error')) {
    return {
      message: 'Server error. The SAP system returned an internal error.',
      raw: error,
    };
  }

  if (statusCode === '503' || rawError.toLowerCase().includes('service unavailable')) {
    return {
      message: 'Service unavailable. The SAP system may be down or overloaded.',
      raw: error,
    };
  }

  if (rawError.toLowerCase().includes('timeout') || rawError.includes('ETIMEDOUT')) {
    return {
      message: 'Connection timed out. The server may be unreachable.',
      raw: error,
    };
  }

  if (rawError.includes('ECONNREFUSED')) {
    return {
      message: 'Connection refused. Check if the server is running.',
      raw: error,
    };
  }

  if (rawError.includes('ENOTFOUND') || rawError.toLowerCase().includes('getaddrinfo')) {
    return {
      message: 'Could not resolve hostname. Check the URL.',
      raw: error,
    };
  }

  if (rawError.toLowerCase().includes('oauth')) {
    return {
      message: 'OAuth authentication failed. Check token URL and credentials.',
      raw: error,
    };
  }

  if (rawError.toLowerCase().includes('certificate') || rawError.includes('SSL') || rawError.includes('TLS')) {
    return {
      message: 'SSL/TLS certificate error. The server certificate may be invalid.',
      raw: error,
    };
  }

  // For unrecognized errors, truncate if too long
  const message = rawError.length > 100 ? rawError.substring(0, 100) + '...' : rawError;

  return { message, raw: error };
}

/**
 * Simple version that just returns the friendly message string
 */
export function getErrorMessage(error: string | null | undefined): string {
  return formatVerificationError(error).message;
}
