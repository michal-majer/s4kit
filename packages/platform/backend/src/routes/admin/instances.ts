import { Hono } from 'hono';
import { db, instances, systems, systemServices, instanceServices } from '../../db';
import { encryption } from '../../services/encryption';
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

const instanceSchema = z.object({
  systemId: z.uuidv4(),
  environment: z.enum(['sandbox', 'dev', 'quality', 'preprod', 'production']),
  baseUrl: z.url(),
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).default('basic'),
  
  // Basic auth fields
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  
  // API Key auth fields
  apiKey: z.string().min(1).optional(),
  apiKeyHeaderName: z.string().optional(),
  
  // OAuth2 auth fields
  oauth2ClientId: z.string().min(1).optional(),
  oauth2ClientSecret: z.string().min(1).optional(),
  oauth2TokenUrl: z.url().optional(),
  oauth2Scope: z.string().optional(),
  oauth2AuthorizationUrl: z.url().optional(),
  
  // Custom auth fields
  customHeaderName: z.string().min(1).optional(),
  customHeaderValue: z.string().min(1).optional(),
  authConfig: z.any().optional(),
  credentials: z.any().optional(),
}).refine((data) => {
  if (data.authType === 'none') return true;
  if (data.authType === 'basic') return !!(data.username && data.password);
  if (data.authType === 'api_key') return !!data.apiKey;
  if (data.authType === 'oauth2') return !!(data.oauth2ClientId && data.oauth2ClientSecret && data.oauth2TokenUrl);
  if (data.authType === 'custom') return !!(data.customHeaderName && data.customHeaderValue);
  return true;
}, {
  message: 'Required authentication fields are missing for the selected auth type',
  path: ['authType']
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

  // Don't return secrets
  const safeInstances = allInstances.map(({ username, password, credentials, ...rest }) => rest);
  return c.json(safeInstances);
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

  const { 
    username, 
    password, 
    authType, 
    apiKey,
    apiKeyHeaderName,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    ...data 
  } = result.data;

  const instanceData: any = {
    ...data,
    authType: authType as any,
  };

  // Store credentials based on auth type
  if (authType === 'basic' && username && password) {
    instanceData.username = encryption.encrypt(username);
    instanceData.password = encryption.encrypt(password);
  } else if (authType === 'api_key' && apiKey) {
    instanceData.authConfig = {
      headerName: apiKeyHeaderName || 'X-API-Key',
    };
    instanceData.credentials = {
      apiKey: encryption.encrypt(apiKey),
    };
  } else if (authType === 'oauth2') {
    instanceData.authConfig = {
      tokenUrl: oauth2TokenUrl,
      scope: oauth2Scope,
      authorizationUrl: oauth2AuthorizationUrl,
      clientId: oauth2ClientId,
    };
    instanceData.credentials = {
      clientSecret: oauth2ClientSecret ? encryption.encrypt(oauth2ClientSecret) : undefined,
    };
  } else if (authType === 'custom') {
    if (customHeaderName && customHeaderValue) {
      instanceData.authConfig = {
        headerName: customHeaderName,
      };
      instanceData.credentials = {
        headerValue: encryption.encrypt(customHeaderValue),
      };
    } else if (authConfig) {
      instanceData.authConfig = authConfig;
      if (credentials) {
        const encryptedCredentials: any = {};
        for (const [key, value] of Object.entries(credentials)) {
          if (typeof value === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'))) {
            encryptedCredentials[key] = encryption.encrypt(value);
          } else {
            encryptedCredentials[key] = value;
          }
        }
        instanceData.credentials = encryptedCredentials;
      }
    }
  }

  const [newInstance] = await db.insert(instances).values(instanceData).returning();

  if (!newInstance) {
    return c.json({ error: 'Failed to create instance' }, 500);
  }

  // For S4HANA systems, auto-link services
  const system = await db.query.systems.findFirst({
    where: eq(systems.id, data.systemId)
  });

  if (system && (system.type === 's4_public' || system.type === 's4_private' || system.type === 's4_onprem')) {
    // Check if there are existing instances for this system
    const existingInstances = await db.query.instances.findMany({
      where: eq(instances.systemId, data.systemId)
    });

    // Define environment order for finding the closest instance
    const envOrder: Record<typeof data.environment, number> = {
      sandbox: 0,
      dev: 1,
      quality: 2,
      preprod: 3,
      production: 4,
    };

    // Filter out the newly created instance
    const otherInstances = existingInstances.filter(inst => inst.id !== newInstance.id);

    // Find the closest instance by environment level (prefer lower, then higher)
    // Sort by distance from current environment, with lower environments having priority
    const sortedInstances = otherInstances.sort((a, b) => {
      const currentEnv = envOrder[data.environment];
      const distA = Math.abs(envOrder[a.environment] - currentEnv);
      const distB = Math.abs(envOrder[b.environment] - currentEnv);

      if (distA !== distB) return distA - distB; // Closer environment first
      // If same distance, prefer lower environment
      return envOrder[a.environment] - envOrder[b.environment];
    });

    const sourceInstance = sortedInstances[0];

    let systemServicesForSystem: typeof systemServices.$inferSelect[] = [];

    if (sourceInstance) {
      // Copy ALL services from the source instance (level below)
      const sourceInstanceServices = await db.query.instanceServices.findMany({
        where: eq(instanceServices.instanceId, sourceInstance.id)
      });

      // Get the system services for these instance services
      const sourceServiceIds = sourceInstanceServices.map(is => is.systemServiceId);
      if (sourceServiceIds.length > 0) {
        systemServicesForSystem = await db.query.systemServices.findMany({
          where: inArray(systemServices.id, sourceServiceIds)
        });

        // Create instance services copying from source
        for (const svc of systemServicesForSystem) {
          try {
            await db.insert(instanceServices).values({
              instanceId: newInstance.id,
              systemServiceId: svc.id,
              verificationStatus: 'pending',
            });
          } catch (err) {
            // Ignore duplicate key errors (service already linked)
            console.error('Failed to copy service:', err);
          }
        }
      }
    } else {
      // First instance - load the 10 popular/essential services
      // Different aliases exist in s4_public vs s4_private/s4_onprem
      const POPULAR_SERVICE_ALIASES_PUBLIC = [
        'bp',                  // Business Partner (v2)
        'salesorder',          // Sales Order (A2X)
        'product',             // Product Master (v4)
        'purchorder',          // Purchase Order (v4)
        'glaccount',           // G/L Account (v2)
        'costcenter',          // Cost Center (v2)
        'companycode',         // Company Code (v2)
        'materialdoc',         // Material Documents (v2)
        'billing',             // Billing Document (v2)
        'glaccountlineitem',   // G/L Account Line Items (v2)
      ];

      const POPULAR_SERVICE_ALIASES_PRIVATE = [
        'bp',                  // Business Partner
        'product',             // Product Master
        'purchorder',          // Purchase Order
        'glaccount',           // G/L Account
        'companycode',         // Company Code
        'glaccountlineitem',   // G/L Account Line Items
        'bank',                // Bank Master
        'billingdocsrv',       // Billing Document
        'costcentersrv',       // Cost Center
        'billingdocrequestsrv', // Billing Document Request
      ];

      const aliases = system.type === 's4_public'
        ? POPULAR_SERVICE_ALIASES_PUBLIC
        : POPULAR_SERVICE_ALIASES_PRIVATE;

      systemServicesForSystem = await db.query.systemServices.findMany({
        where: and(
          eq(systemServices.systemId, data.systemId),
          inArray(systemServices.alias, aliases)
        )
      });

      // Create instance services with pending verification
      for (const svc of systemServicesForSystem) {
        try {
          await db.insert(instanceServices).values({
            instanceId: newInstance.id,
            systemServiceId: svc.id,
            verificationStatus: 'pending',
          });
        } catch (err) {
          // Ignore duplicate key errors (service already linked)
          console.error('Failed to auto-link service:', err);
        }
      }
    }

    // Trigger batched verification (non-blocking) - processes 5 at a time with delays
    if (systemServicesForSystem.length > 0) {
      batchedRefreshServices(newInstance.id, newInstance, systemServicesForSystem).catch(console.error);
    }
  }

  const { username: _, password: __, credentials: ___, ...safeInstance } = newInstance;
  return c.json(safeInstance, 201);
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

  const { username, password, credentials, ...safeInstance } = instance;
  return c.json(safeInstance);
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
    baseUrl: z.url().optional(),
    authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
    apiKeyHeaderName: z.string().optional(),
    oauth2ClientId: z.string().min(1).optional(),
    oauth2ClientSecret: z.string().min(1).optional(),
    oauth2TokenUrl: z.url().optional(),
    oauth2Scope: z.string().optional(),
    oauth2AuthorizationUrl: z.url().optional(),
    customHeaderName: z.string().min(1).optional(),
    customHeaderValue: z.string().min(1).optional(),
    authConfig: z.any().optional(),
    credentials: z.any().optional(),
  });
  
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { 
    username, 
    password, 
    authType,
    apiKey,
    apiKeyHeaderName,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    ...data 
  } = result.data;

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  if (authType !== undefined) {
    updateData.authType = authType;
  }

  const finalAuthType = authType;
  
  if (finalAuthType === 'none') {
    updateData.username = null;
    updateData.password = null;
    updateData.authConfig = null;
    updateData.credentials = null;
  } else if (finalAuthType === 'basic' || (finalAuthType === undefined && (username !== undefined || password !== undefined))) {
    if (username !== undefined) updateData.username = encryption.encrypt(username);
    if (password !== undefined) updateData.password = encryption.encrypt(password);
  } else if (finalAuthType === 'api_key' && apiKey !== undefined) {
    updateData.authConfig = { headerName: apiKeyHeaderName || 'X-API-Key' };
    updateData.credentials = { apiKey: encryption.encrypt(apiKey) };
  } else if (finalAuthType === 'oauth2' && (oauth2ClientId !== undefined || oauth2ClientSecret !== undefined || oauth2TokenUrl !== undefined)) {
    const existingInstance = await db.query.instances.findFirst({ where: eq(instances.id, id) });
    const currentAuthConfig = existingInstance?.authConfig as any || {};
    const currentCredentials = existingInstance?.credentials as any || {};
    
    updateData.authConfig = {
      ...currentAuthConfig,
      tokenUrl: oauth2TokenUrl !== undefined ? oauth2TokenUrl : currentAuthConfig.tokenUrl,
      scope: oauth2Scope !== undefined ? oauth2Scope : currentAuthConfig.scope,
      authorizationUrl: oauth2AuthorizationUrl !== undefined ? oauth2AuthorizationUrl : currentAuthConfig.authorizationUrl,
      clientId: oauth2ClientId !== undefined ? oauth2ClientId : currentAuthConfig.clientId,
    };
    
    if (oauth2ClientSecret !== undefined) {
      updateData.credentials = { ...currentCredentials, clientSecret: encryption.encrypt(oauth2ClientSecret) };
    }
  } else if (finalAuthType === 'custom') {
    if (customHeaderName !== undefined || customHeaderValue !== undefined) {
      const existingInstance = await db.query.instances.findFirst({ where: eq(instances.id, id) });
      const currentAuthConfig = existingInstance?.authConfig as any || {};
      
      if (customHeaderName !== undefined) {
        updateData.authConfig = {
          ...currentAuthConfig,
          headerName: customHeaderName,
        };
      }
      
      if (customHeaderValue !== undefined) {
        const currentCredentials = existingInstance?.credentials as any || {};
        updateData.credentials = {
          ...currentCredentials,
          headerValue: encryption.encrypt(customHeaderValue),
        };
      }
    } else if (authConfig !== undefined) {
      updateData.authConfig = authConfig;
      if (credentials !== undefined) {
        const encryptedCredentials: any = {};
        for (const [key, value] of Object.entries(credentials)) {
          if (typeof value === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'))) {
            encryptedCredentials[key] = encryption.encrypt(value);
          } else {
            encryptedCredentials[key] = value;
          }
        }
        updateData.credentials = encryptedCredentials;
      }
    }
  }

  const [updated] = await db.update(instances)
    .set(updateData)
    .where(eq(instances.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Instance not found' }, 404);
  }

  const { username: _, password: __, credentials: ___, ...safeInstance } = updated;
  return c.json(safeInstance);
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

  // Build auth config and credentials
  const authConfig = {
    tokenUrl: parsed.tokenUrl,
    clientId: parsed.clientId,
    scope: parsed.scope,
    identityZone: parsed.identityZone,
    grantType: 'client_credentials' as const,
    bindingType: parsed.bindingType,
  };

  const credentials = {
    clientSecret: encryption.encrypt(parsed.clientSecret),
  };

  // Update instance with OAuth2 configuration
  const [updated] = await db.update(instances)
    .set({
      authType: 'oauth2',
      authConfig,
      credentials,
      // Clear basic auth fields when switching to OAuth
      username: null,
      password: null,
      updatedAt: new Date(),
    })
    .where(eq(instances.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Failed to update instance' }, 500);
  }

  // Return parsed config (without secrets) for UI confirmation
  return c.json({
    success: true,
    config: {
      tokenUrl: parsed.tokenUrl,
      clientId: parsed.clientId,
      scope: parsed.scope,
      identityZone: parsed.identityZone,
      bindingType: parsed.bindingType,
    },
  });
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

// Helper function to refresh all services for an instance
async function refreshAllServicesForInstance(
  instanceId: string,
  instance: typeof instances.$inferSelect,
  systemServicesForSystem?: typeof systemServices.$inferSelect[]
) {
  // Get all instance services for this instance
  const instServices = await db.query.instanceServices.findMany({
    where: eq(instanceServices.instanceId, instanceId)
  });

  // Get system services if not provided
  let sysServices = systemServicesForSystem;
  if (!sysServices) {
    const sysServiceIds = instServices.map(is => is.systemServiceId);
    sysServices = [];
    for (const id of sysServiceIds) {
      const svc = await db.query.systemServices.findFirst({
        where: eq(systemServices.id, id)
      });
      if (svc) sysServices.push(svc);
    }
  }

  const results: { serviceId: string; status: 'verified' | 'failed'; entityCount?: number; error?: string }[] = [];

  for (const instService of instServices) {
    const systemService = sysServices.find(s => s.id === instService.systemServiceId);
    if (!systemService) continue;

    try {
      // Resolve auth with inheritance: instanceService > systemService > instance
      let auth: any = null;

      if (instService.authType && instService.authType !== 'none') {
        auth = {
          type: instService.authType,
          username: instService.username,
          password: instService.password,
          config: instService.authConfig,
          credentials: instService.credentials,
        };
      } else if (systemService.authType && systemService.authType !== 'none') {
        auth = {
          type: systemService.authType,
          username: systemService.username,
          password: systemService.password,
          config: systemService.authConfig,
          credentials: systemService.credentials,
        };
      } else {
        auth = {
          type: instance.authType,
          username: instance.username,
          password: instance.password,
          config: instance.authConfig,
          credentials: instance.credentials,
        };
      }

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

        results.push({ serviceId: instService.id, status: 'failed', error: metadataResult.error });
      } else {
        const entityNames = metadataResult.entities.map(e => e.name);

        await db.update(instanceServices)
          .set({
            entities: entityNames,
            verificationStatus: 'verified',
            lastVerifiedAt: new Date(),
            entityCount: entityNames.length,
            verificationError: null,
          })
          .where(eq(instanceServices.id, instService.id));

        results.push({ serviceId: instService.id, status: 'verified', entityCount: entityNames.length });
      }
    } catch (error: any) {
      await db.update(instanceServices)
        .set({
          verificationStatus: 'failed',
          lastVerifiedAt: new Date(),
          verificationError: error.message || 'Failed to refresh entities',
        })
        .where(eq(instanceServices.id, instService.id));

      results.push({ serviceId: instService.id, status: 'failed', error: error.message });
    }
  }

  return results;
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
          // Resolve auth with inheritance: instanceService > systemService > instance
          let auth: any = null;

          if (instService.authType && instService.authType !== 'none') {
            auth = {
              type: instService.authType,
              username: instService.username,
              password: instService.password,
              config: instService.authConfig,
              credentials: instService.credentials,
            };
          } else if (systemService.authType && systemService.authType !== 'none') {
            auth = {
              type: systemService.authType,
              username: systemService.username,
              password: systemService.password,
              config: systemService.authConfig,
              credentials: systemService.credentials,
            };
          } else {
            auth = {
              type: instance.authType,
              username: instance.username,
              password: instance.password,
              config: instance.authConfig,
              credentials: instance.credentials,
            };
          }

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
                entityCount: entityNames.length,
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

    // Collect non-null results
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

  const results = await refreshAllServicesForInstance(id, instance);

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
