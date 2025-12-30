import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.ts';
import { rateLimitMiddleware } from '../middleware/rate-limit.ts';
import { loggingMiddleware } from '../middleware/logging.ts';
import { accessResolver } from '../services/access-resolver.ts';
import { sapClient } from '../services/sap-client.ts';
import {
  generateRequestId,
  hashClientIp,
  extractEntity,
  methodToOperation,
  categorizeError,
  calculateSize,
  countRecords,
  sanitizeErrorMessage,
} from '../utils/log-helpers.ts';
import type { Variables, Instance, SystemService, InstanceService, SecureLogData } from '../types.ts';

const app = new Hono<{ Variables: Variables }>();

app.use('*', authMiddleware);
app.use('*', rateLimitMiddleware);
app.use('*', loggingMiddleware);

/**
 * Resolve auth configuration with inheritance logic:
 * 1. If instanceService has authType set, use its auth (highest priority)
 * 2. Otherwise, if systemService has authType set, use service auth (service default)
 * 3. Otherwise, inherit from instance (instance default)
 */
function resolveAuth(instance: Instance, systemService: SystemService, instanceService: InstanceService) {
  if (instanceService.authType) {
    return {
      type: instanceService.authType,
      username: instanceService.username,
      password: instanceService.password,
      config: instanceService.authConfig,
      credentials: instanceService.credentials,
    };
  }
  // Check service-level auth
  if (systemService.authType) {
    return {
      type: systemService.authType,
      username: systemService.username,
      password: systemService.password,
      config: systemService.authConfig,
      credentials: systemService.credentials,
    };
  }
  // Inherit from instance
  return {
    type: instance.authType,
    username: instance.username,
    password: instance.password,
    config: instance.authConfig,
    credentials: instance.credentials,
  };
}

/**
 * Get client IP from request headers (handles proxies)
 */
function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  // Check common proxy headers
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0]?.trim();
  }

  const realIp = c.req.header('x-real-ip');
  if (realIp) return realIp;

  return undefined;
}

