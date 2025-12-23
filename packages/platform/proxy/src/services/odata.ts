/**
 * OData utilities for handling SAP OData protocol
 * Handles query building, response parsing, and error formatting
 */

export interface ODataQueryOptions {
  select?: string[];
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
  expand?: string[];
  count?: boolean;
  search?: string;
}

export interface ODataResponse<T = any> {
  data: T | T[];
  count?: number;
  nextLink?: string;
}

export interface ODataError {
  code: string;
  message: string;
  details?: any[];
  innererror?: any;
}

/**
 * Build OData query parameters from options
 */
export function buildODataQuery(options?: ODataQueryOptions): Record<string, string> {
  if (!options) return {};

  const params: Record<string, string> = {};

  if (options.select?.length) params['$select'] = options.select.join(',');
  if (options.filter) params['$filter'] = options.filter;
  if (options.top !== undefined) params['$top'] = String(options.top);
  if (options.skip !== undefined) params['$skip'] = String(options.skip);
  if (options.orderBy) params['$orderby'] = options.orderBy;
  if (options.expand?.length) params['$expand'] = options.expand.join(',');
  if (options.count) params['$count'] = 'true';
  if (options.search) params['$search'] = options.search;

  return params;
}

/**
 * Format entity key for OData URL
 * Handles string keys (quoted) and numeric keys
 */
export function formatODataKey(key: string | number): string {
  if (typeof key === 'number') {
    return String(key);
  }
  // Handle composite keys (already formatted as key1='value1',key2='value2')
  if (key.includes('=')) {
    return key;
  }
  // Handle GUID format (don't quote)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    return `guid'${key}'`;
  }
  return `'${key}'`;
}

/**
 * Build OData entity path with optional key
 */
export function buildODataPath(entity: string, key?: string | number): string {
  if (key === undefined) {
    return entity;
  }
  return `${entity}(${formatODataKey(key)})`;
}

/**
 * Parse OData response and unwrap data
 * Handles both OData v2 (d.results) and v4 (value) formats
 */
export function parseODataResponse<T = any>(rawResponse: any): ODataResponse<T> {
  // OData v4 format
  if ('value' in rawResponse) {
    return {
      data: rawResponse.value,
      count: rawResponse['@odata.count'],
      nextLink: rawResponse['@odata.nextLink'],
    };
  }

  // OData v2 format - collection
  if (rawResponse?.d?.results) {
    return {
      data: rawResponse.d.results,
      count: rawResponse.d.__count,
      nextLink: rawResponse.d.__next,
    };
  }

  // OData v2 format - single entity
  if (rawResponse?.d) {
    return {
      data: rawResponse.d,
    };
  }

  // Already unwrapped or non-standard format
  return {
    data: rawResponse,
  };
}

/**
 * Parse OData error response
 * Handles both OData v2 and v4 error formats (JSON only)
 */
export function parseODataError(errorResponse: any): ODataError {
  // If errorResponse is a string, treat as plain text message
  if (typeof errorResponse === 'string') {
    return {
      code: 'UNKNOWN',
      message: errorResponse || 'Unknown error occurred',
    };
  }

  // OData v4 error format (JSON)
  if (errorResponse?.error) {
    return {
      code: errorResponse.error.code || 'UNKNOWN',
      message: errorResponse.error.message || 'Unknown error',
      details: errorResponse.error.details,
      innererror: errorResponse.error.innererror,
    };
  }

  // OData v2 error format (JSON)
  if (errorResponse?.error?.message?.value) {
    return {
      code: errorResponse.error.code || 'UNKNOWN',
      message: errorResponse.error.message.value,
      innererror: errorResponse.error.innererror,
    };
  }

  // SAP-specific error format
  if (errorResponse?.message?.value) {
    return {
      code: errorResponse.code || 'UNKNOWN',
      message: errorResponse.message.value,
    };
  }

  // Fallback
  return {
    code: 'UNKNOWN',
    message: typeof errorResponse === 'string' ? errorResponse : 'Unknown error occurred',
  };
}

/**
 * Strip OData metadata from entity
 */
export function stripODataMetadata<T extends Record<string, any>>(entity: T): T {
  if (!entity || typeof entity !== 'object') return entity;

  const cleaned = { ...entity };

  // Remove v2 metadata
  delete (cleaned as any).__metadata;
  delete (cleaned as any).__deferred;

  // Remove v4 metadata
  Object.keys(cleaned).forEach(key => {
    if (key.startsWith('@odata.') || key.startsWith('odata.')) {
      delete cleaned[key];
    }
  });

  return cleaned;
}

/**
 * Merge incoming query params with additional OData options
 * Allows backend to add/override query parameters
 */
export function mergeODataParams(
  incomingParams: Record<string, string>,
  additionalOptions?: ODataQueryOptions
): Record<string, string> {
  const additional = buildODataQuery(additionalOptions);
  return { ...incomingParams, ...additional };
}
