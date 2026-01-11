import ky from 'ky';
import { encryption } from '@s4kit/shared/services';
import { redis } from '../cache/redis';
import { oauthTokenService, type OAuthTokenConfig } from './oauth';
import {
  parseODataResponse,
  parseODataError,
  stripODataMetadata,
  type ODataResponse
} from '@s4kit/shared/services';

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

/** Auth configuration resolved from instance or instanceService */
export interface ResolvedAuthConfig {
  type: string;
  username?: string | null;
  password?: string | null;
  config?: any;
  credentials?: any;
}

interface SapRequestWithAuthOptions extends SapRequestOptions {
  baseUrl: string;
  auth: ResolvedAuthConfig | null;
}

// Return type for SAP requests with timing information
export interface SapRequestResult {
  data: any;
  responseTime?: number; // Time in milliseconds
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
   * Make a request to SAP system with pre-resolved auth configuration
   * This is the preferred method when auth has been resolved from instanceService
   * @param options - Request options including baseUrl and resolved auth config
   */
  requestWithAuth: async (options: SapRequestWithAuthOptions) => {
    const { baseUrl, auth, ...requestOptions } = options;

    // Prepare authentication based on auth type
    const authType = auth?.type || 'none';
    let authHeader: string | undefined;
    let apiKeyHeader: { name: string; value: string } | undefined;
    let csrfToken = '';
    const csrfCacheKey = auth ? `csrf:${baseUrl}:${auth.username || 'apikey'}` : `csrf:${baseUrl}:noauth`;

    if (!auth || authType === 'none') {
      // No authentication
    } else if (authType === 'basic') {
      // Basic authentication
      const username = auth.username ? encryption.decrypt(auth.username) : '';
      const password = auth.password ? encryption.decrypt(auth.password) : '';
      authHeader = `Basic ${btoa(`${username}:${password}`)}`;
      
      // Handle CSRF for basic auth
      csrfToken = authHeader
        ? await sapClient.getCsrfTokenForUrl(csrfCacheKey, baseUrl, authHeader)
        : '';
    } else if (authType === 'custom') {
      // Custom authentication - get header name and value from auth config
      const authConfig = auth.config as any;
      const credentials = auth.credentials as any;

      if (authConfig?.headerName && credentials?.headerValue) {
        const headerName = authConfig.headerName;
        const headerValue = encryption.decrypt(credentials.headerValue);
        apiKeyHeader = { name: headerName, value: headerValue };
      } else {
        throw new Error('Custom authentication header name and value not found in auth configuration');
      }
    } else if (authType === 'oauth2') {
      // OAuth2 authentication (Client Credentials or JWT Bearer)
      const authConfig = auth.config as any;
      const credentials = auth.credentials as any;

      if (!authConfig?.tokenUrl || !authConfig?.clientId) {
        throw new Error('OAuth2 tokenUrl and clientId are required in authConfig');
      }
      if (!credentials?.clientSecret) {
        throw new Error('OAuth2 clientSecret is required in credentials');
      }

      const oauthConfig: OAuthTokenConfig = {
        tokenUrl: authConfig.tokenUrl,
        clientId: authConfig.clientId,
        clientSecret: encryption.decrypt(credentials.clientSecret),
        scope: authConfig.scope,
        grantType: authConfig.grantType || 'client_credentials',
        assertion: authConfig.assertion,
      };

      // Use baseUrl + clientId for cache key to ensure uniqueness per service
      const cacheKey = `oauth:${baseUrl}:${authConfig.clientId}`;
      const accessToken = await oauthTokenService.getToken(oauthConfig, cacheKey);
      authHeader = `Bearer ${accessToken}`;
      // OAuth typically doesn't need CSRF tokens
    } else {
      throw new Error(`Authentication type '${authType}' is not supported`);
    }

    // Make request
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json' // Force JSON format
      };
      
