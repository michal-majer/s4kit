import Redis from 'ioredis';

export interface RedisConfig {
  url?: string;
  lazyConnect?: boolean;
  retryStrategy?: (times: number) => number | null;
}

/**
 * Creates a Redis client with standard configuration.
 *
 * @param config Redis configuration
 * @returns Redis client instance
 */
export function createRedisClient(config: RedisConfig = {}): Redis {
  const redisUrl = config.url || process.env.REDIS_URL || 'redis://localhost:6379';

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
