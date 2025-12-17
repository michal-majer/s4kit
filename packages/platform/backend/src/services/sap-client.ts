import ky from 'ky';
import { db } from '../db';
import { connections } from '../db/schema';
import { eq } from 'drizzle-orm';
import { encryption } from './encryption';
import { redis } from '../cache/redis';
import { 
  parseODataResponse, 
  parseODataError, 
  stripODataMetadata,
  type ODataResponse 
} from './odata';
import type { Connection } from '../types';

interface SapRequestOptions {
  method: string;
  path: string;
  body?: any;
  params?: Record<string, string | number | boolean>;
  /** If true, returns raw response without OData parsing */
  raw?: boolean;
  /** If true, strips OData metadata from response entities */
  stripMetadata?: boolean;
}

/** Auth configuration resolved from connection or connectionService */
export interface ResolvedAuthConfig {
  type: string;
  username?: string | null;
  password?: string | null;
  config?: any;
  credentials?: any;
}

interface SapRequestWithAuthOptions extends SapRequestOptions {
  baseUrl: string;
  auth: ResolvedAuthConfig;
}

/**
 * Normalize path for ky - strip leading slashes (ky doesn't allow them with prefixUrl)
 */
function normalizePath(path: string): string {
  return path.replace(/^\/+/, '');
}

/**
 * Build OData-compatible query string
 * OData requires $ in parameter names (like $skip, $select) to NOT be URL-encoded
 * But we still need to encode the values properly
 */
function buildODataQueryString(params?: Record<string, string | number | boolean>): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const pairs: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    // For OData system query options, $ should not be encoded in the parameter name
    // But we still need to encode the value
    const encodedKey = key.startsWith('$') ? key : encodeURIComponent(key);
    const encodedValue = encodeURIComponent(String(value));
    pairs.push(`${encodedKey}=${encodedValue}`);
  }
  
  return pairs.join('&');
}