app.all('/*', async (c) => {
  // Use client-provided X-Request-ID or generate one for correlation
  const clientRequestId = c.req.header('X-Request-ID');
  const requestId = clientRequestId || generateRequestId();

  // Set request ID in response headers for tracing
  c.header('X-Request-ID', requestId);

  // Initialize log data with audit info
  const logData: SecureLogData = {
    requestId,
    clientIpHash: hashClientIp(getClientIp(c)),
    userAgent: c.req.header('user-agent')?.substring(0, 255),
  };

  const instance = c.get('instance');
  const systemService = c.get('systemService');
  const instanceService = c.get('instanceService');
  const entityPermissions = c.get('entityPermissions');

  // Extract entity path (strip /api/proxy prefix)
  const entityPath = c.req.path.replace(/^\/api\/proxy\/?/, '');

  // Extract entity name and operation
  const entity = extractEntity(c.req.path);
  const method = c.req.method || 'GET';
  const operation = methodToOperation(method);

  logData.entity = entity;
  logData.operation = operation;

  // Check entity-level permissions
  if (!accessResolver.checkEntityPermission(entityPermissions, entity || '', operation || 'read')) {
    logData.errorCode = 'FORBIDDEN';
    logData.errorCategory = 'permission';
    logData.errorMessage = `Operation '${operation}' not allowed on entity '${entity}'`;
    c.set('logData', logData);

    return c.json({
      error: `Operation '${operation}' not allowed on entity '${entity}'`
    }, 403);
  }

  // Check if client wants raw OData response (for advanced use cases)
  const wantRaw = c.req.header('X-S4Kit-Raw') === 'true';
  // Check if client wants metadata stripped (cleaner responses)
  const stripMetadata = c.req.header('X-S4Kit-Strip-Metadata') !== 'false'; // Default true

  // Build full SAP URL path: servicePath + entityPath
  const servicePath = instanceService.servicePathOverride || systemService.servicePath;
  const fullPath = `${servicePath}/${entityPath}`.replace(/\/+/g, '/');

  // Resolve auth with inheritance
  const authConfig = resolveAuth(instance, systemService, instanceService);

  // Capture request body size (not content)
  let requestBody: unknown = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    try {
      requestBody = await c.req.json();
      logData.requestSize = calculateSize(requestBody);
    } catch {
      // Body might be empty or invalid
      logData.requestSize = 0;
    }
  }

  try {
    // Get query parameters and ensure all values are strings
    const rawQueryParams = c.req.query();
    const queryParams: Record<string, string> = {};

    // Convert all query params to strings (Hono may return string | string[])
    for (const [key, value] of Object.entries(rawQueryParams)) {
      if (Array.isArray(value)) {
        // If multiple values, join them (unlikely for OData but handle it)
        queryParams[key] = value.join(',');
      } else if (value !== undefined && value !== null) {
        queryParams[key] = String(value);
      }
    }

    console.log('Proxy request:', {
      requestId,
      method: c.req.method,
      path: fullPath,
      entity,
    });

    const result = await sapClient.requestWithAuth({
      baseUrl: instance.baseUrl,
      auth: authConfig,
      method: c.req.method,
      path: fullPath,
      params: queryParams,
      body: requestBody,
      raw: wantRaw,
      stripMetadata: stripMetadata
    });

    // Extract SAP response time from result if available
    let sapResponseTime: number | undefined = undefined;
    let responseData = result;
    if (result && typeof result === 'object' && (result as Record<string, unknown>).__sapResponseTime !== undefined) {
      sapResponseTime = (result as Record<string, unknown>).__sapResponseTime as number;
      // Remove the internal timing field from the response
      const { __sapResponseTime, ...cleanResult } = result as Record<string, unknown>;
      responseData = cleanResult;
    }

    // Capture response metadata (not content)
    logData.sapResponseTime = sapResponseTime;
    logData.responseSize = calculateSize(responseData);
    logData.recordCount = countRecords(responseData);

    // Set log data in context
    c.set('logData', logData);

    return c.json(responseData || result);
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      status?: number;
      odataError?: { code?: string; message?: string; details?: unknown; innererror?: unknown };
      response?: Response & { status: number; statusText: string; headers: Headers };
      code?: string;
    };

    console.error('Proxy error:', {
      requestId,
      message: err.message,
      status: err.status || err.response?.status,
      odataError: err.odataError,
    });

    // Extract error info for structured logging
    const statusCode = (err.status || err.response?.status || 500) as 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504;
    const errorCode = err.odataError?.code || err.code || 'PROXY_ERROR';
    const errorMessage = err.odataError?.message || err.message || 'Internal Proxy Error';

    // Set error log data (no body content)
    logData.errorCode = errorCode;
    logData.errorCategory = categorizeError(statusCode, errorCode, errorMessage);
    logData.errorMessage = sanitizeErrorMessage(errorMessage);
    logData.sapResponseTime = undefined;

    c.set('logData', logData);

    // Return structured OData error if available
    if (err.odataError) {
      return c.json({
        error: {
          code: err.odataError.code,
          message: err.odataError.message,
          details: err.odataError.details,
          innererror: err.odataError.innererror,
        }
      }, statusCode);
    }

    // Pass through SAP errors or generic error
    const message = err.message || 'Internal Proxy Error';

    // Try to extract more error details
    let errorDetails: unknown = err.response?.statusText;
    if (err.response) {
      try {
        const errorText = await err.response.text();
        if (errorText) {
          try {
            errorDetails = JSON.parse(errorText);
          } catch {
            errorDetails = errorText;
          }
        }
      } catch {
        // Ignore errors when trying to read response
      }
    }

    return c.json({
      error: {
        code: 'PROXY_ERROR',
        message,
        details: errorDetails,
        requestId, // Include for support correlation
      }
    }, statusCode);
  }
});

export default app;
