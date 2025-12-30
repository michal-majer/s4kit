import { Hono } from 'hono';
import { db, systems, systemServices, predefinedServices, instances, instanceServices, apiKeyAccess } from '../../db';
import { encryption } from '../../services/encryption';
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

const serviceSchema = z.object({
  systemId: z.string().uuid(),
  name: z.string().min(1),
  alias: z.string().min(1).max(50),
  servicePath: z.string().min(1),
  description: z.string().optional(),
  entities: z.array(z.string()).optional(),
  predefinedServiceId: z.string().uuid().optional(),
  odataVersion: z.enum(['v2', 'v4']).optional(),
  // Optional auth configuration
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  apiKeyHeaderName: z.string().optional(),
  oauth2ClientId: z.string().min(1).optional(),
  oauth2ClientSecret: z.string().min(1).optional(),
  oauth2TokenUrl: z.string().url().optional(),
  oauth2Scope: z.string().optional(),
  oauth2AuthorizationUrl: z.string().url().optional(),
  authConfig: z.any().optional(),
  credentials: z.any().optional(),
});

// List system services (optionally by systemId)
app.get('/', async (c) => {
  const systemId = c.req.query('systemId');
  
  const services = await db.query.systemServices.findMany({
    where: systemId ? eq(systemServices.systemId, systemId) : undefined,
    orderBy: [desc(systemServices.createdAt)]
  });
  
  // Don't return secrets
  const safeServices = services.map(({ username, password, credentials, ...rest }) => rest);
  return c.json(safeServices);
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

  const {
    authType,
    username,
    password,
    apiKey,
    apiKeyHeaderName,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
    authConfig,
    credentials,
    entities,
    odataVersion,
    ...data
  } = result.data;

  const serviceData: any = {
    ...data,
    entities: entities || [],
    odataVersion: odataVersion || null,
  };

  if (authType) {
    serviceData.authType = authType as any;
    
    if (authType === 'basic' && username && password) {
      serviceData.username = encryption.encrypt(username);
      serviceData.password = encryption.encrypt(password);
    } else if (authType === 'api_key' && apiKey) {
      serviceData.authConfig = { headerName: apiKeyHeaderName || 'X-API-Key' };
      serviceData.credentials = { apiKey: encryption.encrypt(apiKey) };
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
      if (authConfig) serviceData.authConfig = authConfig;
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

  const [newService] = await db.insert(systemServices).values(serviceData).returning();

  if (!newService) {
    return c.json({ error: 'Failed to create service' }, 500);
  }

  const { username: _, password: __, credentials: ___, ...safeService } = newService;
  return c.json(safeService, 201);
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
  
  const { username, password, credentials, ...safeService } = service;
  return c.json(safeService);
});

// Update system service
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    alias: z.string().min(1).max(50).optional(),
    servicePath: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    entities: z.array(z.string()).optional(),
    authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional().nullable(),
    username: z.string().min(1).optional().nullable(),
    password: z.string().min(1).optional().nullable(),
    apiKey: z.string().min(1).optional(),
    apiKeyHeaderName: z.string().optional(),
    oauth2ClientId: z.string().min(1).optional(),
    oauth2ClientSecret: z.string().min(1).optional(),
    oauth2TokenUrl: z.string().url().optional(),
    oauth2Scope: z.string().optional(),
    oauth2AuthorizationUrl: z.string().url().optional(),
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
    apiKey,
    apiKeyHeaderName,
    oauth2ClientId,
    oauth2ClientSecret,
    oauth2TokenUrl,
    oauth2Scope,
    oauth2AuthorizationUrl,
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
    
    if (authType === null || authType === 'none') {
      updateData.username = null;
      updateData.password = null;
      updateData.authConfig = null;
      updateData.credentials = null;
    } else if (authType === 'basic') {
      if (username) updateData.username = encryption.encrypt(username);
      if (password) updateData.password = encryption.encrypt(password);
    } else if (authType === 'api_key' && apiKey) {
      updateData.authConfig = { headerName: apiKeyHeaderName || 'X-API-Key' };
      updateData.credentials = { apiKey: encryption.encrypt(apiKey) };
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
      if (authConfig) updateData.authConfig = authConfig;
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

  const [updated] = await db.update(systemServices)
    .set(updateData)
    .where(eq(systemServices.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Service not found' }, 404);
  }

  const { username: _, password: __, credentials: ___, ...safeService } = updated;
  return c.json(safeService);
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
  
  if (!['s4_public', 's4_private', 'btp', 'other'].includes(systemType)) {
    return c.json({ error: 'Invalid system type' }, 400);
  }
  
  const services = await db.query.predefinedServices.findMany({
    where: eq(predefinedServices.systemType, systemType as any),
  });
  
  return c.json(services);
});

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
  const priorityOrder = { production: 0, quality: 1, dev: 2 };
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
    // Determine auth to use: service auth if set, otherwise instance auth
    let auth: any = null;
    
    if (service.authType && service.authType !== 'none') {
      // Use service-level auth
      auth = {
        type: service.authType,
        username: service.username,
        password: service.password,
        config: service.authConfig,
        credentials: service.credentials,
      };
    } else {
      // Use instance-level auth
      auth = {
        type: instance.authType,
        username: instance.username,
        password: instance.password,
        config: instance.authConfig,
        credentials: instance.credentials,
      };
    }
    
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
    
    const { username: _, password: __, credentials: ___, ...safeService } = updated;
    return c.json({
      ...safeService,
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
