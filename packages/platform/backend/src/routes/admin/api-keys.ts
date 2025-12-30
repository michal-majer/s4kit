import { Hono } from 'hono';
import { db, apiKeys, apiKeyAccess, instanceServices, instances, systemServices, systems } from '../../db';
import { apiKeyService } from '../../services/api-key';
import { metadataParser, type ODataEntityType } from '../../services/metadata-parser';
import { generateTypeScriptFile, filterEntityTypes } from '../../services/type-generator';
import { redis } from '../../cache/redis';
import { z } from 'zod';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { Instance, SystemService, InstanceService } from '../../types';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

/**
 * Invalidate the API key cache in Redis (used by proxy service)
 */
async function invalidateApiKeyCache(keyPrefix: string): Promise<void> {
  const cacheKey = `apikey:${keyPrefix}`;
  await redis.del(cacheKey);
}

const app = new Hono<{ Variables: SessionVariables }>();

/**
 * Validates that services in an API key don't have duplicate aliases across different systems
 * Aliases can be the same within the same system, but not across systems
 */
async function validateNoDuplicateServiceAliases(instanceServices: (InstanceService & { systemService?: SystemService })[]) {
  const aliasesBySystem = new Map<string, { alias: string; systemServiceId: string; instanceServiceId: string }[]>();

  for (const instService of instanceServices) {
    if (!instService.systemService) continue;

    const systemId = instService.systemService.systemId;
    if (!aliasesBySystem.has(systemId)) {
      aliasesBySystem.set(systemId, []);
    }

    aliasesBySystem.get(systemId)!.push({
      alias: instService.systemService.alias,
      systemServiceId: instService.systemServiceId,
      instanceServiceId: instService.id
    });
  }

  // Find duplicate aliases across different systems
  const aliasMap = new Map<string, Array<{ systemId: string; systemServiceId: string; instanceServiceId: string }>>();

  for (const [systemId, services] of aliasesBySystem) {
    for (const service of services) {
      const key = service.alias;
      if (!aliasMap.has(key)) {
        aliasMap.set(key, []);
      }
      aliasMap.get(key)!.push({
        systemId,
        systemServiceId: service.systemServiceId,
        instanceServiceId: service.instanceServiceId
      });
    }
  }

  // Check for duplicates across different systems
  const duplicates = [];
  for (const [alias, occurrences] of aliasMap) {
    const uniqueSystems = new Set(occurrences.map(o => o.systemId));
    if (uniqueSystems.size > 1) {
      duplicates.push({
        alias,
        systems: Array.from(uniqueSystems),
        occurrences: occurrences.map(o => ({ systemId: o.systemId, instanceServiceId: o.instanceServiceId }))
      });
    }
  }

  return duplicates.length > 0 ? duplicates : null;
}

// Schema for access grant
const accessGrantSchema = z.object({
  instanceServiceId: z.string().uuid(),
  permissions: z.record(z.string(), z.array(z.string())) // { "A_BusinessPartner": ["read"], "*": ["read"] }
});

// Schema for creating API key (now requires access grants)
// Note: organizationId comes from session context, not request body
const apiKeySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  rateLimitPerMinute: z.number().int().positive().max(10000).default(60),
  rateLimitPerDay: z.number().int().positive().max(1000000).default(10000),
  expiresAt: z.string().datetime().optional(), // ISO date string
  accessGrants: z.array(accessGrantSchema).min(1, 'At least one access grant is required')
});

const revokeSchema = z.object({
  reason: z.string().max(500).optional()
});

