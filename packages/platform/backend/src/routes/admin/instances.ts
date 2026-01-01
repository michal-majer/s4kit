import { Hono } from 'hono';
import { db, instances, systems, systemServices, instanceServices, authConfigurations } from '../../db';
import { encryption } from '@s4kit/shared/services';
import { metadataParser } from '../../services/metadata-parser';
import { serviceBindingParser } from '../../services/service-binding-parser';
import { z } from 'zod';
import { desc, eq, and, inArray } from 'drizzle-orm';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

// Helper to verify system belongs to organization
async function verifySystemOrg(systemId: string, organizationId: string): Promise<boolean> {
  const system = await db.query.systems.findFirst({
    where: and(eq(systems.id, systemId), eq(systems.organizationId, organizationId)),
  });
  return !!system;
}

// Helper to verify auth config belongs to organization
async function verifyAuthConfigOrg(authConfigId: string | null | undefined, organizationId: string): Promise<boolean> {
  if (!authConfigId) return true; // null is valid (no auth)
  const config = await db.query.authConfigurations.findFirst({
    where: and(eq(authConfigurations.id, authConfigId), eq(authConfigurations.organizationId, organizationId)),
  });
  return !!config;
}

// Helper to resolve auth configuration
export async function resolveAuthConfig(authConfigId: string | null): Promise<{
  authType: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';
  username: string | null;
  password: string | null;
  authConfig: any;
  credentials: any;
} | null> {
  if (!authConfigId) return null;

  const config = await db.query.authConfigurations.findFirst({
    where: eq(authConfigurations.id, authConfigId),
  });

  if (!config) return null;

  return {
    authType: config.authType,
    username: config.username,
    password: config.password,
    authConfig: config.authConfig,
    credentials: config.credentials,
  };
}

const instanceSchema = z.object({
  systemId: z.string().uuid(),
  environment: z.enum(['sandbox', 'dev', 'quality', 'preprod', 'production']),
  baseUrl: z.string().url(),
  authConfigId: z.string().uuid().optional().nullable(),
});

// List instances (optionally by systemId, filtered by organization)
app.get('/', requirePermission('instance:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const systemId = c.req.query('systemId');

  // Get all systems for this organization
  const orgSystems = await db.query.systems.findMany({
    where: eq(systems.organizationId, organizationId),
    columns: { id: true },
  });
  const orgSystemIds = orgSystems.map((s) => s.id);

  if (orgSystemIds.length === 0) {
    return c.json([]);
  }

  let whereCondition;
  if (systemId) {
    // Verify systemId belongs to org
    if (!orgSystemIds.includes(systemId)) {
      return c.json({ error: 'System not found' }, 404);
    }
    whereCondition = eq(instances.systemId, systemId);
  } else {
    whereCondition = inArray(instances.systemId, orgSystemIds);
  }

  const allInstances = await db.query.instances.findMany({
    where: whereCondition,
    orderBy: [desc(instances.createdAt)],
  });

  // Include auth config name if linked
  const result = await Promise.all(allInstances.map(async (instance) => {
    let authConfigName: string | null = null;
    let authType: string | null = null;

    if (instance.authConfigId) {
      const config = await db.query.authConfigurations.findFirst({
        where: eq(authConfigurations.id, instance.authConfigId),
        columns: { name: true, authType: true },
      });
      authConfigName = config?.name ?? null;
      authType = config?.authType ?? null;
    }

    return {
      ...instance,
      authConfigName,
      authType,
    };
  }));

  return c.json(result);
});

