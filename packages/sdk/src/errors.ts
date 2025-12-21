// ============================================================================
// S4Kit SDK Error Handling - Developer-Friendly OData Errors
// ============================================================================

import type { ODataError, ODataErrorDetail, InterceptedRequest, IS4KitError } from './types';

/**
 * Base S4Kit error class with enhanced OData support
 */
export class S4KitError extends Error implements IS4KitError {
  public readonly status?: number;
  public readonly code?: string;
  public readonly odataError?: ODataError;
  public readonly request?: InterceptedRequest;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      odataError?: ODataError;
      request?: InterceptedRequest;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = 'S4KitError';
    this.status = options?.status;
    this.code = options?.code;
    this.odataError = options?.odataError;
    this.request = options?.request;
  }

  /**
   * Get a user-friendly error message
   */
  get friendlyMessage(): string {
    if (this.odataError?.message) {
      return this.odataError.message;
    }
    return this.message;
  }

  /**
   * Get all error details (for validation errors with multiple issues)
   */
  get details(): ODataErrorDetail[] {
    return this.odataError?.details ?? [];
  }

  /**
   * Check if this is a specific OData error code
   */
  hasCode(code: string): boolean {
    return this.code === code || this.odataError?.code === code;
  }

  /**
   * Convert to a plain object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      odataError: this.odataError,
      request: this.request ? {
        method: this.request.method,
        url: this.request.url,
      } : undefined,
    };
  }
}

/**
 * Network/connection error
 */
export class NetworkError extends S4KitError {
  constructor(message: string, options?: { cause?: Error; request?: InterceptedRequest }) {
    super(message, { ...options, code: 'NETWORK_ERROR' });
    this.name = 'NetworkError';
  }
}

/**
 * Request timeout error
 */
export class TimeoutError extends S4KitError {
  constructor(timeout: number, options?: { request?: InterceptedRequest }) {
    super(`Request timed out after ${timeout}ms`, { ...options, code: 'TIMEOUT' });
    this.name = 'TimeoutError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends S4KitError {
  constructor(message = 'Authentication failed', options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    super(message, { ...options, status: 401, code: 'UNAUTHORIZED' });
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends S4KitError {
  constructor(message = 'Access denied', options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    super(message, { ...options, status: 403, code: 'FORBIDDEN' });
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends S4KitError {
  constructor(entity?: string, id?: string | number, options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    const message = entity && id
      ? `${entity}(${id}) not found`
      : entity
        ? `${entity} not found`
        : 'Resource not found';
    super(message, { ...options, status: 404, code: 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error (400) with field-level details
 */
export class ValidationError extends S4KitError {
  public readonly fieldErrors: Map<string, string>;

  constructor(message: string, options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    super(message, { ...options, status: 400, code: 'VALIDATION_ERROR' });
    this.name = 'ValidationError';

    // Parse field-level errors from OData details
    this.fieldErrors = new Map();
    if (options?.odataError?.details) {
      for (const detail of options.odataError.details) {
        if (detail.target) {
          this.fieldErrors.set(detail.target, detail.message);
        }
      }
    }
  }

  /**
   * Get error for a specific field
   */
  getFieldError(field: string): string | undefined {
    return this.fieldErrors.get(field);
  }

  /**
   * Check if a specific field has an error
   */
  hasFieldError(field: string): boolean {
    return this.fieldErrors.has(field);
  }
}

/**
 * Conflict error (409) - e.g., optimistic locking failure
 */
export class ConflictError extends S4KitError {
  constructor(message = 'Resource conflict', options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    super(message, { ...options, status: 409, code: 'CONFLICT' });
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class RateLimitError extends S4KitError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    super(retryAfter
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded',
      { ...options, status: 429, code: 'RATE_LIMIT_EXCEEDED' }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Server error (5xx)
 */
export class ServerError extends S4KitError {
  constructor(message = 'Internal server error', status = 500, options?: { odataError?: ODataError; request?: InterceptedRequest }) {
    super(message, { ...options, status, code: 'SERVER_ERROR' });
    this.name = 'ServerError';
  }
}

/**
 * Batch operation error with per-request results
 */
export class BatchError extends S4KitError {
  public readonly results: Array<{ success: boolean; error?: S4KitError; index: number }>;

  constructor(message: string, results: Array<{ success: boolean; error?: S4KitError; index: number }>) {
    super(message, { code: 'BATCH_ERROR' });
    this.name = 'BatchError';
    this.results = results;
  }

  /**
   * Get all failed operations
   */
  get failures() {
    return this.results.filter(r => !r.success);
  }

  /**
   * Get all successful operations
   */
  get successes() {
    return this.results.filter(r => r.success);
  }
}

// ============================================================================
// Error Parsing Utilities
// ============================================================================

/**
 * Parse an HTTP response into the appropriate S4Kit error
 */
export function parseHttpError(
  status: number,
  body: any,
  request?: InterceptedRequest
): S4KitError {
  const odataError = parseODataError(body);
  const message = odataError?.message ?? getDefaultMessage(status);

  switch (status) {
    case 400:
      return new ValidationError(message, { odataError, request });
    case 401:
      return new AuthenticationError(message, { odataError, request });
    case 403:
      return new AuthorizationError(message, { odataError, request });
    case 404:
      return new NotFoundError(undefined, undefined, { odataError, request });
    case 409:
      return new ConflictError(message, { odataError, request });
    case 429:
      return new RateLimitError(undefined, { odataError, request });
    default:
      if (status >= 500) {
        return new ServerError(message, status, { odataError, request });
      }
      return new S4KitError(message, { status, odataError, request });
  }
}

/**
 * Parse OData error format from response body
 */
export function parseODataError(body: any): ODataError | undefined {
  if (!body) return undefined;

  // OData v4 format: { error: { code, message, ... } }
  if (body.error) {
    return {
      code: body.error.code ?? 'UNKNOWN',
      message: body.error.message ?? 'Unknown error',
      target: body.error.target,
      details: body.error.details,
      innererror: body.error.innererror,
    };
  }

  // OData v2 format: { error: { message: { value: '...' } } }
  if (body.error?.message?.value) {
    return {
      code: body.error.code ?? 'UNKNOWN',
      message: body.error.message.value,
    };
  }

  // SAP-specific format
  if (body['odata.error']) {
    return {
      code: body['odata.error'].code ?? 'UNKNOWN',
      message: body['odata.error'].message?.value ?? 'Unknown error',
    };
  }

  return undefined;
}

/**
 * Get default error message for HTTP status code
 */
function getDefaultMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Bad request',
    401: 'Authentication required',
    403: 'Access denied',
    404: 'Resource not found',
    405: 'Method not allowed',
    409: 'Resource conflict',
    429: 'Too many requests',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Gateway timeout',
  };
  return messages[status] ?? `HTTP error ${status}`;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: Error): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TimeoutError) return true;
  if (error instanceof RateLimitError) return true;
  if (error instanceof ServerError && error.status !== 501) return true;
  return false;
}

/**
 * Type guard: Check if error is an S4KitError
 */
export function isS4KitError(error: unknown): error is S4KitError {
  return error instanceof S4KitError;
}