// List API Keys (safe response - no sensitive data)
app.get('/', requirePermission('apiKey:read'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, organizationId),
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
app.get('/:id', requirePermission('apiKey:read'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
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
  rateLimitPerMinute: z.number().int().positive().max(10000).optional(),
  rateLimitPerDay: z.number().int().positive().max(1000000).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

app.patch('/:id', requirePermission('apiKey:update'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  // Check if key exists and is not revoked
  const existingKey = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
  });

  if (!existingKey) {
    return c.json({ error: 'API key not found' }, 404);
  }

  if (existingKey.revoked) {
    return c.json({ error: 'Cannot edit a revoked API key' }, 400);
  }

  const body = await c.req.json();
  const result = updateApiKeySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Build update data, only including fields that were provided
  const updateData: Record<string, unknown> = {};

  if (result.data.name !== undefined) {
    updateData.name = result.data.name;
  }
  if (result.data.description !== undefined) {
    updateData.description = result.data.description;
  }
  if (result.data.rateLimitPerMinute !== undefined) {
    updateData.rateLimitPerMinute = result.data.rateLimitPerMinute;
  }
  if (result.data.rateLimitPerDay !== undefined) {
    updateData.rateLimitPerDay = result.data.rateLimitPerDay;
  }
  if (result.data.expiresAt !== undefined) {
    updateData.expiresAt = result.data.expiresAt ? new Date(result.data.expiresAt) : null;
  }

  // If no fields to update, just return the current key
  if (Object.keys(updateData).length === 0) {
    const existing = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
    });

    if (!existing) {
      return c.json({ error: 'API key not found' }, 404);
    }

    const { keyHash, ...safeKey } = existing;
    return c.json({
      ...safeKey,
      displayKey: apiKeyService.getMaskedKey(existing.keyPrefix, existing.keyLast4)
    });
  }

  const [updated] = await db.update(apiKeys)
    .set(updateData)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ error: 'API key not found' }, 404);
  }

  // Invalidate the proxy cache so new rate limits take effect immediately
  await invalidateApiKeyCache(updated.keyPrefix);

  const { keyHash, ...safeKey } = updated;
  return c.json({
    ...safeKey,
    displayKey: apiKeyService.getMaskedKey(updated.keyPrefix, updated.keyLast4)
  });
});

// Generate new API Key
app.post('/', requirePermission('apiKey:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('user')!.id;
  const body = await c.req.json();
  const result = apiKeySchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Check for duplicate instanceServiceIds
  const instanceServiceIds = result.data.accessGrants.map(g => g.instanceServiceId);
  const uniqueIds = new Set(instanceServiceIds);
  if (instanceServiceIds.length !== uniqueIds.size) {
    return c.json({ error: 'Duplicate instanceServiceId found in accessGrants' }, 400);
  }

  // Verify all instanceServices exist
  const instServices = await db.query.instanceServices.findMany({
    where: inArray(instanceServices.id, instanceServiceIds)
  });

  // Check that all requested instanceServices were found
  const foundIds = new Set(instServices.map(is => is.id));
  const missingIds = instanceServiceIds.filter(id => !foundIds.has(id));
  if (missingIds.length > 0) {
    return c.json({ error: `Instance service(s) not found: ${missingIds.join(', ')}` }, 404);
  }

  // Fetch systemServices for each instanceService to validate aliases
  const systemServiceIds = [...new Set(instServices.map(is => is.systemServiceId))];
  const systemServicesMap = new Map<string, SystemService>();

  if (systemServiceIds.length > 0) {
    const fetchedSystemServices = await db.query.systemServices.findMany({
      where: inArray(systemServices.id, systemServiceIds)
    });

    for (const svc of fetchedSystemServices) {
      systemServicesMap.set(svc.id, svc);
    }
  }

  // Check for duplicate service aliases across different systems
  const instServicesWithSystemData = instServices.map(is => ({
    ...is,
    systemService: systemServicesMap.get(is.systemServiceId)
  }));

  const aliasConflicts = await validateNoDuplicateServiceAliases(instServicesWithSystemData);
  if (aliasConflicts) {
    return c.json({
      error: 'Service alias conflicts detected across different systems',
      details: 'Cannot add multiple services with the same alias from different systems',
      conflicts: aliasConflicts.map(conflict => ({
        alias: conflict.alias,
        systemCount: conflict.systems.length,
        systems: conflict.systems
      }))
    }, 400);
  }

  // Verify all instances belong to systems in the same organization
  const instanceIds = [...new Set(instServices.map(is => is.instanceId))];
  const relatedInstances = await db.query.instances.findMany({
    where: inArray(instances.id, instanceIds)
  });

  const systemIds = [...new Set(relatedInstances.map(i => i.systemId))];
  const relatedSystems = await db.query.systems.findMany({
    where: inArray(systems.id, systemIds)
  });

  const invalidSystems = relatedSystems.filter(
    sys => sys.organizationId !== organizationId
  );
  if (invalidSystems.length > 0) {
    return c.json({
      error: 'One or more systems do not belong to your organization'
    }, 403);
  }

  // Generate UUID first so we can embed it in the key
  const keyId = randomUUID();

  // Generate the Stripe-like key (using 'live' as default since environment is now at instance level)
  const generatedKey = apiKeyService.generateKey(keyId, 'live');

  // Insert the API key record
  const [newKeyRecord] = await db.insert(apiKeys).values({
    id: keyId,
    name: result.data.name,
    description: result.data.description,
    organizationId,
    rateLimitPerMinute: result.data.rateLimitPerMinute,
    rateLimitPerDay: result.data.rateLimitPerDay,
    expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
    keyHash: generatedKey.keyHash,
    keyPrefix: generatedKey.keyPrefix,
    keyLast4: generatedKey.keyLast4,
    createdBy: userId,
  }).returning();

  if (!newKeyRecord) {
    return c.json({ error: 'Failed to create API key' }, 500);
  }

  // Create all access grants
  const createdGrants = await Promise.all(
    result.data.accessGrants.map(grant =>
      db.insert(apiKeyAccess).values({
        apiKeyId: keyId,
        instanceServiceId: grant.instanceServiceId,
        permissions: grant.permissions
      }).returning()
    )
  );

  // Enrich grants with instance and service info for response
  const enrichedGrants = await Promise.all(
    createdGrants.map(async (grantArray) => {
      const grant = grantArray[0]!;
      
      const instService = await db.query.instanceServices.findFirst({
        where: eq(instanceServices.id, grant.instanceServiceId)
      });
      
      if (!instService) return { ...grant, instance: null, systemService: null };
      
      const [inst, svc] = await Promise.all([
        db.query.instances.findFirst({ where: eq(instances.id, instService.instanceId) }),
        db.query.systemServices.findFirst({ where: eq(systemServices.id, instService.systemServiceId) })
      ]);
      
      return {
        ...grant,
        instance: inst ? { id: inst.id, environment: inst.environment } : null,
        systemService: svc ? { id: svc.id, name: svc.name, alias: svc.alias, entities: svc.entities } : null
      };
    })
  );

  const { keyHash: _hash, ...safeRecord } = newKeyRecord;
  
  return c.json({
    ...safeRecord,
    secretKey: generatedKey.key,
    displayKey: generatedKey.displayKey,
    warning: 'Store this key securely. It will not be shown again.',
    accessGrants: enrichedGrants
  }, 201);
});

