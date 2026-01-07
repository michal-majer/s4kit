import Redis from 'ioredis';
import { getRedisUrl } from '../services/cf-env-parser.ts';

export interface RedisConfig {
  /**
   * Redis connection URL. If not provided, will attempt to read from:
   * 1. REDIS_URL environment variable
   * 2. VCAP_SERVICES (Cloud Foundry service bindings)
   * 3. Default: redis://localhost:6379
   */
  url?: string;
  lazyConnect?: boolean;
  retryStrategy?: (times: number) => number | null;
}

/**
 * Creates a Redis client with standard configuration.
 *
 * @param config Redis configuration. If url is not provided,
 *               it will be resolved from REDIS_URL or VCAP_SERVICES.
 * @returns Redis client instance
 */
export function createRedisClient(config: RedisConfig = {}): Redis {
  let redisUrl: string;
  try {
    redisUrl = config.url || getRedisUrl();
  } catch {
    // Fall back to localhost if no Redis config found (for local dev)
    redisUrl = 'redis://localhost:6379';
  }

  const client = new Redis(redisUrl, {
    lazyConnect: config.lazyConnect ?? true,
    retryStrategy: config.retryStrategy ?? ((times) => {
      return Math.min(times * 50, 2000);
    }),
  });

  client.on('error', (err) => {
    console.error('Redis Error:', err);
  });

  return client;
}

// Re-export Redis type for convenience
export type { Redis };
