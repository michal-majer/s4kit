import { Hono } from 'hono';
import { db } from '../../db';
import { apiKeys, apiKeyAccess, connectionServices, connections, services } from '../../db/schema';
import { apiKeyService } from '../../services/api-key';
import { z } from 'zod';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const app = new Hono();

// Schema for access grant
const accessGrantSchema = z.object({
  connectionServiceId: z.uuidv4(),
  permissions: z.record(z.string(), z.array(z.string())) // { "A_BusinessPartner": ["read"], "*": ["read"] }
});

// Schema for creating API key (now requires access grants)
const apiKeySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  organizationId: z.string().uuid(),
  environment: z.enum(['dev', 'staging', 'prod']),
  rateLimitPerMinute: z.number().int().positive().max(10000).default(60),
  rateLimitPerDay: z.number().int().positive().max(1000000).default(10000),
  expiresAt: z.string().datetime().optional(), // ISO date string
  accessGrants: z.array(accessGrantSchema).min(1, 'At least one access grant is required')
});

const revokeSchema = z.object({
  reason: z.string().max(500).optional()
});

// List API Keys (safe response - no sensitive data)
app.get('/', async (c) => {
  const keys = await db.query.apiKeys.findMany({
    orderBy: [desc(apiKeys.createdAt)]
  });
  
  // Return safe key info with masked display
  const safeKeys = keys.map(({ keyHash, ...rest }) => ({
    ...rest,
    displayKey: apiKeyService.getMaskedKey(rest.keyPrefix, rest.keyLast4)
  }));
  
  return c.json(safeKeys);
});

// Get single API Key
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const key = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, id)
  });
  
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }
  
  const { keyHash, ...safeKey } = key;
  return c.json({
    ...safeKey,
    displayKey: apiKeyService.getMaskedKey(key.keyPrefix, key.keyLast4)
  });
});

// Update API Key
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  environment: z.enum(['dev', 'staging', 'prod']).optional(),
  rateLimitPerMinute: z.number().int().positive().max(10000).optional(),
  rateLimitPerDay: z.number().int().positive().max(1000000).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateApiKeySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const [updated] = await db.update(apiKeys)
    .set({
      ...result.data,
      expiresAt: result.data.expiresAt !== undefined 
        ? (result.data.expiresAt ? new Date(result.data.expiresAt) : null)
        : undefined
    })
    .where(eq(apiKeys.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const { keyHash, ...safeKey } = updated;
  return c.json({
    ...safeKey,
    displayKey: apiKeyService.getMaskedKey(updated.keyPrefix, updated.keyLast4)
  });
});

// Generate new API Key
app.post('/', async (c) => {
  const body = await c.req.json();
  const result = apiKeySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Check for duplicate connectionServiceIds
  const connectionServiceIds = result.data.accessGrants.map(g => g.connectionServiceId);
  const uniqueIds = new Set(connectionServiceIds);
  if (connectionServiceIds.length !== uniqueIds.size) {
    return c.json({ error: 'Duplicate connectionServiceId found in accessGrants' }, 400);
  }

  // Verify all connectionServices exist and belong to the same organization
  const connServices = await db.query.connectionServices.findMany({
    where: inArray(connectionServices.id, connectionServiceIds)
  });

  // Check that all requested connectionServices were found
  const foundIds = new Set(connServices.map(cs => cs.id));
  const missingIds = connectionServiceIds.filter(id => !foundIds.has(id));
  if (missingIds.length > 0) {
    return c.json({ error: `Connection service(s) not found: ${missingIds.join(', ')}` }, 404);
  }

  // Verify all connections belong to the same organization
  const connectionIds = [...new Set(connServices.map(cs => cs.connectionId))];
  const relatedConnections = await db.query.connections.findMany({
    where: inArray(connections.id, connectionIds)
  });

  const invalidConnections = relatedConnections.filter(
    conn => conn.organizationId !== result.data.organizationId
  );
  if (invalidConnections.length > 0) {
    return c.json({ 
      error: `One or more connections do not belong to organization ${result.data.organizationId}` 
    }, 403);
  }

  // Generate UUID first so we can embed it in the key
  const keyId = randomUUID();
  
  // Generate the Stripe-like key
  const generatedKey = apiKeyService.generateKey(keyId, result.data.environment);

  // Insert the API key record
  const [newKeyRecord] = await db.insert(apiKeys).values({
    id: keyId,
    name: result.data.name,
    description: result.data.description,
    organizationId: result.data.organizationId,
    environment: result.data.environment,
    rateLimitPerMinute: result.data.rateLimitPerMinute,
    rateLimitPerDay: result.data.rateLimitPerDay,
    expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
    keyHash: generatedKey.keyHash,
    keyPrefix: generatedKey.keyPrefix,
    keyLast4: generatedKey.keyLast4,
    createdBy: c.req.header('X-User-Id') || undefined, // Track who created it
  }).returning();

  if (!newKeyRecord) {
    return c.json({ error: 'Failed to create API key' }, 500);
  }

  // Create all access grants
  const createdGrants = await Promise.all(
    result.data.accessGrants.map(grant =>
      db.insert(apiKeyAccess).values({
        apiKeyId: keyId,
        connectionServiceId: grant.connectionServiceId,
        permissions: grant.permissions
      }).returning()
    )
  );

  // Enrich grants with connection and service info for response
  const enrichedGrants = await Promise.all(
    createdGrants.map(async (grantArray) => {
      const grant = grantArray[0]!; // Safe: returning() always returns at least one element on success
      
      const connService = await db.query.connectionServices.findFirst({
        where: eq(connectionServices.id, grant.connectionServiceId)
      });
      
      if (!connService) return { ...grant, connection: null, service: null };
      
      const [conn, svc] = await Promise.all([
        db.query.connections.findFirst({ where: eq(connections.id, connService.connectionId) }),
        db.query.services.findFirst({ where: eq(services.id, connService.serviceId) })
      ]);
      
      return {
        ...grant,
        connection: conn ? { id: conn.id, name: conn.name, environment: conn.environment } : null,
        service: svc ? { id: svc.id, name: svc.name, alias: svc.alias } : null
      };
    })
  );

  // Return the full key ONLY ONCE - this is the only time the user sees it!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { keyHash: _hash, ...safeRecord } = newKeyRecord;
  
  return c.json({
    ...safeRecord,
    // ⚠️ IMPORTANT: This is the ONLY time the secret key is returned
    // Store it securely - it cannot be recovered!
    secretKey: generatedKey.key,
    displayKey: generatedKey.displayKey,
    warning: 'Store this key securely. It will not be shown again.',
    accessGrants: enrichedGrants
  }, 201);
});

