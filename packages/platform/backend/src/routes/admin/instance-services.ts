import { Hono } from 'hono';
import { db, systems, instanceServices, systemServices, instances, apiKeyAccess, authConfigurations } from '../../db';
import { metadataParser } from '@s4kit/shared/services';
import { sapClient, type ResolvedAuthConfig } from '../../services/sap-client';
import { z } from 'zod';
import { and, count, eq } from 'drizzle-orm';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

/**
 * Verify that an instance service belongs to the current organization
 * Chain: instanceService -> instance -> system -> organization
 */
async function verifyInstanceServiceOwnership(instanceServiceId: string, organizationId: string): Promise<boolean> {
  const instService = await db.query.instanceServices.findFirst({
    where: eq(instanceServices.id, instanceServiceId),
  });

  if (!instService) return false;

  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, instService.instanceId),
  });

  if (!instance) return false;

  const system = await db.query.systems.findFirst({
    where: and(eq(systems.id, instance.systemId), eq(systems.organizationId, organizationId)),
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

/**
 * Get auth configuration from authConfigId
 */
async function getAuthFromConfigId(authConfigId: string | null): Promise<ResolvedAuthConfig | null> {
  if (!authConfigId) return null;

  const config = await db.query.authConfigurations.findFirst({
    where: eq(authConfigurations.id, authConfigId),
  });

  if (!config || config.authType === 'none') return null;

  return {
    type: config.authType,
    username: config.username,
    password: config.password,
    config: config.authConfig,
    credentials: config.credentials,
  };
}

/**
 * Get auth with inheritance: instanceService > systemService > instance
 */
async function getAuthWithInheritance(
  instService: typeof instanceServices.$inferSelect,
  systemService: typeof systemServices.$inferSelect,
  instance: typeof instances.$inferSelect
): Promise<ResolvedAuthConfig | null> {
  // Priority 1: Instance service auth
  if (instService.authConfigId) {
    const auth = await getAuthFromConfigId(instService.authConfigId);
    if (auth) return auth;
  }

  // Priority 2: System service auth
  if (systemService.authConfigId) {
    const auth = await getAuthFromConfigId(systemService.authConfigId);
    if (auth) return auth;
  }

  // Priority 3: Instance auth (fallback)
  if (instance.authConfigId) {
    return getAuthFromConfigId(instance.authConfigId);
  }

  return null;
}

// Helper function to refresh entities for an instance service (can be called async)
async function refreshInstanceServiceEntities(instanceServiceId: string): Promise<void> {
  const instanceService = await db.query.instanceServices.findFirst({
    where: eq(instanceServices.id, instanceServiceId)
  });

  if (!instanceService) return;

  const [instance, systemService] = await Promise.all([
    db.query.instances.findFirst({
      where: eq(instances.id, instanceService.instanceId)
    }),
    db.query.systemServices.findFirst({
      where: eq(systemServices.id, instanceService.systemServiceId)
    })
  ]);

  if (!instance || !systemService) return;

  try {
    const auth = await getAuthWithInheritance(instanceService, systemService, instance);
    const servicePath = instanceService.servicePathOverride || systemService.servicePath;

    const metadataResult = await metadataParser.fetchMetadata({
      baseUrl: instance.baseUrl,
      servicePath,
      auth,
    });

    if (metadataResult.error) {
      await db.update(instanceServices)
        .set({
          verificationStatus: 'failed',
          lastVerifiedAt: new Date(),
          verificationError: metadataResult.error,
        })
        .where(eq(instanceServices.id, instanceServiceId));
      return;
    }

    const entityNames = metadataResult.entities.map(e => e.name);

    await db.update(instanceServices)
      .set({
        entities: entityNames,
        verificationStatus: 'verified',
        lastVerifiedAt: new Date(),
        verificationError: null,
      })
      .where(eq(instanceServices.id, instanceServiceId));

    // Update parent systemService odataVersion if detected and not already set
    if (metadataResult.odataVersion && !systemService.odataVersion) {
      await db.update(systemServices)
        .set({ odataVersion: metadataResult.odataVersion, updatedAt: new Date() })
        .where(eq(systemServices.id, systemService.id));
    }
  } catch (error: any) {
    await db.update(instanceServices)
      .set({
        verificationStatus: 'failed',
        lastVerifiedAt: new Date(),
        verificationError: error.message || 'Failed to refresh entities',
      })
      .where(eq(instanceServices.id, instanceServiceId));
  }
}

const instanceServiceSchema = z.object({
  instanceId: z.string().uuid(),
  systemServiceId: z.string().uuid(),
  servicePathOverride: z.string().optional(),
  entities: z.array(z.string()).optional().nullable(),
  authConfigId: z.string().uuid().optional().nullable(),
});

// List instance services (optionally by instanceId or systemServiceId)
app.get('/', async (c) => {
  const instanceId = c.req.query('instanceId');
  const systemServiceId = c.req.query('systemServiceId');

  // Build where clause based on provided filters
  const whereConditions = [];
  if (instanceId) {
    whereConditions.push(eq(instanceServices.instanceId, instanceId));
  }
  if (systemServiceId) {
    whereConditions.push(eq(instanceServices.systemServiceId, systemServiceId));
  }

  const services = await db.query.instanceServices.findMany({
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
  });

  // Fetch related data
  const enrichedServices = await Promise.all(services.map(async (is) => {
    const systemService = await db.query.systemServices.findFirst({
      where: eq(systemServices.id, is.systemServiceId)
    });
    const instance = await db.query.instances.findFirst({
      where: eq(instances.id, is.instanceId)
    });

    // Resolve entities: use instanceService.entities if set, otherwise inherit from systemService
    const resolvedEntities = is.entities !== null ? is.entities : (systemService?.entities || []);

    // Get auth config info if linked
    let authConfigName: string | null = null;
    let authType: string | null = null;

    if (is.authConfigId) {
      const config = await db.query.authConfigurations.findFirst({
        where: eq(authConfigurations.id, is.authConfigId),
        columns: { name: true, authType: true },
      });
      authConfigName = config?.name ?? null;
      authType = config?.authType ?? null;
    }

    return {
      ...is,
      entities: resolvedEntities,
      entityCount: resolvedEntities.length,
      hasAuthOverride: !!is.authConfigId,
      hasEntityOverride: is.entities !== null,
      authConfigName,
      authType,
      systemService: systemService ? {
        id: systemService.id,
        name: systemService.name,
        alias: systemService.alias,
        entities: systemService.entities,
        odataVersion: systemService.odataVersion,
      } : null,
      instance: instance ? {
        id: instance.id,
        environment: instance.environment,
      } : null,
    };
  }));

  // Sort by service name (case-insensitive)
  enrichedServices.sort((a, b) => {
    const nameA = a.systemService?.name?.toLowerCase() || '';
    const nameB = b.systemService?.name?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });

  return c.json(enrichedServices);
});

// Create instance service
app.post('/', async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();
  const result = instanceServiceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Verify auth config belongs to organization (if specified)
  if (!(await verifyAuthConfigOwnership(result.data.authConfigId, organizationId))) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  const [newService] = await db.insert(instanceServices).values({
    instanceId: result.data.instanceId,
    systemServiceId: result.data.systemServiceId,
    servicePathOverride: result.data.servicePathOverride,
    entities: result.data.entities ?? null,
    authConfigId: result.data.authConfigId ?? null,
    verificationStatus: 'pending',
  }).returning();

  if (!newService) {
    return c.json({ error: 'Failed to create instance service' }, 500);
  }

  // Trigger async verification (non-blocking)
  refreshInstanceServiceEntities(newService.id).catch((err) => {
    console.error('Auto-verification failed for instance service:', newService.id, err);
  });

  return c.json(newService, 201);
});

// Get single instance service
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const service = await db.query.instanceServices.findFirst({
    where: eq(instanceServices.id, id)
  });

  if (!service) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  const systemService = await db.query.systemServices.findFirst({
    where: eq(systemServices.id, service.systemServiceId)
  });
  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, service.instanceId)
  });

  // Resolve entities: use instanceService.entities if set, otherwise inherit from systemService
  const resolvedEntities = service.entities !== null ? service.entities : (systemService?.entities || []);

  // Get auth config info if linked
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
    entities: resolvedEntities,
    entityCount: resolvedEntities.length,
    hasAuthOverride: !!service.authConfigId,
    hasEntityOverride: service.entities !== null,
    authConfigName,
    authType,
    systemService: systemService ? {
      id: systemService.id,
      name: systemService.name,
      alias: systemService.alias,
      entities: systemService.entities,
      odataVersion: systemService.odataVersion,
    } : null,
    instance: instance ? {
      id: instance.id,
      environment: instance.environment,
    } : null,
  });
});

