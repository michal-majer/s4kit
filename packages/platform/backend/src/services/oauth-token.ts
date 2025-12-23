import { redis } from '../cache/redis';

/**
 * OAuth Token Service
 *
 * Handles OAuth 2.0 token acquisition and caching for SAP BTP XSUAA
 * and S/4HANA Cloud Communication Arrangements.
 *
 * Supported flows:
 * - Client Credentials (service-to-service)
 * - JWT Bearer Token (user identity propagation)
 */

export interface OAuthTokenConfig {
  /** OAuth token endpoint URL */
  tokenUrl: string;
  /** Client ID */
  clientId: string;
  /** Client Secret (already decrypted) */
  clientSecret: string;
  /** OAuth scope (space-separated) */
  scope?: string;
  /** Grant type */
  grantType?: 'client_credentials' | 'urn:ietf:params:oauth:grant-type:jwt-bearer';
  /** JWT assertion for JWT Bearer flow */
  assertion?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  jti?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const TOKEN_CACHE_PREFIX = 'oauth:token:';
const TOKEN_REFRESH_BUFFER_SECONDS = 60; // Refresh 60 seconds before expiry

/**
 * Generate a cache key for the OAuth token
 */
function generateCacheKey(config: OAuthTokenConfig): string {
  // Use clientId and tokenUrl to create unique cache key
  const key = `${config.tokenUrl}:${config.clientId}`;
  // Simple hash to keep key shorter
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${TOKEN_CACHE_PREFIX}${Math.abs(hash).toString(36)}`;
}

/**
 * Fetch a new OAuth token from the token endpoint
 */
async function fetchToken(config: OAuthTokenConfig): Promise<OAuthTokenResponse> {
  const grantType = config.grantType || 'client_credentials';

  // Build form body
  const formData = new URLSearchParams();
  formData.append('grant_type', grantType);

  if (grantType === 'client_credentials') {
    // Client Credentials flow
    if (config.scope) {
      formData.append('scope', config.scope);
    }
  } else if (grantType === 'urn:ietf:params:oauth:grant-type:jwt-bearer') {
    // JWT Bearer flow
    if (!config.assertion) {
      throw new Error('JWT assertion is required for JWT Bearer flow');
    }
    formData.append('assertion', config.assertion);
    if (config.scope) {
      formData.append('scope', config.scope);
    }
  }

  // Basic auth header for client credentials
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OAuth token request failed: ${response.status} ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error_description) {
        errorMessage = `OAuth error: ${errorJson.error_description}`;
      } else if (errorJson.error) {
        errorMessage = `OAuth error: ${errorJson.error}`;
      }
    } catch {
      // Use raw text if not JSON
      if (errorText) {
        errorMessage = `OAuth error: ${errorText}`;
      }
    }

    throw new Error(errorMessage);
  }

  const tokenResponse = await response.json() as OAuthTokenResponse;

  if (!tokenResponse.access_token) {
    throw new Error('OAuth response missing access_token');
  }

  return tokenResponse;
}

/**
 * Get OAuth access token with caching
 *
 * @param config - OAuth configuration
 * @param customCacheKey - Optional custom cache key (defaults to auto-generated)
 * @returns Access token string
 */
export async function getToken(config: OAuthTokenConfig, customCacheKey?: string): Promise<string> {
  const cacheKey = customCacheKey || generateCacheKey(config);

  // Try to get from cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const cachedToken: CachedToken = JSON.parse(cached);
      const now = Math.floor(Date.now() / 1000);

      // Check if token is still valid (with buffer)
      if (cachedToken.expiresAt > now + TOKEN_REFRESH_BUFFER_SECONDS) {
        return cachedToken.accessToken;
      }
      // Token expired or about to expire, fetch new one
    } catch {
      // Invalid cache entry, fetch new token
      await redis.del(cacheKey);
    }
  }

  // Fetch new token
  const tokenResponse = await fetchToken(config);

  // Calculate expiration time
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + tokenResponse.expires_in;

  // Cache token
  const cacheValue: CachedToken = {
    accessToken: tokenResponse.access_token,
    expiresAt,
  };

  // Set TTL to expire before the actual token expires
  const ttl = Math.max(tokenResponse.expires_in - TOKEN_REFRESH_BUFFER_SECONDS, 1);
  await redis.set(cacheKey, JSON.stringify(cacheValue), 'EX', ttl);

  return tokenResponse.access_token;
}

/**
 * Invalidate cached token
 *
 * @param config - OAuth configuration
 * @param customCacheKey - Optional custom cache key
 */
export async function invalidateToken(config: OAuthTokenConfig, customCacheKey?: string): Promise<void> {
  const cacheKey = customCacheKey || generateCacheKey(config);
  await redis.del(cacheKey);
}

/**
 * OAuth Token Service singleton
 */
export const oauthTokenService = {
  getToken,
  invalidateToken,
};
