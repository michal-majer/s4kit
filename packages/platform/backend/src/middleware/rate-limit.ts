import { createMiddleware } from 'hono/factory';
import { redis } from '../cache/redis';
import type { Variables } from '../types';

export const rateLimitMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const apiKey = c.get('apiKey');
  
  if (!apiKey) {
    // Should run after auth middleware
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const now = Date.now();
  const minuteKey = `ratelimit:minute:${apiKey.id}`;
  const dayKey = `ratelimit:day:${apiKey.id}`;

  // Use a pipeline for atomicity and speed
  const pipeline = redis.pipeline();

  // Minute limit (sliding window via sorted set would be more accurate, but fixed window is simpler for MVP)
  // Let's stick to the plan: "Redis sliding window counter" usually implies tracking timestamps or counters.
  // For MVP simplicity and robustness, I will use a simple fixed window with expiration matching the window.
  // Actually, to do sliding window properly with Redis: ZADD timestamp + ZREMRANGEBYSCORE + ZCARD
  
  // Minute Window
  const minuteWindowStart = now - 60000;
  pipeline.zremrangebyscore(minuteKey, 0, minuteWindowStart);
  pipeline.zadd(minuteKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(minuteKey);
  pipeline.expire(minuteKey, 60);

  // Day Window
  const dayWindowStart = now - 86400000;
  pipeline.zremrangebyscore(dayKey, 0, dayWindowStart);
  pipeline.zadd(dayKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(dayKey);
  pipeline.expire(dayKey, 86400);

  const results = await pipeline.exec();

  if (!results) {
     // Redis failure, fail open or closed? Let's fail open for now but log error
     console.error('Rate limit redis error');
     return await next();
  }

  // results[2] is ZCARD for minute, results[6] is ZCARD for day (indexes depend on pipeline commands)
  // 0: zrem (min), 1: zadd (min), 2: zcard (min), 3: expire (min)
  // 4: zrem (day), 5: zadd (day), 6: zcard (day), 7: expire (day)
  
  const minuteCount = (results[2]?.[1] ?? 0) as number;
  const dayCount = (results[6]?.[1] ?? 0) as number;

  if (minuteCount > apiKey.rateLimitPerMinute) {
    return c.json({ error: 'Rate limit exceeded (per minute)', retryAfter: 60 }, 429);
  }

  if (dayCount > apiKey.rateLimitPerDay) {
    return c.json({ error: 'Rate limit exceeded (per day)', retryAfter: 86400 }, 429);
  }

  await next();
});
