import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,           // Fail faster on errors
  retryStrategy: (times) => {
    if (times > 3) return null;      // Stop retrying after 3 attempts
    return Math.min(times * 100, 1000);
  },
  reconnectOnError: (err) => {
    // Only reconnect on connection-related errors
    return err.message.includes('READONLY') || err.message.includes('ECONNRESET');
  },
});

redis.on('error', (err) => {
  // Only log once per error type to avoid spam
  console.error('[Redis] Error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

