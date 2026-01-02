/**
 * Redis client for proxy service
 * Separate module to avoid circular dependencies
 */

import { createRedisClient } from '@s4kit/shared/cache';

export const redis = createRedisClient({
  url: process.env.REDIS_URL,
  lazyConnect: true,
});
