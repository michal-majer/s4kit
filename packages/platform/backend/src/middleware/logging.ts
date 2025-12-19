import { createMiddleware } from 'hono/factory';
import { db } from '../db';
import { requestLogs } from '../db/schema';
import { sanitizeHeaders } from '../utils/header-sanitizer';
import type { Variables } from '../types';

export const loggingMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const start = Date.now();
  
  await next();
  
  const end = Date.now();
  const latency = end - start;
  
  const apiKey = c.get('apiKey');
  if (!apiKey) return; // Don't log unauthenticated requests (or log them differently)

  // Get additional logging data from context (set by proxy route)
  const logData = c.get('logData');
  
  // Capture response headers (sanitize sensitive headers)
  const responseHeaders: Record<string, string> = {};
  if (c.res.headers) {
    const rawHeaders: Record<string, string> = {};
    c.res.headers.forEach((value, key) => {
      rawHeaders[key] = value;
    });
    Object.assign(responseHeaders, sanitizeHeaders(rawHeaders));
  }

  // Prepare log values
  const requestBody = logData?.requestBody || null;
  const responseBody = logData?.responseBody || null;
  const errorMessage = logData?.errorMessage ? (logData.errorMessage.length > 2000 ? logData.errorMessage.substring(0, 2000) : logData.errorMessage) : null;

  // Fire and forget logging
  db.insert(requestLogs).values({
    apiKeyId: apiKey.id,
    method: c.req.method,
    path: c.req.path,
    statusCode: c.res.status,
    responseTime: latency,
    sapResponseTime: logData?.sapResponseTime || null,
    requestBody: requestBody,
    responseBody: responseBody,
    requestHeaders: logData?.requestHeaders && Object.keys(logData.requestHeaders).length > 0 ? logData.requestHeaders : null,
    responseHeaders: Object.keys(responseHeaders).length > 0 ? responseHeaders : null,
    errorMessage: errorMessage,
  }).catch(err => {
    console.error('Failed to write request log:', err);
  });
});


