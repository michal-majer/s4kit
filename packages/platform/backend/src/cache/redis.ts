import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

redis.on('error', (err) => {
  console.error('Redis Error:', err);
});

