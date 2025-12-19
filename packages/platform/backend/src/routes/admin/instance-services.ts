import { Hono } from 'hono';
import { db } from '../../db';
import { instanceServices, systemServices, instances } from '../../db/schema';
import { encryption } from '../../services/encryption';
import { metadataParser } from '../../services/metadata-parser';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';

const app = new Hono();

const instanceServiceSchema = z.object({
  instanceId: z.string().uuid(),
  systemServiceId: z.string().uuid(),
  servicePathOverride: z.string().optional(),
  // Optional: per-instance entity list (null = inherit from systemService)
  entities: z.array(z.string()).optional().nullable(),
  // Optional auth override
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

// List instance services (optionally by instanceId)
app.get('/', async (c) => {
  const instanceId = c.req.query('instanceId');
  
  const services = await db.query.instanceServices.findMany({
    where: instanceId ? eq(instanceServices.instanceId, instanceId) : undefined,
    orderBy: [desc(instanceServices.createdAt)]
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
      } : null,
      instance: instance ? {
        id: instance.id,
        environment: instance.environment,
      } : null,
    };
  }));
  
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
    ...data 
  } = result.data;

  const serviceData: any = { 
    ...data,
    entities: entities !== undefined ? entities : null,
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

  const [newService] = await db.insert(instanceServices).values(serviceData).returning();

  if (!newService) {
    return c.json({ error: 'Failed to create instance service' }, 500);
  }

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
    } : null,
    instance: instance ? {
      id: instance.id,
      environment: instance.environment,
    } : null,
  });
});

// Update instance service
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const updateSchema = z.object({
    servicePathOverride: z.string().optional().nullable(),
    entities: z.array(z.string()).optional().nullable(),
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
      return c.json({ 
        error: metadataResult.error,
        entities: []
      }, 400);
    }
    
    // Extract entity names
    const entityNames = metadataResult.entities.map(e => e.name);
    
    // Update the instance service with new entities
    const [updated] = await db.update(instanceServices)
      .set({ 
        entities: entityNames,
      })
      .where(eq(instanceServices.id, id))
      .returning();
    
    if (!updated) {
      return c.json({ error: 'Failed to update instance service' }, 500);
    }
    
    const { username: _, password: __, credentials: ___, ...safeService } = updated;
    
    // Resolve entities for response
    const resolvedEntities = updated.entities !== null ? updated.entities : (systemService.entities || []);
    
    return c.json({
      ...safeService,
      entities: resolvedEntities,
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