// List access grants for an API key
app.get('/:id/access', requirePermission('apiKey:read'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  // Verify API key belongs to organization
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
  });
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const grants = await db.query.apiKeyAccess.findMany({
    where: eq(apiKeyAccess.apiKeyId, id)
  });
  
  // Enrich with instance, service, and system info
  const enrichedGrants = await Promise.all(grants.map(async (grant) => {
    const instService = await db.query.instanceServices.findFirst({
      where: eq(instanceServices.id, grant.instanceServiceId)
    });

    if (!instService) return { ...grant, instance: null, systemService: null, system: null };

    const [inst, svc] = await Promise.all([
      db.query.instances.findFirst({ where: eq(instances.id, instService.instanceId) }),
      db.query.systemServices.findFirst({ where: eq(systemServices.id, instService.systemServiceId) })
    ]);

    // Get system info
    let system = null;
    if (inst) {
      const sys = await db.query.systems.findFirst({ where: eq(systems.id, inst.systemId) });
      if (sys) {
        system = { id: sys.id, name: sys.name };
      }
    }

    return {
      ...grant,
      instance: inst ? { id: inst.id, environment: inst.environment } : null,
      systemService: svc ? { id: svc.id, name: svc.name, alias: svc.alias, entities: svc.entities } : null,
      system
    };
  }));
  
  return c.json(enrichedGrants);
});

