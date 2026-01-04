/**
 * Batch operations route for SDK clients
 * Executes multiple operations in a single request
 *
 * For atomic operations (transactions), uses OData $batch with changeset:
 * - All operations wrapped in a single changeset boundary
 * - SAP processes as a single database transaction
 * - If any fails, SAP rolls back ALL changes automatically
 *
 * For non-atomic operations:
 * - Operations executed sequentially
 * - Each operation independent (no rollback on failure)
 */

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import ky from 'ky';
import { db } from '../index.ts';
import { authConfigurations, eq } from '@s4kit/shared/db';
import { apiKeyService } from '../services/api-key.ts';
import { accessResolver } from '../services/access-resolver.ts';
import { sapClient, type ResolvedAuthConfig } from '../services/sap-client.ts';
import { rateLimitMiddleware } from '../middleware/rate-limit.ts';
import { loggingMiddleware } from '../middleware/logging.ts';
import { encryption } from '@s4kit/shared/services';
import {
  buildBatchRequest,
  parseBatchResponse,
  buildBatchPath,
  type ODataBatchOperation,
} from '@s4kit/shared/services';
import type { Variables, SecureLogData } from '../types.ts';
import {
  generateRequestId,
  hashClientIp,
  methodToOperation,
  calculateSize,
} from '../utils/log-helpers.ts';
import { redis } from '../index.ts';

const app = new Hono<{ Variables: Variables }>();

// Helper to get client IP
function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Real-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
  );
}

// Lightweight auth middleware for batch - just validates API key
// Service/instance resolution is done in the route handler since batch can have multiple entities
const batchAuthMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const key = authHeader.split(' ')[1];
  if (!key) {
    return c.json({ error: 'Missing API key' }, 401);
  }

  const clientIp = getClientIp(c);
  const validationResult = await apiKeyService.validateKey(key, clientIp);

  if (!validationResult.valid || !validationResult.apiKey) {
    return c.json({ error: validationResult.error || 'Invalid or expired API key' }, 401);
  }

  c.set('apiKey', validationResult.apiKey);
  await next();
});

// Apply middleware in order: auth first (sets apiKey), then rate limit, then logging
app.use('*', batchAuthMiddleware);
app.use('*', rateLimitMiddleware);
app.use('*', loggingMiddleware);

// Schema for batch operations (Zod 4 compatible)
const dataSchema = z.record(z.string(), z.any());
const compositeKeySchema = z.record(z.string(), z.union([z.string(), z.number()]));
const idSchema = z.union([z.string(), z.number(), compositeKeySchema]);

const BatchOperationSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('POST'),
    entity: z.string().min(1),
    data: dataSchema,
  }),
  z.object({
    method: z.literal('PATCH'),
    entity: z.string().min(1),
    id: idSchema,
    data: dataSchema,
  }),
  z.object({
    method: z.literal('PUT'),
    entity: z.string().min(1),
    id: idSchema,
    data: dataSchema,
  }),
  z.object({
    method: z.literal('DELETE'),
    entity: z.string().min(1),
    id: idSchema,
  }),
]);

const BatchRequestSchema = z.object({
  atomic: z.boolean().optional().default(false),
  operations: z.array(BatchOperationSchema).min(1).max(100),
});

type BatchOperation = z.infer<typeof BatchOperationSchema>;
type BatchRequest = z.infer<typeof BatchRequestSchema>;

interface BatchResult {
  success: boolean;
  status: number;
  data?: unknown;
  error?: { code: string; message: string };
}

