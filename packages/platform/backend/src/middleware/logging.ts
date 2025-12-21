import { createMiddleware } from 'hono/factory';
import { db } from '../db';
import { requestLogs } from '../db/schema';
import type { Variables } from '../types';

/**
 * Secure logging middleware - captures metadata only, never body content.
 *
 * This middleware logs:
 * - Request/response metadata (method, path, status, timing)
 * - Size metrics (bytes, not content)
 * - Structured error information
 * - Audit trail (request ID, hashed IP)
 *
 * Security: No request or response bodies are ever stored.
 */
export const loggingMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const start = Date.now();

  await next();

  const end = Date.now();
  const latency = end - start;

  const apiKey = c.get('apiKey');
  if (!apiKey) return; // Don't log unauthenticated requests

  // Get secure logging data from context (set by proxy route)
  const logData = c.get('logData');
  if (!logData) return; // No log data available

  // Determine success based on status code
  const success = c.res.status >= 200 && c.res.status < 400;

  // Fire and forget logging - never blocks response
  db.insert(requestLogs).values({
    apiKeyId: apiKey.id,

    // Request metadata
    method: c.req.method,
    path: c.req.path,
    entity: logData.entity || null,
    operation: logData.operation || null,

    // Response metadata
    statusCode: c.res.status,
    success,

    // Performance metrics
    responseTime: latency,
    sapResponseTime: logData.sapResponseTime || null,

    // Size metrics (no body content)
    requestSize: logData.requestSize || null,
    responseSize: logData.responseSize || null,
    recordCount: logData.recordCount || null,

    // Error handling (structured)
    errorCode: logData.errorCode || null,
    errorCategory: logData.errorCategory || null,
    errorMessage: logData.errorMessage
      ? (logData.errorMessage.length > 500 ? logData.errorMessage.substring(0, 500) : logData.errorMessage)
      : null,

    // Audit trail
    requestId: logData.requestId,
    clientIpHash: logData.clientIpHash || null,
    userAgent: logData.userAgent || null,
  }).catch(err => {
    console.error('Failed to write request log:', err);
  });
});
