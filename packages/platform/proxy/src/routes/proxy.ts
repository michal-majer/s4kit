import { Hono } from 'hono';
import { db } from '../index.ts';
import { authConfigurations, eq } from '@s4kit/shared/db';
import { authMiddleware } from '../middleware/auth.ts';
import { rateLimitMiddleware } from '../middleware/rate-limit.ts';
import { loggingMiddleware } from '../middleware/logging.ts';
import { accessResolver } from '../services/access-resolver.ts';
import { sapClient, type ResolvedAuthConfig } from '../services/sap-client.ts';
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
import type { Variables, SecureLogData } from '../types.ts';

const app = new Hono<{ Variables: Variables }>();

// Maximum response size in bytes (10MB default)
const MAX_RESPONSE_SIZE = parseInt(process.env.MAX_RESPONSE_SIZE || '10485760', 10);

app.use('*', authMiddleware);
app.use('*', rateLimitMiddleware);
app.use('*', loggingMiddleware);

/**
 * Get auth config from authConfigId
 */
async function getAuthFromConfigId(authConfigId: string): Promise<ResolvedAuthConfig | null> {
  const config = await db.query.authConfigurations.findFirst({
    where: eq(authConfigurations.id, authConfigId)
  });

  if (!config) return null;

  return {
    type: config.authType,
    username: config.username,
    password: config.password,
    config: config.authConfig,
    credentials: config.credentials,
  };
}

/**
 * Resolve auth configuration with inheritance logic:
 * 1. If instanceService has authConfigId set, use its auth (highest priority)
 * 2. Otherwise, if systemService has authConfigId set, use service auth (service default)
 * 3. Otherwise, inherit from instance (instance default)
 */
async function resolveAuth(
  instanceAuthConfigId: string | null,
  systemServiceAuthConfigId: string | null,
  instanceServiceAuthConfigId: string | null
): Promise<ResolvedAuthConfig> {
  // Priority 1: Instance service auth
  if (instanceServiceAuthConfigId) {
    const auth = await getAuthFromConfigId(instanceServiceAuthConfigId);
    if (auth) return auth;
  }

  // Priority 2: System service auth
  if (systemServiceAuthConfigId) {
    const auth = await getAuthFromConfigId(systemServiceAuthConfigId);
    if (auth) return auth;
  }

  // Priority 3: Instance auth (fallback)
  if (instanceAuthConfigId) {
    const auth = await getAuthFromConfigId(instanceAuthConfigId);
    if (auth) return auth;
  }

  // No auth configured
  return { type: 'none' };
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
  const authConfig = await resolveAuth(
    instance.authConfigId,
    systemService.authConfigId,
    instanceService.authConfigId
  );

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

    // Determine OData version from service config (default to v4)
    const odataVersion = systemService.odataVersion || 'v4';

    // Convert all query params to strings (Hono may return string | string[])
    for (const [key, value] of Object.entries(rawQueryParams)) {
      if (Array.isArray(value)) {
        // If multiple values, join them (unlikely for OData but handle it)
        queryParams[key] = value.join(',');
      } else if (value !== undefined && value !== null) {
        queryParams[key] = String(value);
      }
    }

    // Translate OData v4 params to v2 if needed
    if (odataVersion === 'v2') {
      // $count=true → $inlinecount=allpages
      if (queryParams['$count'] === 'true') {
        delete queryParams['$count'];
        queryParams['$inlinecount'] = 'allpages';
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

    // Check response size limit
    if (logData.responseSize && logData.responseSize > MAX_RESPONSE_SIZE) {
      logData.errorCode = 'RESPONSE_TOO_LARGE';
      logData.errorCategory = 'validation';
      logData.errorMessage = `Response size ${logData.responseSize} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`;
      c.set('logData', logData);

      return c.json({
        error: {
          code: 'RESPONSE_TOO_LARGE',
          message: `Response exceeds maximum size limit. Consider using pagination with $top and $skip.`,
          limit: MAX_RESPONSE_SIZE,
          actual: logData.responseSize,
          requestId,
        }
      }, 413);
    }

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