// Helper to format entity key for URL
function formatKey(key: unknown): string {
  if (typeof key === 'number') return String(key);
  if (typeof key === 'string') return `'${key}'`;
  if (typeof key === 'object' && key !== null) {
    return Object.entries(key as Record<string, unknown>)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`)
      .join(',');
  }
  return String(key);
}

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
 * Resolve auth configuration with inheritance
 */
async function resolveAuth(
  instanceAuthConfigId: string | null,
  systemServiceAuthConfigId: string | null,
  instanceServiceAuthConfigId: string | null
): Promise<ResolvedAuthConfig> {
  if (instanceServiceAuthConfigId) {
    const auth = await getAuthFromConfigId(instanceServiceAuthConfigId);
    if (auth) return auth;
  }
  if (systemServiceAuthConfigId) {
    const auth = await getAuthFromConfigId(systemServiceAuthConfigId);
    if (auth) return auth;
  }
  if (instanceAuthConfigId) {
    const auth = await getAuthFromConfigId(instanceAuthConfigId);
    if (auth) return auth;
  }
  return { type: 'none' };
}

/**
 * Build auth headers for a request
 */
async function buildAuthHeaders(
  auth: ResolvedAuthConfig,
  baseUrl: string
): Promise<{ headers: Record<string, string>; csrfToken?: string }> {
  const headers: Record<string, string> = {};

  if (auth.type === 'none') {
    return { headers };
  }

  if (auth.type === 'basic') {
    const username = auth.username ? encryption.decrypt(auth.username) : '';
    const password = auth.password ? encryption.decrypt(auth.password) : '';
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;

    // Get CSRF token for basic auth
    const csrfCacheKey = `csrf:${baseUrl}:${username}`;
    let csrfToken = await redis.get(csrfCacheKey);

    if (!csrfToken) {
      try {
        const response = await ky.head(baseUrl, {
          headers: {
            'Authorization': headers['Authorization'],
            'X-CSRF-Token': 'Fetch',
          },
        });
        csrfToken = response.headers.get('x-csrf-token') || '';
        if (csrfToken) {
          await redis.set(csrfCacheKey, csrfToken, 'EX', 3600);
        }
      } catch (e) {
        console.warn('Failed to fetch CSRF token for batch:', e);
      }
    }

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    return { headers, csrfToken: csrfToken || undefined };
  }

  if (auth.type === 'api_key') {
    const credentials = auth.credentials as any;
    const authConfig = auth.config as any;
    if (credentials?.apiKey) {
      const apiKey = encryption.decrypt(credentials.apiKey);
      const headerName = authConfig?.headerName || 'X-API-Key';
      headers[headerName] = apiKey;
    }
    return { headers };
  }

  if (auth.type === 'custom') {
    const authConfig = auth.config as any;
    const credentials = auth.credentials as any;
    if (authConfig?.headerName && credentials?.headerValue) {
      headers[authConfig.headerName] = encryption.decrypt(credentials.headerValue);
    }
    return { headers };
  }

  // OAuth2 would require more complex token handling
  // For now, basic auth covers most SAP scenarios

  return { headers };
}

/**
 * Execute batch atomically using OData $batch with changeset
 * SAP handles the transaction - if any operation fails, all are rolled back
 */
async function executeAtomicBatch(
  operations: Array<{ method: string; entity: string; id?: unknown; data?: unknown }>,
  servicePath: string,
  baseUrl: string,
  auth: ResolvedAuthConfig
): Promise<BatchResult[]> {
  // Build OData batch operations
  // IMPORTANT: Paths inside $batch are RELATIVE to the service root
  // The $batch endpoint is at {serviceUrl}/$batch, so operations use just entity names
  const odataOps: ODataBatchOperation[] = operations.map((op, index) => {
    let path: string;

    // Use relative paths (just entity name) - NOT full service path
    if (op.method === 'POST') {
      path = op.entity;
    } else if (op.method === 'DELETE') {
      path = `${op.entity}(${formatKey(op.id)})`;
    } else {
      // PATCH or PUT
      path = `${op.entity}(${formatKey(op.id)})`;
    }

    return {
      method: op.method as ODataBatchOperation['method'],
      path,
      body: op.data,
      contentId: String(index + 1),
    };
  });

  // Build the multipart/mixed batch request
  const { body, contentType } = buildBatchRequest(odataOps, true);

  // Build auth headers
  const { headers: authHeaders } = await buildAuthHeaders(auth, baseUrl);

  // Build the $batch endpoint URL: {baseUrl}/{servicePath}/$batch
  const cleanServicePath = servicePath.replace(/^\/+|\/+$/g, '');
  const batchUrl = `${baseUrl.replace(/\/+$/, '')}/${cleanServicePath}/$batch`;

  console.log(`Atomic batch: sending ${operations.length} operations to ${batchUrl}`);
  console.log(`Batch request body:\n${body.substring(0, 500)}...`);

  try {
    // Send the batch request to SAP
    const response = await ky.post(batchUrl, {
      body,
      headers: {
        ...authHeaders,
        'Content-Type': contentType,
        'Accept': 'multipart/mixed',
      },
      retry: 0,
    });

    const responseContentType = response.headers.get('content-type') || '';
    const responseBody = await response.text();

    console.log(`Batch response status: ${response.status}`);
    console.log(`Batch response content-type: ${responseContentType}`);
    console.log(`Batch response body:\n${responseBody.substring(0, 500)}...`);

    // Parse the multipart response
    const parsed = parseBatchResponse(responseBody, responseContentType);

    console.log(`Parsed ${parsed.responses.length} responses, hasErrors: ${parsed.hasErrors}`);

    // Map responses to our result format
    const results: BatchResult[] = parsed.responses.map((resp, index) => {
      const isSuccess = resp.status >= 200 && resp.status < 300;

      if (isSuccess) {
        // Extract entity data from response body
        let data: unknown = undefined;
        if (resp.body && typeof resp.body === 'object') {
          // OData v4: might be wrapped in { value: [...] } or { d: {...} }
          const bodyObj = resp.body as Record<string, unknown>;
          if ('d' in bodyObj) {
            data = bodyObj.d;
          } else if ('value' in bodyObj && Array.isArray(bodyObj.value)) {
            data = bodyObj.value[0]; // Single entity from collection
          } else {
            data = bodyObj;
          }
        }

        return {
          success: true,
          status: resp.status,
          data,
        };
      } else {
        // Error response
        let errorCode = 'BATCH_OPERATION_ERROR';
        let errorMessage = resp.statusText || 'Operation failed';

        if (resp.body && typeof resp.body === 'object') {
          const bodyObj = resp.body as Record<string, unknown>;
          if (bodyObj.error && typeof bodyObj.error === 'object') {
            const error = bodyObj.error as Record<string, unknown>;
            errorCode = (error.code as string) || errorCode;
            errorMessage = (error.message as string) || errorMessage;
          }
        }

        return {
          success: false,
          status: resp.status,
          error: { code: errorCode, message: errorMessage },
        };
      }
    });

    // If changeset failed, all operations should be marked as failed
    // SAP returns a single error response for the entire changeset
    if (parsed.hasErrors && results.length < operations.length) {
      // The changeset was rejected - all operations failed
      const errorResult = results.find(r => !r.success);
      const errorInfo = errorResult?.error || { code: 'CHANGESET_FAILED', message: 'Transaction failed' };

      return operations.map(() => ({
        success: false,
        status: errorResult?.status || 500,
        error: errorInfo,
      }));
    }

    return results;
  } catch (error: unknown) {
    console.error('Batch request failed:', error);

    // If the batch request itself failed, all operations fail
    const err = error as { message?: string; response?: { status: number } };
    const status = err.response?.status || 500;
    const message = err.message || 'Batch request failed';

    return operations.map(() => ({
      success: false,
      status,
      error: { code: 'BATCH_REQUEST_FAILED', message },
    }));
  }
}

/**
 * Execute operations sequentially (non-atomic)
 * Each operation is independent - failures don't affect other operations
 */
async function executeSequentialBatch(
  operations: Array<{ method: string; entity: string; id?: unknown; data?: unknown }>,
  servicePath: string,
  baseUrl: string,
  auth: ResolvedAuthConfig,
  stripMetadata: boolean
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (const op of operations) {
    try {
      let path: string;
      const method: string = op.method;
      let body: unknown = undefined;

      if (op.method === 'POST') {
        path = `${servicePath}/${op.entity}`.replace(/\/+/g, '/');
        body = op.data;
      } else if (op.method === 'DELETE') {
        path = `${servicePath}/${op.entity}(${formatKey(op.id)})`.replace(/\/+/g, '/');
      } else {
        // PATCH or PUT
        path = `${servicePath}/${op.entity}(${formatKey(op.id)})`.replace(/\/+/g, '/');
        body = op.data;
      }

      const result = await sapClient.requestWithAuth({
        baseUrl,
        auth,
        method,
        path,
        body,
        stripMetadata,
      });

      // Extract actual entity data from OData response wrapper
      let responseData: unknown = undefined;
      if (result && typeof result === 'object') {
        const resultObj = result as Record<string, unknown>;

        if ('data' in resultObj && resultObj.data !== undefined) {
          responseData = resultObj.data;
        } else if ('success' in resultObj && Object.keys(resultObj).filter(k => k !== '__sapResponseTime' && k !== 'success').length === 0) {
          responseData = undefined;
        } else {
          const { __sapResponseTime, success, count, ...cleanResult } = resultObj;
          if (Object.keys(cleanResult).length > 0) {
            responseData = cleanResult;
          }
        }
      }

      results.push({
        success: true,
        status: op.method === 'POST' ? 201 : op.method === 'DELETE' ? 204 : 200,
        data: responseData,
      });
    } catch (error: unknown) {
      const err = error as {
        message?: string;
        status?: number;
        odataError?: { code?: string; message?: string };
        response?: { status: number };
      };

      results.push({
        success: false,
        status: err.status || err.response?.status || 500,
        error: {
          code: err.odataError?.code || 'BATCH_OPERATION_ERROR',
          message: err.odataError?.message || err.message || 'Operation failed',
        },
      });
    }
  }

  return results;
}

/**
 * POST /api/proxy/batch
 * Execute multiple operations in a single request
 */
app.post('/', async (c) => {
  const requestId = c.req.header('X-Request-ID') || generateRequestId();
  c.header('X-Request-ID', requestId);

  // Get API key from middleware (already validated)
  const apiKey = c.get('apiKey')!;

  // Initialize log data
  const logData: SecureLogData = {
    requestId,
    clientIpHash: hashClientIp(getClientIp(c)),
    userAgent: c.req.header('user-agent')?.substring(0, 255),
    entity: '$batch',
    // operation is left undefined for batch (it's a meta-operation)
  };

  // 1. Parse and validate request body
  let batchRequest: BatchRequest;
  try {
    const body = await c.req.json();
    batchRequest = BatchRequestSchema.parse(body);
    logData.requestSize = calculateSize(body);
  } catch (err) {
    logData.errorCode = 'VALIDATION_ERROR';
    logData.errorCategory = 'validation';
    logData.errorMessage = 'Invalid batch request format';
    return c.json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid batch request format',
        details: err instanceof z.ZodError ? err.issues : undefined,
      }
    }, 400);
  }

  // 3. Get service from header (required for batch)
  const serviceAlias = c.req.header('X-S4Kit-Service');
  if (!serviceAlias) {
    // Try to resolve from first operation's entity
    const firstEntity = batchRequest.operations[0]?.entity;
    if (!firstEntity) {
      logData.errorCode = 'VALIDATION_ERROR';
      logData.errorCategory = 'validation';
      logData.errorMessage = 'X-S4Kit-Service header required for batch';
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'X-S4Kit-Service header is required for batch operations, or specify entity in first operation',
        }
      }, 400);
    }

    // Try to find service by entity
    const service = await accessResolver.findServiceByEntityForApiKey(apiKey.id, apiKey.organizationId, firstEntity);
    if (!service) {
      logData.errorCode = 'NOT_FOUND';
      logData.errorCategory = 'validation';
      logData.errorMessage = `Unknown entity '${firstEntity}'`;
      return c.json({
        error: {
          code: 'NOT_FOUND',
          message: `Unknown entity '${firstEntity}' - not registered in any service you have access to`,
        }
      }, 404);
    }

    // Use the resolved service
    c.req.raw.headers.set('X-S4Kit-Service', service.alias);
  }

  const resolvedServiceAlias = c.req.header('X-S4Kit-Service') || serviceAlias!;
  const instanceEnvironment = c.req.header('X-S4Kit-Instance');

  // 4. Resolve access grant
  const accessGrant = await accessResolver.resolveAccessGrantByService(
    apiKey.id,
    apiKey.organizationId,
    resolvedServiceAlias,
    instanceEnvironment
  );

  if (!accessGrant) {
    logData.errorCode = 'FORBIDDEN';
    logData.errorCategory = 'permission';
    logData.errorMessage = `No access to service '${resolvedServiceAlias}'`;
    return c.json({
      error: {
        code: 'FORBIDDEN',
        message: `No access to service '${resolvedServiceAlias}'`,
      }
    }, 403);
  }

  // Set context for rate limiting
  c.set('instance', accessGrant.instance);
  c.set('systemService', accessGrant.systemService);
  c.set('instanceService', accessGrant.instanceService);
  c.set('entityPermissions', accessGrant.permissions);

  // 5. Check permissions for ALL operations before executing any
  const permissionErrors: string[] = [];
  for (let i = 0; i < batchRequest.operations.length; i++) {
    const op = batchRequest.operations[i]!;
    const operation = methodToOperation(op.method) || 'read'; // Fallback to 'read' if undefined

    if (!accessResolver.checkEntityPermission(accessGrant.permissions, op.entity, operation)) {
      permissionErrors.push(`Operation ${i + 1}: '${operation}' not allowed on entity '${op.entity}'`);
    }
  }

  if (permissionErrors.length > 0) {
    logData.errorCode = 'FORBIDDEN';
    logData.errorCategory = 'permission';
    logData.errorMessage = permissionErrors.join('; ');
    return c.json({
      error: {
        code: 'FORBIDDEN',
        message: 'One or more operations not permitted',
        details: permissionErrors,
      }
    }, 403);
  }

  // 6. Resolve auth configuration
  const authConfig = await resolveAuth(
    accessGrant.instance.authConfigId,
    accessGrant.systemService.authConfigId,
    accessGrant.instanceService.authConfigId
  );

  // 7. Build service path
  const servicePath = accessGrant.instanceService.servicePathOverride || accessGrant.systemService.servicePath;
  const stripMetadata = c.req.header('X-S4Kit-Strip-Metadata') !== 'false';

  console.log(`Batch request: ${batchRequest.operations.length} operations, atomic: ${batchRequest.atomic}`);

  // 8. Execute operations
  let results: BatchResult[];

  if (batchRequest.atomic) {
    // ATOMIC: Use OData $batch with changeset
    // SAP processes all operations in a single transaction
    // If ANY operation fails, SAP rolls back ALL changes
    console.log('Executing atomic batch via OData $batch changeset...');

    results = await executeAtomicBatch(
      batchRequest.operations,
      servicePath,
      accessGrant.instance.baseUrl,
      authConfig
    );
  } else {
    // NON-ATOMIC: Execute sequentially
    // Each operation is independent - failures don't affect others
    console.log('Executing non-atomic batch sequentially...');

    results = await executeSequentialBatch(
      batchRequest.operations,
      servicePath,
      accessGrant.instance.baseUrl,
      authConfig,
      stripMetadata
    );
  }

  // 9. Update log data
  logData.responseSize = calculateSize(results);
  logData.recordCount = batchRequest.operations.length;
  c.set('logData', logData);

  const successCount = results.filter(r => r.success).length;
  console.log(`Batch complete: ${successCount}/${results.length} succeeded`);

  return c.json(results);
});

export default app;
