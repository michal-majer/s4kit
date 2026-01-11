import { createMiddleware } from 'hono/factory';
import { redis } from '../index.ts';
import type { Variables } from '../types.ts';

// Organization-level rate limits (can be customized via env vars)
const ORG_RATE_LIMIT_PER_MINUTE = parseInt(process.env.ORG_RATE_LIMIT_PER_MINUTE || '600', 10);
const ORG_RATE_LIMIT_PER_DAY = parseInt(process.env.ORG_RATE_LIMIT_PER_DAY || '100000', 10);

export const rateLimitMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const apiKey = c.get('apiKey');

  if (!apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const now = Date.now();

  // API Key level rate limiting
  const minuteKey = `ratelimit:minute:${apiKey.id}`;
  const dayKey = `ratelimit:day:${apiKey.id}`;

  // Organization level rate limiting (aggregate across all keys)
  const orgMinuteKey = `ratelimit:org:minute:${apiKey.organizationId}`;
  const orgDayKey = `ratelimit:org:day:${apiKey.organizationId}`;

  const pipeline = redis.pipeline();

  // API Key rate limiting
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

  // Organization rate limiting
  pipeline.zremrangebyscore(orgMinuteKey, 0, minuteWindowStart);
  pipeline.zadd(orgMinuteKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(orgMinuteKey);
  pipeline.expire(orgMinuteKey, 60);

  pipeline.zremrangebyscore(orgDayKey, 0, dayWindowStart);
  pipeline.zadd(orgDayKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(orgDayKey);
  pipeline.expire(orgDayKey, 86400);

  const results = await pipeline.exec();

  if (!results) {
    console.error('Rate limit redis error');
    return await next();
  }

  // API Key limits (indices 2 and 6)
  const minuteCount = (results[2]?.[1] ?? 0) as number;
  const dayCount = (results[6]?.[1] ?? 0) as number;

  // Organization limits (indices 10 and 14)
  const orgMinuteCount = (results[10]?.[1] ?? 0) as number;
  const orgDayCount = (results[14]?.[1] ?? 0) as number;

  // Check API Key limits first
  if (minuteCount > apiKey.rateLimitPerMinute) {
    return c.json({ error: 'Rate limit exceeded (per minute)', retryAfter: 60 }, 429);
  }

  if (dayCount > apiKey.rateLimitPerDay) {
    return c.json({ error: 'Rate limit exceeded (per day)', retryAfter: 86400 }, 429);
  }

  // Check Organization limits
  if (orgMinuteCount > ORG_RATE_LIMIT_PER_MINUTE) {
    return c.json({ error: 'Organization rate limit exceeded (per minute)', retryAfter: 60 }, 429);
  }

  if (orgDayCount > ORG_RATE_LIMIT_PER_DAY) {
    return c.json({ error: 'Organization rate limit exceeded (per day)', retryAfter: 86400 }, 429);
  }

  await next();
});
