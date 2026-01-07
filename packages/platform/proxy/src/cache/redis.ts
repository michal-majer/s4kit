/**
 * Redis client for proxy service
 * Separate module to avoid circular dependencies
 */

import { createRedisClient } from '@s4kit/shared/cache';

// URL is auto-resolved from REDIS_URL env var or VCAP_SERVICES (Cloud Foundry)
export const redis = createRedisClient({
  lazyConnect: true,
});
