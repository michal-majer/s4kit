/**
 * OAuth Token Service - backend wrapper
 * Re-exports the shared OAuth service initialized with local Redis client
 */

import { redis } from '../cache/redis';
import { createOAuthTokenService, type OAuthTokenConfig } from '@s4kit/shared/services';

// Create and export the service instance bound to our Redis client
export const oauthTokenService = createOAuthTokenService(redis);

// Re-export the config type for consumers
export type { OAuthTokenConfig };