      // Add authentication headers based on auth type
      if (authType === 'custom' && apiKeyHeader) {
        headers[apiKeyHeader.name] = apiKeyHeader.value;
      } else if (authType === 'basic' && authHeader) {
        headers['Authorization'] = authHeader;
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }
      } else if (authType === 'oauth2' && authHeader) {
        headers['Authorization'] = authHeader;
      }
      
      // Build OData-compatible query string (don't encode $ in parameter names)
      const queryString = buildODataQueryString(requestOptions.params);
      const fullPath = queryString 
        ? `${normalizePath(requestOptions.path)}?${queryString}`
        : normalizePath(requestOptions.path);
      
      console.log('SAP request URL:', `${baseUrl}/${fullPath}`);
      
      const sapStart = Date.now();
      const response = await ky(fullPath, {
        prefixUrl: baseUrl,
        method: requestOptions.method,
        headers,
        json: requestOptions.body,
        retry: 0
      });
      const sapEnd = Date.now();
      const sapResponseTime = sapEnd - sapStart;

      const rawJson = await response.json();
      const processedData = sapClient.processResponse(rawJson, requestOptions);
      
      // Attach timing info to the response if it's an object
      if (processedData && typeof processedData === 'object') {
        (processedData as any).__sapResponseTime = sapResponseTime;
      }
      
      return processedData;
    } catch (error: any) {
      // If CSRF token is invalid, clear cache and retry once (only for basic auth)
      if (authType === 'basic' && error.response?.status === 403 && error.response.headers.get('x-csrf-token') === 'Required') {
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

        const retrySapStart = Date.now();
        const response = await ky(retryFullPath, {
          prefixUrl: baseUrl,
          method: requestOptions.method,
          headers: retryHeaders,
          json: requestOptions.body
        });
        const retrySapEnd = Date.now();
        const retrySapResponseTime = retrySapEnd - retrySapStart;

        const rawJson = await response.json();
        const processedData = sapClient.processResponse(rawJson, requestOptions);

        // Attach timing info to the response if it's an object
        if (processedData && typeof processedData === 'object') {
          (processedData as any).__sapResponseTime = retrySapResponseTime;
        }

        return processedData;
      }

      // If OAuth token is rejected (401), invalidate cache and retry once
      if (auth && authType === 'oauth2' && error.response?.status === 401) {
        const authConfig = auth.config as any;
        const credentials = auth.credentials as any;
        const cacheKey = `oauth:${baseUrl}:${authConfig.clientId}`;

        // Invalidate cached token
        await oauthTokenService.invalidateToken({
          tokenUrl: authConfig.tokenUrl,
          clientId: authConfig.clientId,
          clientSecret: encryption.decrypt(credentials.clientSecret),
        }, cacheKey);

        // Fetch new token
        const oauthConfig: OAuthTokenConfig = {
          tokenUrl: authConfig.tokenUrl,
          clientId: authConfig.clientId,
          clientSecret: encryption.decrypt(credentials.clientSecret),
          scope: authConfig.scope,
          grantType: authConfig.grantType || 'client_credentials',
          assertion: authConfig.assertion,
        };
        const newAccessToken = await oauthTokenService.getToken(oauthConfig, cacheKey);

        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${newAccessToken}`,
        };

        const retryQueryString = buildODataQueryString(requestOptions.params);
        const retryFullPath = retryQueryString
          ? `${normalizePath(requestOptions.path)}?${retryQueryString}`
          : normalizePath(requestOptions.path);

        const retrySapStart = Date.now();
        const response = await ky(retryFullPath, {
          prefixUrl: baseUrl,
          method: requestOptions.method,
          headers: retryHeaders,
          json: requestOptions.body
        });
        const retrySapEnd = Date.now();
        const retrySapResponseTime = retrySapEnd - retrySapStart;

        const rawJson = await response.json();
        const processedData = sapClient.processResponse(rawJson, requestOptions);

        if (processedData && typeof processedData === 'object') {
          (processedData as any).__sapResponseTime = retrySapResponseTime;
        }

        return processedData;
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

  /**
   * Get CSRF token using a custom cache key
   * Used when auth is resolved from instanceService instead of instance
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