export const sapClient = {
  /**
   * Make a request to SAP system
   * @param connectionOrId - Either a Connection object (preferred) or connection UUID
   * @param options - Request options (method, path, body, params)
   */
  request: async (connectionOrId: Connection | string, options: SapRequestOptions) => {
    // 1. Get connection (use provided object or fetch from DB)
    let connection: Connection | undefined;
    
    if (typeof connectionOrId === 'string') {
      // Fetch connection details (fallback for backward compatibility)
      connection = await db.query.connections.findFirst({
        where: eq(connections.id, connectionOrId)
      });
    } else {
      connection = connectionOrId;
    }

    if (!connection) {
      throw new Error('Connection not found');
    }

    // 2. Decrypt credentials (only if auth is required)
    const username = connection.username ? encryption.decrypt(connection.username) : '';
    const password = connection.password ? encryption.decrypt(connection.password) : '';
    
    // 3. Prepare client
    const prefixUrl = connection.baseUrl;
    const authType = connection.authType || 'basic';
    const authHeader = authType !== 'none' ? `Basic ${btoa(`${username}:${password}`)}` : undefined;
    
    // 4. Handle CSRF (only if auth is required)
    const csrfToken = authType !== 'none' 
      ? await sapClient.getCsrfToken(connection.id, prefixUrl, authHeader!)
      : '';

    // 5. Make request
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Only add auth headers if auth is required
      if (authType !== 'none' && authHeader) {
        headers['Authorization'] = authHeader;
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }
      }
      
      // Build OData-compatible query string (don't encode $ in parameter names)
      const queryString = buildODataQueryString(options.params);
      const fullPath = queryString 
        ? `${normalizePath(options.path)}?${queryString}`
        : normalizePath(options.path);
      
      const response = await ky(fullPath, {
        prefixUrl,
        method: options.method,
        headers,
        json: options.body,
        retry: 0 // We handle retries or let SDK handle it
      });

      const rawJson = await response.json();
      return sapClient.processResponse(rawJson, options);
    } catch (error: any) {
      // If CSRF token is invalid, clear cache and retry once (only if auth is required)
      if (authType !== 'none' && error.response?.status === 403 && error.response.headers.get('x-csrf-token') === 'Required') {
        await redis.del(`csrf:${connection.id}`);
        const newToken = await sapClient.getCsrfToken(connection.id, prefixUrl, authHeader!);
        
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (authHeader) {
          retryHeaders['Authorization'] = authHeader;
          if (newToken) {
            retryHeaders['X-CSRF-Token'] = newToken;
          }
        }
        

        // Build OData-compatible query string (don't encode $ in parameter names)
        const retryQueryString = buildODataQueryString(options.params);
        const retryFullPath = retryQueryString 
          ? `${normalizePath(options.path)}?${retryQueryString}`
          : normalizePath(options.path);
        
        const response = await ky(retryFullPath, {
          prefixUrl,
          method: options.method,
          headers: retryHeaders,
          json: options.body
        });
        
        const rawJson = await response.json();
        return sapClient.processResponse(rawJson, options);
      }
      
      // Try to parse OData error from response
      throw await sapClient.handleError(error);
    }
  },

  /**
   * Make a request to SAP system with pre-resolved auth configuration
   * This is the preferred method when auth has been resolved from connectionService
   * @param options - Request options including baseUrl and resolved auth config
   */
  requestWithAuth: async (options: SapRequestWithAuthOptions) => {
    const { baseUrl, auth, ...requestOptions } = options;
    
    // Decrypt credentials (only if auth is required)
    const username = auth.username ? encryption.decrypt(auth.username) : '';
    const password = auth.password ? encryption.decrypt(auth.password) : '';
    
    // Prepare auth header
    const authType = auth.type || 'basic';
    const authHeader = authType !== 'none' ? `Basic ${btoa(`${username}:${password}`)}` : undefined;
    
    // Generate a unique cache key for CSRF based on baseUrl + auth combo
    const csrfCacheKey = `csrf:${baseUrl}:${username}`;
    
    // Handle CSRF (only if auth is required)
    const csrfToken = authType !== 'none' && authHeader
      ? await sapClient.getCsrfTokenForUrl(csrfCacheKey, baseUrl, authHeader)
      : '';

    // Make request
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json' // Force JSON format
      };
      
      // Only add auth headers if auth is required
      if (authType !== 'none' && authHeader) {
        headers['Authorization'] = authHeader;
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }
      }
      
      // Build OData-compatible query string (don't encode $ in parameter names)
      const queryString = buildODataQueryString(requestOptions.params);
      const fullPath = queryString 
        ? `${normalizePath(requestOptions.path)}?${queryString}`
        : normalizePath(requestOptions.path);
      
      console.log('SAP request URL:', `${baseUrl}/${fullPath}`);
      
      const response = await ky(fullPath, {
        prefixUrl: baseUrl,
        method: requestOptions.method,
        headers,
        json: requestOptions.body,
        retry: 0
      });

      const rawJson = await response.json();
      return sapClient.processResponse(rawJson, requestOptions);
    } catch (error: any) {
      // If CSRF token is invalid, clear cache and retry once
      if (authType !== 'none' && error.response?.status === 403 && error.response.headers.get('x-csrf-token') === 'Required') {
        await redis.del(csrfCacheKey);
        const newToken = await sapClient.getCsrfTokenForUrl(csrfCacheKey, baseUrl, authHeader!);
        
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        if (authHeader) {
          retryHeaders['Authorization'] = authHeader;
          if (newToken) {
            retryHeaders['X-CSRF-Token'] = newToken;
          }
        }

        // Build OData-compatible query string (don't encode $ in parameter names)
        const retryQueryString = buildODataQueryString(requestOptions.params);
        const retryFullPath = retryQueryString 
          ? `${normalizePath(requestOptions.path)}?${retryQueryString}`
          : normalizePath(requestOptions.path);
        
        const response = await ky(retryFullPath, {
          prefixUrl: baseUrl,
          method: requestOptions.method,
          headers: retryHeaders,
          json: requestOptions.body
        });
        
        const rawJson = await response.json();
        return sapClient.processResponse(rawJson, requestOptions);
      }
      
      // Try to parse OData error from response
      throw await sapClient.handleError(error);
    }
  },

  /**
   * Process OData response - parse and optionally strip metadata
   */
  processResponse: (rawJson: any, options: SapRequestOptions): ODataResponse | any => {
    if (options.raw) {
      return rawJson;
    }

    const parsed = parseODataResponse(rawJson);
    
    if (options.stripMetadata) {
      if (Array.isArray(parsed.data)) {
        parsed.data = parsed.data.map(stripODataMetadata);
      } else if (parsed.data && typeof parsed.data === 'object') {
        parsed.data = stripODataMetadata(parsed.data);
      }
    }

    return parsed;
  },

  /**
   * Handle and parse OData errors
   */
  handleError: async (error: any) => {
    if (error.response) {
      try {
        const errorText = await error.response.text();
        let errorJson: any;
        
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          // If not JSON, try to create a structured error from text
          errorJson = { error: { message: errorText || error.response.statusText || 'Unknown error' } };
        }
        
        const odataError = parseODataError(errorJson);
        const enhancedError = new Error(odataError.message) as any;
        enhancedError.code = odataError.code;
        enhancedError.details = odataError.details;
        enhancedError.status = error.response.status;
        enhancedError.odataError = odataError;
        enhancedError.rawErrorResponse = errorJson; // Keep raw response for debugging
        
        // Log the actual error response for debugging
        console.error('SAP error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          parsedError: odataError,
          rawResponse: errorJson
        });
        
        return enhancedError;
      } catch (parseError) {
        // Couldn't parse error response
        console.error('Failed to parse error response:', parseError);
        const enhancedError = new Error(error.message || 'Request failed') as any;
        enhancedError.status = error.response.status;
        enhancedError.odataError = {
          code: 'PARSE_ERROR',
          message: `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        };
        return enhancedError;
      }
    }
    return error;
  },

  getCsrfToken: async (connectionId: string, baseUrl: string, authHeader: string) => {
    const cached = await redis.get(`csrf:${connectionId}`);
    if (cached) return cached;

    try {
      const response = await ky.head('', {
        prefixUrl: baseUrl,
        headers: {
          'Authorization': authHeader,
          'X-CSRF-Token': 'Fetch'
        }
      });
      
      const token = response.headers.get('x-csrf-token');
      if (token) {
        await redis.set(`csrf:${connectionId}`, token, 'EX', 3600); // Cache for 1 hour
        return token;
      }
    } catch (e) {
      console.warn('Failed to fetch CSRF token, proceeding without it', e);
    }
    
    return '';
  },

  /**
   * Get CSRF token using a custom cache key
   * Used when auth is resolved from connectionService instead of connection
   */
  getCsrfTokenForUrl: async (cacheKey: string, baseUrl: string, authHeader: string) => {
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await ky.head('', {
        prefixUrl: baseUrl,
        headers: {
          'Authorization': authHeader,
          'X-CSRF-Token': 'Fetch'
        }
      });
      
      const token = response.headers.get('x-csrf-token');
      if (token) {
        await redis.set(cacheKey, token, 'EX', 3600); // Cache for 1 hour
        return token;
      }
    } catch (e) {
      console.warn('Failed to fetch CSRF token, proceeding without it', e);
    }
    
    return '';
  }
};
