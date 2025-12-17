import { createMiddleware } from 'hono/factory';
import { db } from '../db';
import { requestLogs } from '../db/schema';
import type { Variables } from '../types';

export const loggingMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const start = Date.now();
  
  await next();
  
  const end = Date.now();
  const latency = end - start;
  
  const apiKey = c.get('apiKey');
  if (!apiKey) return; // Don't log unauthenticated requests (or log them differently)

  // Fire and forget logging
  db.insert(requestLogs).values({
    apiKeyId: apiKey.id,
    method: c.req.method,
    path: c.req.path,
    statusCode: c.res.status,
    responseTime: latency
  }).catch(err => {
    console.error('Failed to write request log:', err);
  });
});