// Create instance
app.post('/', requirePermission('instance:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();
  const result = instanceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Verify system belongs to organization
  if (!(await verifySystemOrg(result.data.systemId, organizationId))) {
    return c.json({ error: 'System not found' }, 404);
  }

  // Verify auth config belongs to organization (if specified)
  if (!(await verifyAuthConfigOrg(result.data.authConfigId, organizationId))) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  const [newInstance] = await db.insert(instances).values({
    systemId: result.data.systemId,
    environment: result.data.environment,
    baseUrl: result.data.baseUrl,
    authConfigId: result.data.authConfigId ?? null,
  }).returning();

  if (!newInstance) {
    return c.json({ error: 'Failed to create instance' }, 500);
  }

  // For S4HANA systems, auto-link services
  const system = await db.query.systems.findFirst({
    where: eq(systems.id, result.data.systemId)
  });

  if (system && (system.type === 's4_public' || system.type === 's4_private' || system.type === 's4_onprem')) {
    // Check if there are existing instances for this system
    const existingInstances = await db.query.instances.findMany({
      where: eq(instances.systemId, result.data.systemId)
    });

    // Define environment order for finding the closest instance
    const envOrder: Record<typeof result.data.environment, number> = {
      sandbox: 0,
      dev: 1,
      quality: 2,
      preprod: 3,
      production: 4,
    };

    // Filter out the newly created instance
    const otherInstances = existingInstances.filter(inst => inst.id !== newInstance.id);

    // Find the closest instance by environment level (prefer lower, then higher)
    const sortedInstances = otherInstances.sort((a, b) => {
      const currentEnv = envOrder[result.data.environment];
      const distA = Math.abs(envOrder[a.environment] - currentEnv);
      const distB = Math.abs(envOrder[b.environment] - currentEnv);

      if (distA !== distB) return distA - distB;
      return envOrder[a.environment] - envOrder[b.environment];
    });

    const sourceInstance = sortedInstances[0];

    let systemServicesForSystem: typeof systemServices.$inferSelect[] = [];

    if (sourceInstance) {
      // Copy ALL services from the source instance (level below)
      const sourceInstanceServices = await db.query.instanceServices.findMany({
        where: eq(instanceServices.instanceId, sourceInstance.id)
      });

      const sourceServiceIds = sourceInstanceServices.map(is => is.systemServiceId);
      if (sourceServiceIds.length > 0) {
        systemServicesForSystem = await db.query.systemServices.findMany({
          where: inArray(systemServices.id, sourceServiceIds)
        });

        for (const svc of systemServicesForSystem) {
          try {
            await db.insert(instanceServices).values({
              instanceId: newInstance.id,
              systemServiceId: svc.id,
              verificationStatus: 'pending',
            });
          } catch (err) {
            console.error('Failed to copy service:', err);
          }
        }
      }
    } else {
      // First instance - load the 10 popular/essential services
      const POPULAR_SERVICE_ALIASES_PUBLIC = [
        'bp', 'salesorder', 'product', 'purchorder', 'glaccount',
        'costcenter', 'companycode', 'materialdoc', 'billing', 'glaccountlineitem',
      ];

      const POPULAR_SERVICE_ALIASES_PRIVATE = [
        'bp', 'product', 'purchorder', 'glaccount', 'companycode',
        'glaccountlineitem', 'bank', 'billingdocsrv', 'costcentersrv', 'billingdocrequestsrv',
      ];

      const aliases = system.type === 's4_public'
        ? POPULAR_SERVICE_ALIASES_PUBLIC
        : POPULAR_SERVICE_ALIASES_PRIVATE;

      systemServicesForSystem = await db.query.systemServices.findMany({
        where: and(
          eq(systemServices.systemId, result.data.systemId),
          inArray(systemServices.alias, aliases)
        )
      });

      for (const svc of systemServicesForSystem) {
        try {
          await db.insert(instanceServices).values({
            instanceId: newInstance.id,
            systemServiceId: svc.id,
            verificationStatus: 'pending',
          });
        } catch (err) {
          console.error('Failed to auto-link service:', err);
        }
      }
    }

    // Trigger batched verification (non-blocking)
    if (systemServicesForSystem.length > 0) {
      batchedRefreshServices(newInstance.id, newInstance, systemServicesForSystem).catch(console.error);
    }
  }

  return c.json(newInstance, 201);
});

// Get single instance (verify belongs to org via system)
app.get('/:id', requirePermission('instance:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, id),
  });

  if (!instance) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  // Verify system belongs to organization
  if (!(await verifySystemOrg(instance.systemId, organizationId))) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  // Include auth config info if linked
  let authConfigName: string | null = null;
  let authType: string | null = null;

  if (instance.authConfigId) {
    const config = await db.query.authConfigurations.findFirst({
      where: eq(authConfigurations.id, instance.authConfigId),
      columns: { name: true, authType: true },
    });
    authConfigName = config?.name ?? null;
    authType = config?.authType ?? null;
  }

  return c.json({
    ...instance,
    authConfigName,
    authType,
  });
});