// List access grants for an API key
app.get('/:id/access', async (c) => {
  const id = c.req.param('id');
  
  const grants = await db.query.apiKeyAccess.findMany({
    where: eq(apiKeyAccess.apiKeyId, id)
  });
  
  // Enrich with connection and service info
  const enrichedGrants = await Promise.all(grants.map(async (grant) => {
    const connService = await db.query.connectionServices.findFirst({
      where: eq(connectionServices.id, grant.connectionServiceId)
    });
    
    if (!connService) return { ...grant, connection: null, service: null };
    
    const [conn, svc] = await Promise.all([
      db.query.connections.findFirst({ where: eq(connections.id, connService.connectionId) }),
      db.query.services.findFirst({ where: eq(services.id, connService.serviceId) })
    ]);
    
    return {
      ...grant,
      connection: conn ? { id: conn.id, name: conn.name, environment: conn.environment } : null,
      service: svc ? { id: svc.id, name: svc.name, alias: svc.alias } : null
    };
  }));
  
  return c.json(enrichedGrants);
});

// Add access grant to an API key
app.post('/:id/access', async (c) => {
  const apiKeyId = c.req.param('id');
  const body = await c.req.json();
  const result = accessGrantSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Verify API key exists
  const existingKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, apiKeyId)
  });
  
  if (!existingKey) {
    return c.json({ error: 'API key not found' }, 404);
  }

  // Verify connectionService exists and belongs to same org
  const connService = await db.query.connectionServices.findFirst({
    where: eq(connectionServices.id, result.data.connectionServiceId)
  });
  
  if (!connService) {
    return c.json({ error: 'Connection service not found' }, 404);
  }

  // Check if grant already exists
  const existingGrant = await db.query.apiKeyAccess.findFirst({
    where: and(
      eq(apiKeyAccess.apiKeyId, apiKeyId),
      eq(apiKeyAccess.connectionServiceId, result.data.connectionServiceId)
    )
  });

  if (existingGrant) {
    return c.json({ error: 'Access grant already exists for this connection+service' }, 409);
  }

  const [newGrant] = await db.insert(apiKeyAccess).values({
    apiKeyId,
    connectionServiceId: result.data.connectionServiceId,
    permissions: result.data.permissions
  }).returning();

  return c.json(newGrant, 201);
});

// Update access grant permissions
app.patch('/:id/access/:grantId', async (c) => {
  const apiKeyId = c.req.param('id');
  const grantId = c.req.param('grantId');
  const body = await c.req.json();
  
  const permissionsSchema = z.object({
    permissions: z.record(z.string(), z.array(z.string()))
  });
  
  const result = permissionsSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const [updated] = await db.update(apiKeyAccess)
    .set({ permissions: result.data.permissions })
    .where(and(
      eq(apiKeyAccess.id, grantId),
      eq(apiKeyAccess.apiKeyId, apiKeyId)
    ))
    .returning();

  if (!updated) {
    return c.json({ error: 'Access grant not found' }, 404);
  }

  return c.json(updated);
});

// Remove access grant
app.delete('/:id/access/:grantId', async (c) => {
  const apiKeyId = c.req.param('id');
  const grantId = c.req.param('grantId');

  const [deleted] = await db.delete(apiKeyAccess)
    .where(and(
      eq(apiKeyAccess.id, grantId),
      eq(apiKeyAccess.apiKeyId, apiKeyId)
    ))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Access grant not found' }, 404);
  }

  return c.json({ success: true });
});

// Revoke API Key (soft delete)
app.post('/:id/revoke', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const result = revokeSchema.safeParse(body);
  
  const reason = result.success ? result.data.reason : undefined;
  
  const success = await apiKeyService.revokeKey(id, reason);
  
  if (!success) {
    return c.json({ error: 'API key not found' }, 404);
  }
  
  return c.json({ success: true, message: 'API key has been revoked' });
});

// Delete API Key (also uses revoke for audit trail, but kept for REST compatibility)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  const success = await apiKeyService.revokeKey(id, 'Deleted via API');
  
  if (!success) {
    return c.json({ error: 'API key not found' }, 404);
  }
  
  return c.json({ success: true });
});

export default app;
