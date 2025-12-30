import { Hono } from 'hono';
import { db, systems, instanceServices, systemServices, instances, apiKeyAccess } from '../../db';
import { encryption } from '../../services/encryption';
import { metadataParser } from '../../services/metadata-parser';
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
    // Resolve auth with inheritance: instanceService > systemService > instance
    let auth: any = null;

    if (instanceService.authType && instanceService.authType !== 'none') {
      auth = {
        type: instanceService.authType,
        username: instanceService.username,
        password: instanceService.password,
        config: instanceService.authConfig,
        credentials: instanceService.credentials,
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
        entityCount: entityNames.length,
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
  // Optional: per-instance entity list (null = inherit from systemService)
  entities: z.array(z.string()).optional().nullable(),
  // Optional auth override
  authType: z.enum(['none', 'basic', 'oauth2', 'custom']).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  oauth2ClientId: z.string().min(1).optional(),
  oauth2ClientSecret: z.string().min(1).optional(),
  oauth2TokenUrl: z.string().url().optional(),
  oauth2Scope: z.string().optional(),
  oauth2AuthorizationUrl: z.string().url().optional(),
  customHeaderName: z.string().min(1).optional(),
  customHeaderValue: z.string().min(1).optional(),
  authConfig: z.any().optional(),
  credentials: z.any().optional(),
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

    const { username, password, credentials, ...safeIs } = is;
    return {
      ...safeIs,
      entities: resolvedEntities,
      hasAuthOverride: !!is.authType,
      hasEntityOverride: is.entities !== null,
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
  const body = await c.req.json();
  const result = instanceServiceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const {
    authType,
    username,
    password,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    entities,
    ...data
  } = result.data;

  const serviceData: any = {
    ...data,
    entities: entities !== undefined ? entities : null,
    verificationStatus: 'pending',
  };

  if (authType) {
    serviceData.authType = authType as any;

    if (authType === 'basic' && username && password) {
      serviceData.username = encryption.encrypt(username);
      serviceData.password = encryption.encrypt(password);
    } else if (authType === 'oauth2') {
      serviceData.authConfig = {
        tokenUrl: oauth2TokenUrl,
        scope: oauth2Scope,
        authorizationUrl: oauth2AuthorizationUrl,
        clientId: oauth2ClientId,
      };
      serviceData.credentials = {
        clientSecret: oauth2ClientSecret ? encryption.encrypt(oauth2ClientSecret) : undefined,
      };
    } else if (authType === 'custom') {
      if (customHeaderName && customHeaderValue) {
        serviceData.authConfig = { headerName: customHeaderName };
        serviceData.credentials = { headerValue: encryption.encrypt(customHeaderValue) };
      } else if (authConfig) {
        serviceData.authConfig = authConfig;
        if (credentials) {
          const encryptedCredentials: any = {};
          for (const [key, value] of Object.entries(credentials)) {
            if (typeof value === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('password'))) {
              encryptedCredentials[key] = encryption.encrypt(value);
            } else {
              encryptedCredentials[key] = value;
            }
          }
          serviceData.credentials = encryptedCredentials;
        }
      }
    }
  }

  const [newService] = await db.insert(instanceServices).values(serviceData).returning();

  if (!newService) {
    return c.json({ error: 'Failed to create instance service' }, 500);
  }

  // Trigger async verification (non-blocking)
  refreshInstanceServiceEntities(newService.id).catch((err) => {
    console.error('Auto-verification failed for instance service:', newService.id, err);
  });

  const { username: _, password: __, credentials: ___, ...safeService } = newService;
  return c.json(safeService, 201);
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
  
  const { username, password, credentials, ...safeService } = service;
  return c.json({
    ...safeService,
    entities: resolvedEntities,
    hasAuthOverride: !!service.authType,
    hasEntityOverride: service.entities !== null,
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
    authType: z.enum(['none', 'basic', 'oauth2', 'custom']).optional().nullable(),
    username: z.string().min(1).optional().nullable(),
    password: z.string().min(1).optional().nullable(),
    oauth2ClientId: z.string().min(1).optional(),
    oauth2ClientSecret: z.string().min(1).optional(),
    oauth2TokenUrl: z.string().url().optional(),
    oauth2Scope: z.string().optional(),
    oauth2AuthorizationUrl: z.string().url().optional(),
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
    authType,
    username,
    password,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    customHeaderName,
    customHeaderValue,
    authConfig,
    credentials,
    entities,
    ...data
  } = result.data;

  const updateData: any = { ...data };
  
  // Handle entities update
  if (entities !== undefined) {
    updateData.entities = entities;
  }

  if (authType !== undefined) {
    updateData.authType = authType;
    
    if (authType === null || authType === 'none') {
      updateData.username = null;
      updateData.password = null;
      updateData.authConfig = null;
      updateData.credentials = null;
    } else if (authType === 'basic') {
      if (username) updateData.username = encryption.encrypt(username);
      if (password) updateData.password = encryption.encrypt(password);
    } else if (authType === 'oauth2') {
      updateData.authConfig = {
        tokenUrl: oauth2TokenUrl,
        scope: oauth2Scope,
        authorizationUrl: oauth2AuthorizationUrl,
        clientId: oauth2ClientId,
      };
      if (oauth2ClientSecret) {
        updateData.credentials = { clientSecret: encryption.encrypt(oauth2ClientSecret) };
      }
    } else if (authType === 'custom') {
      if (customHeaderName && customHeaderValue) {
        updateData.authConfig = { headerName: customHeaderName };
        updateData.credentials = { headerValue: encryption.encrypt(customHeaderValue) };
      } else if (authConfig) {
        updateData.authConfig = authConfig;
        if (credentials) {
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
  }

  const [updated] = await db.update(instanceServices)
    .set(updateData)
    .where(eq(instanceServices.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Instance service not found' }, 404);
  }

  const { username: _, password: __, credentials: ___, ...safeService } = updated;
  return c.json(safeService);
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
    // Resolve auth with inheritance: instanceService > systemService > instance
    let auth: any = null;
    
    if (instanceService.authType && instanceService.authType !== 'none') {
      // Use instance-service-level auth (highest priority)
      auth = {
        type: instanceService.authType,
        username: instanceService.username,
        password: instanceService.password,
        config: instanceService.authConfig,
        credentials: instanceService.credentials,
      };
    } else if (systemService.authType && systemService.authType !== 'none') {
      // Use service-level auth
      auth = {
        type: systemService.authType,
        username: systemService.username,
        password: systemService.password,
        config: systemService.authConfig,
        credentials: systemService.credentials,
      };
    } else {
      // Use instance-level auth (default)
      auth = {
        type: instance.authType,
        username: instance.username,
        password: instance.password,
        config: instance.authConfig,
        credentials: instance.credentials,
      };
    }
    
    // Determine service path: use override if set, otherwise use systemService path
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
        entityCount: entityNames.length,
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

    const { username: _, password: __, credentials: ___, ...safeService } = updated;

    // Resolve entities for response
    const resolvedEntities = updated.entities !== null ? updated.entities : (systemService.entities || []);

    return c.json({
      ...safeService,
      entities: resolvedEntities,
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

  // Resolve auth with inheritance: instanceService > systemService > instance
  let auth: ResolvedAuthConfig;

  if (instanceService.authType && instanceService.authType !== 'none') {
    auth = {
      type: instanceService.authType,
      username: instanceService.username,
      password: instanceService.password,
      config: instanceService.authConfig,
      credentials: instanceService.credentials,
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
        authType: auth.type,
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
        authType: auth.type,
      }
    });
  }
});

export default app;
