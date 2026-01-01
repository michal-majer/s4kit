import { Hono } from 'hono';
import { db, systems, systemServices, predefinedServices, instances, instanceServices, apiKeyAccess, authConfigurations } from '../../db';
import { metadataParser } from '../../services/metadata-parser';
import { z } from 'zod';
import { count, desc, eq, and } from 'drizzle-orm';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

/**
 * Verify that a system belongs to the current organization
 */
async function verifySystemOwnership(systemId: string, organizationId: string): Promise<boolean> {
  const system = await db.query.systems.findFirst({
    where: and(eq(systems.id, systemId), eq(systems.organizationId, organizationId)),
  });
  return !!system;
}

/**
 * Verify that an auth config belongs to the organization
 */
async function verifyAuthConfigOwnership(authConfigId: string | null | undefined, organizationId: string): Promise<boolean> {
  if (!authConfigId) return true;
  const config = await db.query.authConfigurations.findFirst({
    where: and(eq(authConfigurations.id, authConfigId), eq(authConfigurations.organizationId, organizationId)),
  });
  return !!config;
}

const serviceSchema = z.object({
  systemId: z.string().uuid(),
  name: z.string().min(1),
  alias: z.string().min(1).max(50),
  servicePath: z.string().min(1),
  description: z.string().optional(),
  entities: z.array(z.string()).optional(),
  predefinedServiceId: z.string().uuid().optional(),
  odataVersion: z.enum(['v2', 'v4']).optional(),
  authConfigId: z.string().uuid().optional().nullable(),
});

// List system services (optionally by systemId)
app.get('/', async (c) => {
  const systemId = c.req.query('systemId');

  const services = await db.query.systemServices.findMany({
    where: systemId ? eq(systemServices.systemId, systemId) : undefined,
    orderBy: [desc(systemServices.createdAt)]
  });

  // Include auth config info if linked
  const result = await Promise.all(services.map(async (service) => {
    let authConfigName: string | null = null;
    let authType: string | null = null;

    if (service.authConfigId) {
      const config = await db.query.authConfigurations.findFirst({
        where: eq(authConfigurations.id, service.authConfigId),
        columns: { name: true, authType: true },
      });
      authConfigName = config?.name ?? null;
      authType = config?.authType ?? null;
    }

    return {
      ...service,
      authConfigName,
      authType,
    };
  }));

  return c.json(result);
});

// Create system service
app.post('/', requirePermission('service:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();
  const result = serviceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Verify system belongs to organization
  if (!await verifySystemOwnership(result.data.systemId, organizationId)) {
    return c.json({ error: 'System not found' }, 404);
  }

  // Verify auth config belongs to organization (if specified)
  if (!await verifyAuthConfigOwnership(result.data.authConfigId, organizationId)) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  const [newService] = await db.insert(systemServices).values({
    systemId: result.data.systemId,
    name: result.data.name,
    alias: result.data.alias,
    servicePath: result.data.servicePath,
    description: result.data.description,
    entities: result.data.entities || [],
    predefinedServiceId: result.data.predefinedServiceId,
    odataVersion: result.data.odataVersion || null,
    authConfigId: result.data.authConfigId ?? null,
  }).returning();

  if (!newService) {
    return c.json({ error: 'Failed to create service' }, 500);
  }

  return c.json(newService, 201);
});

// Get single system service
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const service = await db.query.systemServices.findFirst({
    where: eq(systemServices.id, id)
  });

  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Include auth config info if linked
  let authConfigName: string | null = null;
  let authType: string | null = null;

  if (service.authConfigId) {
    const config = await db.query.authConfigurations.findFirst({
      where: eq(authConfigurations.id, service.authConfigId),
      columns: { name: true, authType: true },
    });
    authConfigName = config?.name ?? null;
    authType = config?.authType ?? null;
  }

  return c.json({
    ...service,
    authConfigName,
    authType,
  });
});

// Update system service
app.patch('/:id', async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');
  const body = await c.req.json();

  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    alias: z.string().min(1).max(50).optional(),
    servicePath: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    entities: z.array(z.string()).optional(),
    odataVersion: z.enum(['v2', 'v4']).optional().nullable(),
    authConfigId: z.string().uuid().optional().nullable(),
  });

  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Verify auth config belongs to organization (if specified)
  if (result.data.authConfigId !== undefined && !await verifyAuthConfigOwnership(result.data.authConfigId, organizationId)) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  const [updated] = await db.update(systemServices)
    .set({
      ...result.data,
      updatedAt: new Date(),
    })
    .where(eq(systemServices.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Service not found' }, 404);
  }

  return c.json(updated);
});

