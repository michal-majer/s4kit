import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/rate-limit';
import { loggingMiddleware } from '../../middleware/logging';
import { accessResolver } from '../../services/access-resolver';
import { sapClient } from '../../services/sap-client';
import { sanitizeHeadersFromHeaders } from '../../utils/header-sanitizer';
import type { Variables, Instance, SystemService, InstanceService } from '../../types';

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

app.all('/*', async (c) => {
  const instance = c.get('instance');
  const systemService = c.get('systemService');
  const instanceService = c.get('instanceService');
  const entityPermissions = c.get('entityPermissions');
  
  // Extract entity path (strip /api/proxy prefix)
  const entityPath = c.req.path.replace(/^\/api\/proxy\/?/, '');
  
  // Extract entity name (first segment)
  // e.g. A_BusinessPartner('123') -> A_BusinessPartner
  const entityMatch = entityPath.match(/^([A-Za-z0-9_]+)/);
  const entity: string = entityMatch?.[1] ?? '';

  // Check entity-level permissions
  const method = c.req.method || 'GET';
  const operation = accessResolver.methodToOperation(method);
  
  if (!accessResolver.checkEntityPermission(entityPermissions, entity, operation)) {
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

  // Capture request data for logging (sanitize sensitive headers)
  const requestHeaders = c.req.raw.headers 
    ? sanitizeHeadersFromHeaders(c.req.raw.headers)
    : {};

  // Capture request body (before it's consumed)
  let requestBody: any = undefined;
  if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
    try {
      requestBody = await c.req.json();
    } catch {
      // Body might be empty or invalid, ignore
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
      method: c.req.method,
      path: fullPath,
      queryParams,
      entityPath,
      rawQueryString: c.req.url.split('?')[1] || ''
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
    let responseBodyForLog = result;
    if (result && typeof result === 'object' && (result as any).__sapResponseTime !== undefined) {
      sapResponseTime = (result as any).__sapResponseTime;
      // Remove the internal timing field from the response
      const { __sapResponseTime, ...cleanResult } = result as any;
      responseBodyForLog = cleanResult;
    }

    // Store logging data in context
    // Note: Response headers will be captured in the logging middleware
    c.set('logData', {
      sapResponseTime,
      // Truncate large bodies to prevent database bloat (10KB limit)
      requestBody: requestBody ? (JSON.stringify(requestBody).length > 10000 ? { truncated: true, size: JSON.stringify(requestBody).length } : requestBody) : undefined,
      responseBody: responseBodyForLog ? (JSON.stringify(responseBodyForLog).length > 10000 ? { truncated: true, size: JSON.stringify(responseBodyForLog).length } : responseBodyForLog) : undefined,
      requestHeaders,
      responseHeaders: {}, // Will be populated in middleware
    });

    return c.json(responseBodyForLog || result);
  } catch (error: any) {
    console.error('Proxy error:', {
      message: error.message,
      status: error.status || error.response?.status,
      odataError: error.odataError,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: Object.fromEntries(error.response.headers.entries())
      } : undefined,
      stack: error.stack
    });
    
    // Extract error message for logging
    let errorMessage: string | undefined = undefined;
    if (error.odataError) {
      errorMessage = error.odataError.message || error.message;
    } else {
      errorMessage = error.message || 'Internal Proxy Error';
      if (error.response?.statusText) {
        errorMessage = `${errorMessage}: ${error.response.statusText}`;
      }
    }
    
    // Store error info in context for logging
    const errorResponseHeaders: Record<string, string> = {};
    if (error.response) {
      error.response.headers.forEach((value: string, key: string) => {
        errorResponseHeaders[key] = value;
      });
    }
    
    c.set('logData', {
      sapResponseTime: undefined, // Could track error timing too if needed
      requestBody: requestBody ? JSON.stringify(requestBody).length > 10000 ? { truncated: true, size: JSON.stringify(requestBody).length } : requestBody : undefined,
      responseBody: undefined, // No response body for errors
      requestHeaders,
      responseHeaders: errorResponseHeaders,
      errorMessage: errorMessage.length > 2000 ? errorMessage.substring(0, 2000) : errorMessage,
    });
    
    // Return structured OData error if available
    if (error.odataError) {
      return c.json({
        error: {
          code: error.odataError.code,
          message: error.odataError.message,
          details: error.odataError.details,
          innererror: error.odataError.innererror,
        }
      }, error.status || 500);
    }
    
    // Pass through SAP errors or generic error
    const status = error.status || error.response?.status || 500;
    const message = error.message || 'Internal Proxy Error';
    
    // Try to extract more error details
    let errorDetails: any = error.response?.statusText;
    if (error.response) {
      try {
        const errorText = await error.response.text();
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
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      } 
    }, status);
  }
});

export default app;