// Update instance
app.patch('/:id', requirePermission('instance:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');
  const body = await c.req.json();

  // Verify instance belongs to organization
  const existingInstance = await db.query.instances.findFirst({
    where: eq(instances.id, id),
  });
  if (!existingInstance || !(await verifySystemOrg(existingInstance.systemId, organizationId))) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  const updateSchema = z.object({
    baseUrl: z.string().url().optional(),
    authConfigId: z.string().uuid().optional().nullable(),
  });

  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Verify auth config belongs to organization (if specified)
  if (result.data.authConfigId !== undefined && !(await verifyAuthConfigOrg(result.data.authConfigId, organizationId))) {
    return c.json({ error: 'Auth configuration not found' }, 404);
  }

  const [updated] = await db.update(instances)
    .set({
      ...result.data,
      updatedAt: new Date(),
    })
    .where(eq(instances.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  return c.json(updated);
});

// Import service binding JSON (VCAP_SERVICES or BTP service binding)
app.post('/:id/import-binding', requirePermission('instance:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  // Verify instance belongs to organization
  const existingInstance = await db.query.instances.findFirst({
    where: eq(instances.id, id),
  });
  if (!existingInstance || !(await verifySystemOrg(existingInstance.systemId, organizationId))) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  const importSchema = z.object({
    bindingJson: z.string().min(1, 'Binding JSON is required'),
    configName: z.string().min(1).max(255).optional(),
    preferredService: z.enum(['xsuaa', 'destination']).optional(),
  });

  const body = await c.req.json();
  const result = importSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Parse the service binding
  const parsed = serviceBindingParser.parseBinding(result.data.bindingJson, result.data.preferredService);

  if (!serviceBindingParser.validateBinding(parsed)) {
    return c.json({
      error: 'Invalid service binding format. Expected VCAP_SERVICES or BTP service binding JSON with clientid, clientsecret, and url fields.',
    }, 400);
  }

  // Create a new auth configuration from the binding
  const configName = result.data.configName || `${existingInstance.environment}-oauth-imported`;

  const authConfigData = {
    tokenUrl: parsed.tokenUrl,
    clientId: parsed.clientId,
    scope: parsed.scope,
    identityZone: parsed.identityZone,
    grantType: 'client_credentials' as const,
    bindingType: parsed.bindingType,
  };

  const credentialsData = {
    clientSecret: encryption.encrypt(parsed.clientSecret),
  };

  try {
    // Create auth configuration
    const [newAuthConfig] = await db.insert(authConfigurations).values({
      organizationId,
      name: configName,
      description: `Imported from ${parsed.bindingType} service binding`,
      authType: 'oauth2',
      authConfig: authConfigData,
      credentials: credentialsData,
    }).returning();

    if (!newAuthConfig) {
      return c.json({ error: 'Failed to create auth configuration' }, 500);
    }

    // Update instance to use the new auth configuration
    const [updated] = await db.update(instances)
      .set({
        authConfigId: newAuthConfig.id,
        updatedAt: new Date(),
      })
      .where(eq(instances.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: 'Failed to update instance' }, 500);
    }

    return c.json({
      success: true,
      authConfigId: newAuthConfig.id,
      authConfigName: newAuthConfig.name,
      config: {
        tokenUrl: parsed.tokenUrl,
        clientId: parsed.clientId,
        scope: parsed.scope,
        identityZone: parsed.identityZone,
        bindingType: parsed.bindingType,
      },
    });
  } catch (error: any) {
    // Handle unique constraint violation - config name already exists
    if (error.code === '23505') {
      return c.json({ error: `Auth configuration with name "${configName}" already exists. Please specify a different name.` }, 409);
    }
    throw error;
  }
});

// Delete instance
app.delete('/:id', requirePermission('instance:delete'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  // Verify instance belongs to organization
  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, id),
  });
  if (!instance || !(await verifySystemOrg(instance.systemId, organizationId))) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  const [deleted] = await db.delete(instances).where(eq(instances.id, id)).returning();

  if (!deleted) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  return c.json({ success: true });
});