// Add access grant to an API key
app.post('/:id/access', requirePermission('apiKey:update'), async (c) => {
  const apiKeyId = c.req.param('id');
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();
  const result = accessGrantSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Verify API key exists and belongs to organization
  const existingKey = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId))
  });

  if (!existingKey) {
    return c.json({ error: 'API key not found' }, 404);
  }

  // Verify instanceService exists
  const instService = await db.query.instanceServices.findFirst({
    where: eq(instanceServices.id, result.data.instanceServiceId)
  });

  if (!instService) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  // Check if grant already exists
  const existingGrant = await db.query.apiKeyAccess.findFirst({
    where: and(
      eq(apiKeyAccess.apiKeyId, apiKeyId),
      eq(apiKeyAccess.instanceServiceId, result.data.instanceServiceId)
    )
  });

  if (existingGrant) {
    return c.json({ error: 'Access grant already exists for this instance+service' }, 409);
  }

  // Check for duplicate aliases with existing grants
  const existingGrants = await db.query.apiKeyAccess.findMany({
    where: eq(apiKeyAccess.apiKeyId, apiKeyId)
  });

  if (existingGrants.length > 0) {
    // Fetch all existing instanceServices
    const existingInstServiceIds = existingGrants.map(g => g.instanceServiceId);
    const existingInstServices = await db.query.instanceServices.findMany({
      where: inArray(instanceServices.id, existingInstServiceIds)
    });

    // Fetch systemServices for all
    const allSystemServiceIds = [
      instService.systemServiceId,
      ...existingInstServices.map(is => is.systemServiceId)
    ];
    const allSystemServices = await db.query.systemServices.findMany({
      where: inArray(systemServices.id, allSystemServiceIds)
    });

    const systemServicesMap = new Map(allSystemServices.map(s => [s.id, s]));

    // Check for conflicts
    const allInstServices = [
      { ...instService, systemService: systemServicesMap.get(instService.systemServiceId) },
      ...existingInstServices.map(is => ({
        ...is,
        systemService: systemServicesMap.get(is.systemServiceId)
      }))
    ];

    const aliasConflicts = await validateNoDuplicateServiceAliases(allInstServices);
    if (aliasConflicts) {
      return c.json({
        error: 'Service alias conflicts detected across different systems',
        details: 'Cannot add this service because its alias conflicts with an already-granted service from a different system',
        conflicts: aliasConflicts.map(conflict => ({
          alias: conflict.alias,
          systemCount: conflict.systems.length,
          systems: conflict.systems
        }))
      }, 400);
    }
  }

  const [newGrant] = await db.insert(apiKeyAccess).values({
    apiKeyId,
    instanceServiceId: result.data.instanceServiceId,
    permissions: result.data.permissions
  }).returning();

  return c.json(newGrant, 201);
});

// Update access grant permissions
app.patch('/:id/access/:grantId', requirePermission('apiKey:update'), async (c) => {
  const apiKeyId = c.req.param('id');
  const grantId = c.req.param('grantId');
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();

  // Verify API key belongs to organization
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId))
  });
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }

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
app.delete('/:id/access/:grantId', requirePermission('apiKey:update'), async (c) => {
  const apiKeyId = c.req.param('id');
  const grantId = c.req.param('grantId');
  const organizationId = c.get('organizationId')!;

  // Verify API key belongs to organization
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, apiKeyId), eq(apiKeys.organizationId, organizationId))
  });
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }

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
app.post('/:id/revoke', requirePermission('apiKey:delete'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json().catch(() => ({}));
  const result = revokeSchema.safeParse(body);

  // Verify API key belongs to organization
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
  });
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const reason = result.success ? result.data.reason : undefined;
  const success = await apiKeyService.revokeKey(id, reason);

  if (!success) {
    return c.json({ error: 'Failed to revoke API key' }, 500);
  }

  // Invalidate the proxy cache so revocation takes effect immediately
  await invalidateApiKeyCache(key.keyPrefix);

  return c.json({ success: true, message: 'API key has been revoked' });
});

// Rotate API Key (create new key with same settings, revoke old)
const rotateSchema = z.object({
  revokeReason: z.string().max(500).optional(),
  newName: z.string().min(1).max(255).optional(),
});

app.post('/:id/rotate', requirePermission('apiKey:update'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json().catch(() => ({}));
  const result = rotateSchema.safeParse(body);

  // Verify API key belongs to organization
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
  });
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const options = result.success ? result.data : {};

  try {
    const rotationResult = await apiKeyService.rotateKey(id, options);

    // Invalidate the old key's cache so revocation takes effect immediately
    await invalidateApiKeyCache(key.keyPrefix);

    // Fetch access grants for the new key
    const newGrants = await db.query.apiKeyAccess.findMany({
      where: eq(apiKeyAccess.apiKeyId, rotationResult.newKey.id)
    });

    return c.json({
      newKey: {
        id: rotationResult.newKey.id,
        name: rotationResult.newKey.name,
        description: rotationResult.newKey.description,
        secretKey: rotationResult.newKey.key,
        displayKey: rotationResult.newKey.displayKey,
        rateLimitPerMinute: rotationResult.newKey.rateLimitPerMinute,
        rateLimitPerDay: rotationResult.newKey.rateLimitPerDay,
        expiresAt: rotationResult.newKey.expiresAt,
        createdAt: rotationResult.newKey.createdAt,
        accessGrantsCount: newGrants.length,
      },
      revokedKey: {
        id: rotationResult.revokedKeyId,
        displayKey: rotationResult.revokedKeyDisplayKey,
      },
      warning: 'Store the new key securely. It will not be shown again.'
    }, 201);
  } catch (error: any) {
    if (error.message === 'API key not found') {
      return c.json({ error: 'API key not found' }, 404);
    }
    if (error.message === 'Cannot rotate a revoked key') {
      return c.json({ error: 'Cannot rotate a revoked key' }, 400);
    }
    console.error('Failed to rotate API key:', error);
    return c.json({ error: 'Failed to rotate API key' }, 500);
  }
});

