import { createMiddleware } from 'hono/factory';
import { redis } from '../index.ts';
import type { Variables } from '../types.ts';

export const rateLimitMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const apiKey = c.get('apiKey');

  if (!apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const now = Date.now();
  const minuteKey = `ratelimit:minute:${apiKey.id}`;
  const dayKey = `ratelimit:day:${apiKey.id}`;

  const pipeline = redis.pipeline();

  const minuteWindowStart = now - 60000;
  pipeline.zremrangebyscore(minuteKey, 0, minuteWindowStart);
  pipeline.zadd(minuteKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(minuteKey);
  pipeline.expire(minuteKey, 60);

  const dayWindowStart = now - 86400000;
  pipeline.zremrangebyscore(dayKey, 0, dayWindowStart);
  pipeline.zadd(dayKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(dayKey);
  pipeline.expire(dayKey, 86400);

  const results = await pipeline.exec();

  if (!results) {
    console.error('Rate limit redis error');
    return await next();
  }

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