// Delete system service
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Check if service is used by any API keys
  const usageResult = await db.select({ count: count() })
    .from(apiKeyAccess)
    .innerJoin(instanceServices, eq(apiKeyAccess.instanceServiceId, instanceServices.id))
    .where(eq(instanceServices.systemServiceId, id));

  const usageCount = usageResult[0]?.count ?? 0;
  if (usageCount > 0) {
    return c.json({
      error: 'Cannot delete service',
      message: `Service is used by ${usageCount} API key access grant(s). Remove the API key access grants first.`,
      apiKeyCount: usageCount
    }, 409);
  }

  const [deleted] = await db.delete(systemServices)
    .where(eq(systemServices.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Service not found' }, 404);
  }

  return c.json({ success: true });
});

// List predefined services (for system type)
app.get('/predefined/:systemType', async (c) => {
  const systemType = c.req.param('systemType');

  if (!['s4_public', 's4_private', 's4_onprem', 'btp', 'other'].includes(systemType)) {
    return c.json({ error: 'Invalid system type' }, 400);
  }

  const services = await db.query.predefinedServices.findMany({
    where: eq(predefinedServices.systemType, systemType as any),
  });

  return c.json(services);
});

// Helper to get auth for a service/instance combination
async function getAuthForService(
  service: typeof systemServices.$inferSelect,
  instance: typeof instances.$inferSelect
): Promise<any> {
  // Priority 1: Service auth
  if (service.authConfigId) {
    const config = await db.query.authConfigurations.findFirst({
      where: eq(authConfigurations.id, service.authConfigId),
    });
    if (config && config.authType !== 'none') {
      return {
        type: config.authType,
        username: config.username,
        password: config.password,
        config: config.authConfig,
        credentials: config.credentials,
      };
    }
  }

  // Priority 2: Instance auth (fallback)
  if (instance.authConfigId) {
    const config = await db.query.authConfigurations.findFirst({
      where: eq(authConfigurations.id, instance.authConfigId),
    });
    if (config) {
      return {
        type: config.authType,
        username: config.username,
        password: config.password,
        config: config.authConfig,
        credentials: config.credentials,
      };
    }
  }

  return null;
}

// Refresh entities for a system service
app.post('/:id/refresh-entities', async (c) => {
  const id = c.req.param('id');

  // Get the system service
  const service = await db.query.systemServices.findFirst({
    where: eq(systemServices.id, id)
  });

  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Get instances for this system, prefer production > quality > dev
  const systemInstances = await db.query.instances.findMany({
    where: eq(instances.systemId, service.systemId)
  });

  // Sort by priority: production > quality > dev
  const priorityOrder = { production: 0, preprod: 1, quality: 2, dev: 3, sandbox: 4 };
  systemInstances.sort((a, b) => {
    const aPriority = priorityOrder[a.environment as keyof typeof priorityOrder] ?? 999;
    const bPriority = priorityOrder[b.environment as keyof typeof priorityOrder] ?? 999;
    return aPriority - bPriority;
  });

  if (systemInstances.length === 0) {
    return c.json({ error: 'No instances configured for this system' }, 400);
  }

  // Use the first (highest priority) instance
  const instance = systemInstances[0]!;

  try {
    const auth = await getAuthForService(service, instance);

    // Fetch metadata
    const metadataResult = await metadataParser.fetchMetadata({
      baseUrl: instance.baseUrl,
      servicePath: service.servicePath,
      auth,
    });

    if (metadataResult.error) {
      return c.json({
        error: metadataResult.error,
        entities: []
      }, 400);
    }

    // Extract entity names
    const entityNames = metadataResult.entities.map(e => e.name);

    // Update the service with new entities and detected OData version
    const [updated] = await db.update(systemServices)
      .set({
        entities: entityNames,
        odataVersion: metadataResult.odataVersion || service.odataVersion,
        updatedAt: new Date()
      })
      .where(eq(systemServices.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: 'Failed to update service' }, 500);
    }

    return c.json({
      ...updated,
      refreshedCount: entityNames.length
    });
  } catch (error: any) {
    console.error('Failed to refresh entities:', error);
    return c.json({
      error: error.message || 'Failed to refresh entities',
      entities: []
    }, 500);
  }
});

export default app;
