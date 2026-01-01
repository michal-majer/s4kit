import { db, redis } from '../index.ts';
import { apiKeys, eq } from '@s4kit/shared/db';
import { timingSafeEqual } from 'crypto';
import { parseApiKey, hashApiKey } from '@s4kit/shared/services';
import type { ApiKey } from '../types.ts';

// Cache TTL in seconds
const API_KEY_CACHE_TTL = 60; // 1 minute

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

export const apiKeyService = {
  /**
   * Hash an API key using SHA-256
   * Used for verification against stored hash
   */
  hashKey: hashApiKey,

  /**
   * Validate an API key and return associated data
   *
   * Uses Redis caching for O(1) lookup, then verifies with timing-safe hash comparison
   */
  validateKey: async (key: string, clientIp?: string): Promise<ApiKeyValidationResult> => {
    // Parse the key to extract components
    const parsed = parseApiKey(key);

    if (!parsed.valid || !parsed.prefix) {
      return { valid: false, error: 'Invalid key format' };
    }

    const cacheKey = `apikey:${parsed.prefix}`;

    // Try to get from Redis cache first
    let result: ApiKey | undefined;
    const cached = await redis.get(cacheKey);

    if (cached) {
      try {
        result = JSON.parse(cached) as ApiKey;
      } catch {
        // Invalid cache entry, delete it
        await redis.del(cacheKey);
      }
    }

    // If not in cache, fetch from database
    if (!result) {
      result = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.keyPrefix, parsed.prefix),
      });

      // Cache the result if found
      if (result) {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', API_KEY_CACHE_TTL);
      }
    }

    if (!result) {
      return { valid: false, error: 'Key not found' };
    }

    // Timing-safe comparison of hashes to prevent timing attacks
    const providedHash = apiKeyService.hashKey(key);
    const storedHashBuffer = Buffer.from(result.keyHash, 'hex');
    const providedHashBuffer = Buffer.from(providedHash, 'hex');

    if (!timingSafeEqual(storedHashBuffer, providedHashBuffer)) {
      return { valid: false, error: 'Invalid key' };
    }

    // Check if key is revoked
    if (result.revoked) {
      return { valid: false, error: 'Key has been revoked' };
    }

    // Check if key has expired
    if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
      return { valid: false, error: 'Key has expired' };
    }

    // Update last used timestamp (fire and forget)
    db.update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        usageCount: result.usageCount + 1
      })
      .where(eq(apiKeys.id, result.id))
      .execute()
      .catch(err => console.error('Failed to update key usage:', err));

    return {
      valid: true,
      apiKey: result
    };
  },

  /**
   * Invalidate cached API key
   * Called by admin service when key is modified
   */
  invalidateCache: async (keyPrefix: string): Promise<void> => {
    const cacheKey = `apikey:${keyPrefix}`;
    await redis.del(cacheKey);
  },
};