// Helper function to get auth for metadata fetching
async function getAuthForInstance(instance: typeof instances.$inferSelect): Promise<any> {
  if (!instance.authConfigId) {
    return null;
  }

  const config = await db.query.authConfigurations.findFirst({
    where: eq(authConfigurations.id, instance.authConfigId),
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

// Helper function to get auth with inheritance: instanceService > systemService > instance
async function getAuthWithInheritance(
  instService: typeof instanceServices.$inferSelect,
  systemService: typeof systemServices.$inferSelect,
  instance: typeof instances.$inferSelect
): Promise<any> {
  // Priority 1: Instance service auth
  if (instService.authConfigId) {
    const config = await db.query.authConfigurations.findFirst({
      where: eq(authConfigurations.id, instService.authConfigId),
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

  // Priority 2: System service auth
  if (systemService.authConfigId) {
    const config = await db.query.authConfigurations.findFirst({
      where: eq(authConfigurations.id, systemService.authConfigId),
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

  // Priority 3: Instance auth (fallback)
  return getAuthForInstance(instance);
}

// Helper to add delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Batched verification - processes services in small batches with delays to avoid rate limiting
async function batchedRefreshServices(
  instanceId: string,
  instance: typeof instances.$inferSelect,
  systemServicesForSystem: typeof systemServices.$inferSelect[],
  batchSize = 5,
  delayMs = 1500
) {
  // Get all instance services for this instance
  const instServices = await db.query.instanceServices.findMany({
    where: eq(instanceServices.instanceId, instanceId)
  });

  const results: { serviceId: string; status: 'verified' | 'failed'; entityCount?: number; error?: string }[] = [];

  // Process in batches
  for (let i = 0; i < instServices.length; i += batchSize) {
    const batch = instServices.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (instService) => {
        const systemService = systemServicesForSystem.find(s => s.id === instService.systemServiceId);
        if (!systemService) return null;

        try {
          const auth = await getAuthWithInheritance(instService, systemService, instance);
          const servicePath = instService.servicePathOverride || systemService.servicePath;

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
              .where(eq(instanceServices.id, instService.id));

            return { serviceId: instService.id, status: 'failed' as const, error: metadataResult.error };
          } else {
            const entityNames = metadataResult.entities.map(e => e.name);

            await db.update(instanceServices)
              .set({
                entities: entityNames,
                verificationStatus: 'verified',
                lastVerifiedAt: new Date(),
                verificationError: null,
              })
              .where(eq(instanceServices.id, instService.id));

            return { serviceId: instService.id, status: 'verified' as const, entityCount: entityNames.length };
          }
        } catch (error: any) {
          await db.update(instanceServices)
            .set({
              verificationStatus: 'failed',
              lastVerifiedAt: new Date(),
              verificationError: error.message || 'Failed to refresh entities',
            })
            .where(eq(instanceServices.id, instService.id));

          return { serviceId: instService.id, status: 'failed' as const, error: error.message };
        }
      })
    );

    results.push(...batchResults.filter((r): r is NonNullable<typeof r> => r !== null));

    // Delay before next batch (except for last batch)
    if (i + batchSize < instServices.length) {
      await sleep(delayMs);
    }
  }

  return results;
}

// Refresh all services for an instance
app.post('/:id/refresh-all-services', requirePermission('instance:update'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const id = c.req.param('id');

  const instance = await db.query.instances.findFirst({
    where: eq(instances.id, id),
  });

  if (!instance) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  // Verify system belongs to organization
  if (!(await verifySystemOrg(instance.systemId, organizationId))) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  // Get all instance services
  const instServices = await db.query.instanceServices.findMany({
    where: eq(instanceServices.instanceId, id)
  });

  // Get system services
  const sysServiceIds = instServices.map(is => is.systemServiceId);
  const sysServices = await db.query.systemServices.findMany({
    where: inArray(systemServices.id, sysServiceIds)
  });

  const results = await batchedRefreshServices(id, instance, sysServices);

  const verified = results.filter((r) => r.status === 'verified').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  return c.json({
    success: true,
    verified,
    failed,
    total: results.length,
    results,
  });
});

export default app;