// Update instance service
app.patch('/:id', requirePermission('service:update'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  // Verify ownership through chain: instanceService -> instance -> system -> organization
  if (!await verifyInstanceServiceOwnership(id, organizationId)) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  const body = await c.req.json();

  const updateSchema = z.object({
    servicePathOverride: z.string().optional().nullable(),
    entities: z.array(z.string()).optional().nullable(),
    authConfigId: z.string().uuid().optional().nullable(),
  });

  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Verify auth config belongs to organization (if specified)
  if (result.data.authConfigId !== undefined && !(await verifyAuthConfigOwnership(result.data.authConfigId, organizationId))) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  const [updated] = await db.update(instanceServices)
    .set(result.data)
    .where(eq(instanceServices.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  return c.json(updated);
});

// Delete instance service
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Check if instance service is used by any API keys
  const usageResult = await db.select({ count: count() })
    .from(apiKeyAccess)
    .where(eq(apiKeyAccess.instanceServiceId, id));

  const usageCount = usageResult[0]?.count ?? 0;
  if (usageCount > 0) {
    return c.json({
      error: 'Cannot delete instance service',
      message: `Instance service is used by ${usageCount} API key access grant(s). Remove the API key access grants first.`,
      apiKeyCount: usageCount
    }, 409);
  }

  const [deleted] = await db.delete(instanceServices)
    .where(eq(instanceServices.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  return c.json({ success: true });
});

// Refresh entities for an instance service
app.post('/:id/refresh-entities', async (c) => {
  const id = c.req.param('id');

  // Get the instance service
  const instanceService = await db.query.instanceServices.findFirst({
    where: eq(instanceServices.id, id)
  });

  if (!instanceService) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  // Get the associated instance and system service
  const [instance, systemService] = await Promise.all([
    db.query.instances.findFirst({
      where: eq(instances.id, instanceService.instanceId)
    }),
    db.query.systemServices.findFirst({
      where: eq(systemServices.id, instanceService.systemServiceId)
    })
  ]);

  if (!instance) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  if (!systemService) {
    return c.json({ error: 'System service not found' }, 404);
  }

  try {
    const auth = await getAuthWithInheritance(instanceService, systemService, instance);
    const servicePath = instanceService.servicePathOverride || systemService.servicePath;

    // Fetch metadata from the specific instance
    const metadataResult = await metadataParser.fetchMetadata({
      baseUrl: instance.baseUrl,
      servicePath,
      auth,
    });

    if (metadataResult.error) {
      // Update verification status to failed
      await db.update(instanceServices)
        .set({
          verificationStatus: 'failed',
          lastVerifiedAt: new Date(),
          verificationError: metadataResult.error,
        })
        .where(eq(instanceServices.id, id));

      return c.json({
        error: metadataResult.error,
        entities: [],
        verificationStatus: 'failed',
      }, 400);
    }

    // Extract entity names
    const entityNames = metadataResult.entities.map(e => e.name);

    // Update the instance service with new entities and verification status
    const [updated] = await db.update(instanceServices)
      .set({
        entities: entityNames,
        verificationStatus: 'verified',
        lastVerifiedAt: new Date(),
        verificationError: null,
      })
      .where(eq(instanceServices.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: 'Failed to update instance service' }, 500);
    }

    // Update parent systemService odataVersion if detected and not already set
    if (metadataResult.odataVersion && !systemService.odataVersion) {
      await db.update(systemServices)
        .set({ odataVersion: metadataResult.odataVersion, updatedAt: new Date() })
        .where(eq(systemServices.id, systemService.id));
    }

    // Resolve entities for response
    const resolvedEntities = updated.entities !== null ? updated.entities : (systemService.entities || []);

    return c.json({
      ...updated,
      entities: resolvedEntities,
      entityCount: resolvedEntities.length,
      refreshedCount: entityNames.length,
      odataVersion: metadataResult.odataVersion || systemService.odataVersion,
    });
  } catch (error: any) {
    console.error('Failed to refresh entities:', error);

    // Update verification status to failed
    await db.update(instanceServices)
      .set({
        verificationStatus: 'failed',
        lastVerifiedAt: new Date(),
        verificationError: error.message || 'Failed to refresh entities',
      })
      .where(eq(instanceServices.id, id));

    return c.json({
      error: error.message || 'Failed to refresh entities',
      entities: [],
      verificationStatus: 'failed',
    }, 500);
  }
});

// Test API endpoint - make a test request to SAP using the service's auth
const testSchema = z.object({
  entity: z.string().optional(),
  customPath: z.string().optional(),
  $top: z.number().optional(),
  $skip: z.number().optional(),
  $filter: z.string().optional(),
  $select: z.string().optional(),
  $expand: z.string().optional(),
  $orderby: z.string().optional(),
}).refine(data => data.entity || data.customPath, {
  message: 'Either entity or customPath is required'
});

app.post('/:id/test', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  // Validate request body
  const result = testSchema.safeParse(body);
  if (!result.success) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: result.error.issues[0]?.message || 'Invalid request'
      }
    }, 400);
  }

  const { entity, customPath, ...odataParams } = result.data;

  // Fetch instance service with related data
  const instanceService = await db.query.instanceServices.findFirst({
    where: eq(instanceServices.id, id)
  });

  if (!instanceService) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Instance service not found' }
    }, 404);
  }

  const [instance, systemService] = await Promise.all([
    db.query.instances.findFirst({
      where: eq(instances.id, instanceService.instanceId)
    }),
    db.query.systemServices.findFirst({
      where: eq(systemServices.id, instanceService.systemServiceId)
    })
  ]);

  if (!instance || !systemService) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Instance or system service not found' }
    }, 404);
  }

  // Resolve auth with inheritance
  const auth = await getAuthWithInheritance(instanceService, systemService, instance);

  // Build path
  const servicePath = instanceService.servicePathOverride || systemService.servicePath;
  const entityPath = customPath || entity;
  const fullPath = `${servicePath}/${entityPath}`.replace(/\/+/g, '/');

  // Build query params
  const queryParams: Record<string, string> = {};
  const odataParamNames = ['$top', '$skip', '$filter', '$select', '$expand', '$orderby'] as const;
  for (const param of odataParamNames) {
    const value = odataParams[param];
    if (value !== undefined) {
      queryParams[param] = String(value);
    }
  }

  // Make request
  const startTime = Date.now();
  try {
    const response = await sapClient.requestWithAuth({
      baseUrl: instance.baseUrl,
      auth,
      method: 'GET',
      path: fullPath,
      params: queryParams,
      raw: false,
      stripMetadata: true,
    });

    const responseTime = Date.now() - startTime;
    const sapResponseTime = response?.__sapResponseTime;

    // Clean response - remove internal timing field
    const { __sapResponseTime, ...cleanData } = response || {};

    // For production instances, hide response body for security
    const isProduction = instance.environment === 'production';
    const recordCount = Array.isArray(cleanData?.data) ? cleanData.data.length : undefined;

    return c.json({
      success: true,
      statusCode: 200,
      responseTime,
      sapResponseTime,
      data: isProduction ? undefined : cleanData,
      recordCount,
      bodyHidden: isProduction ? true : undefined,
      request: {
        method: 'GET',
        url: `${instance.baseUrl}${fullPath}`,
        authType: auth?.type || 'none',
      }
    });
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return c.json({
      success: false,
      statusCode: error.status || 500,
      responseTime,
      error: {
        code: error.odataError?.code || error.code || 'REQUEST_FAILED',
        message: error.odataError?.message || error.message || 'Request failed',
        details: error.odataError?.details || error.details,
      },
      request: {
        method: 'GET',
        url: `${instance.baseUrl}${fullPath}`,
        authType: auth?.type || 'none',
      }
    });
  }
});

export default app;
