import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/rate-limit';
import { loggingMiddleware } from '../../middleware/logging';
import { accessResolver } from '../../services/access-resolver';
import { sapClient } from '../../services/sap-client';
import type { Variables, Connection, ConnectionService } from '../../types';

const app = new Hono<{ Variables: Variables }>();

app.use('*', authMiddleware);
app.use('*', rateLimitMiddleware);
app.use('*', loggingMiddleware);

/**
 * Resolve auth configuration with inheritance logic:
 * - If connectionService has authType set, use its auth
 * - Otherwise, inherit from connection
 */
function resolveAuth(connection: Connection, connectionService: ConnectionService) {
  if (connectionService.authType) {
    return {
      type: connectionService.authType,
      username: connectionService.username,
      password: connectionService.password,
      config: connectionService.authConfig,
      credentials: connectionService.credentials,
    };
  }
  // Inherit from connection
  return {
    type: connection.authType,
    username: connection.username,
    password: connection.password,
    config: connection.authConfig,
    credentials: connection.credentials,
  };
}

app.all('/*', async (c) => {
  const connection = c.get('connection');
  const service = c.get('service');
  const connectionService = c.get('connectionService');
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
  const servicePath = connectionService.servicePathOverride || service.servicePath;
  const fullPath = `${servicePath}/${entityPath}`.replace(/\/+/g, '/');

  // Resolve auth with inheritance
  const authConfig = resolveAuth(connection, connectionService);

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
      baseUrl: connection.baseUrl,
      auth: authConfig,
      method: c.req.method,
      path: fullPath,
      params: queryParams,
      body: ['POST', 'PUT', 'PATCH'].includes(c.req.method) ? await c.req.json().catch(() => undefined) : undefined,
      raw: wantRaw,
      stripMetadata: stripMetadata
    });

    return c.json(result);
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