// Delete API Key (also uses revoke for audit trail, but kept for REST compatibility)
app.delete('/:id', requirePermission('apiKey:delete'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  // Verify API key belongs to organization
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
  });
  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }

  const success = await apiKeyService.revokeKey(id, 'Deleted via API');

  if (!success) {
    return c.json({ error: 'Failed to delete API key' }, 500);
  }

  // Invalidate the proxy cache
  await invalidateApiKeyCache(key.keyPrefix);

  return c.json({ success: true });
});

/**
 * Resolve auth configuration with inheritance logic (same as proxy route)
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

// Generate TypeScript types for API key
app.get('/:id/types', requirePermission('apiKey:read'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  // Get API key
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organizationId))
  });

  if (!key) {
    return c.json({ error: 'API key not found' }, 404);
  }
  
  // Get all access grants for this API key
  const grants = await db.query.apiKeyAccess.findMany({
    where: eq(apiKeyAccess.apiKeyId, id)
  });
  
  if (grants.length === 0) {
    return c.json({ error: 'No access grants found for this API key' }, 404);
  }
  
  // Collect all entity types from all grants
  const allEntityTypes: ODataEntityType[] = [];
  const errors: string[] = [];
  
  // Process each access grant
  for (const grant of grants) {
    try {
      // Resolve instanceService
      const instService = await db.query.instanceServices.findFirst({
        where: eq(instanceServices.id, grant.instanceServiceId)
      });
      
      if (!instService) {
        errors.push(`Instance service ${grant.instanceServiceId} not found`);
        continue;
      }
      
      // Resolve instance and systemService
      const [inst, svc] = await Promise.all([
        db.query.instances.findFirst({ where: eq(instances.id, instService.instanceId) }),
        db.query.systemServices.findFirst({ where: eq(systemServices.id, instService.systemServiceId) })
      ]);
      
      if (!inst || !svc) {
        errors.push(`Instance or system service not found for grant ${grant.id}`);
        continue;
      }
      
      // Resolve auth configuration
      const authConfig = resolveAuth(inst, svc, instService);
      
      // Determine service path (instance override or system service default)
      const servicePath = instService.servicePathOverride || svc.servicePath;
      
      // Fetch full metadata
      const metadataResult = await metadataParser.fetchFullMetadata({
        baseUrl: inst.baseUrl,
        servicePath,
        auth: authConfig,
      });
      
      if (metadataResult.error) {
        errors.push(`Failed to fetch metadata for service ${svc.alias}: ${metadataResult.error}`);
        continue;
      }
      
      // Get allowed entities from permissions
      const allowedEntities = Object.keys(grant.permissions);
      
      // Filter entity types based on permissions
      const filteredTypes = filterEntityTypes(
        metadataResult.entityTypes,
        allowedEntities,
        grant.permissions
      );
      
      // Add to collection (avoid duplicates by fullName)
      for (const entityType of filteredTypes) {
        if (!allEntityTypes.find(et => et.fullName === entityType.fullName)) {
          allEntityTypes.push(entityType);
        }
      }
    } catch (error: any) {
      errors.push(`Error processing grant ${grant.id}: ${error.message}`);
      console.error(`Error processing grant ${grant.id}:`, error);
    }
  }
  
  // Generate TypeScript file
  const typeScriptContent = generateTypeScriptFile(allEntityTypes, {
    apiKeyId: key.id,
    apiKeyName: key.name,
    generatedAt: new Date(),
  });
  
  // If there were errors but we still have some types, include them in a comment
  let finalContent = typeScriptContent;
  if (errors.length > 0) {
    const errorComment = `\n\n/*\n * Warnings during generation:\n${errors.map(e => ` * - ${e}`).join('\n')}\n */\n`;
    finalContent = typeScriptContent + errorComment;
  }
  
  // Return as .d.ts file
  const filename = `s4kit-types-${key.id}.d.ts`;
  
  return c.text(finalContent, 200, {
    'Content-Type': 'application/typescript',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
});

export default app;
