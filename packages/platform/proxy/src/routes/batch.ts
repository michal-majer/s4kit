/**
 * Batch operations route for SDK clients
 * Executes multiple operations in a single request
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../index.ts';
import { authConfigurations, eq } from '@s4kit/shared/db';
import { apiKeyService } from '../services/api-key.ts';
import { accessResolver } from '../services/access-resolver.ts';
import { sapClient, type ResolvedAuthConfig } from '../services/sap-client.ts';
import type { Variables, SecureLogData } from '../types.ts';
import {
  generateRequestId,
  hashClientIp,
  methodToOperation,
  calculateSize,
} from '../utils/log-helpers.ts';

const app = new Hono<{ Variables: Variables }>();

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

// Helper to get client IP
function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Real-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
  );
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
 * POST /api/proxy/batch
 * Execute multiple operations in a single request
 */
app.post('/', async (c) => {
  const requestId = c.req.header('X-Request-ID') || generateRequestId();
  c.header('X-Request-ID', requestId);

  // Initialize log data
  const logData: SecureLogData = {
    requestId,
    clientIpHash: hashClientIp(getClientIp(c)),
    userAgent: c.req.header('user-agent')?.substring(0, 255),
    entity: '$batch',
    // operation is left undefined for batch (it's a meta-operation)
  };

  // 1. Validate API key
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logData.errorCode = 'UNAUTHORIZED';
    logData.errorCategory = 'auth';
    logData.errorMessage = 'Missing or invalid Authorization header';
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const key = authHeader.split(' ')[1];
  if (!key) {
    logData.errorCode = 'UNAUTHORIZED';
    logData.errorCategory = 'auth';
    logData.errorMessage = 'Missing API key';
    return c.json({ error: 'Missing API key' }, 401);
  }

  const clientIp = getClientIp(c);
  const validationResult = await apiKeyService.validateKey(key, clientIp);

  if (!validationResult.valid || !validationResult.apiKey) {
    logData.errorCode = 'UNAUTHORIZED';
    logData.errorCategory = 'auth';
    logData.errorMessage = validationResult.error || 'Invalid or expired API key';
    return c.json({ error: validationResult.error || 'Invalid or expired API key' }, 401);
  }

  const apiKey = validationResult.apiKey;
  c.set('apiKey', apiKey);

  // 2. Parse and validate request body
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

  // 8. Execute operations
  const results: BatchResult[] = [];
  const stripMetadata = c.req.header('X-S4Kit-Strip-Metadata') !== 'false';

  console.log(`Batch request: ${batchRequest.operations.length} operations, atomic: ${batchRequest.atomic}`);

  // For non-atomic, execute sequentially
  // TODO: For atomic, use OData $batch changeset
  for (const op of batchRequest.operations) {
    try {
      let path: string;
      let method: string = op.method;
      let body: unknown = undefined;

      // Build path based on operation type
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
        baseUrl: accessGrant.instance.baseUrl,
        auth: authConfig,
        method,
        path,
        body,
        stripMetadata,
      });

      // Clean up internal metadata
      let responseData = result;
      if (result && typeof result === 'object' && '__sapResponseTime' in (result as Record<string, unknown>)) {
        const { __sapResponseTime, ...cleanResult } = result as Record<string, unknown>;
        responseData = cleanResult;
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

      // For atomic operations, stop on first error
      if (batchRequest.atomic) {
        // Fill remaining results with aborted status
        const remaining = batchRequest.operations.length - results.length;
        for (let i = 0; i < remaining; i++) {
          results.push({
            success: false,
            status: 0,
            error: {
              code: 'ABORTED',
              message: 'Transaction aborted due to previous error',
            },
          });
        }
        break;
      }
    }
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
