import { Hono } from 'hono';
import { db } from '../../db';
import { services, connections, connectionServices } from '../../db/schema';
import { metadataParser } from '../../services/metadata-parser';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';

const app = new Hono();

const serviceSchema = z.object({
  name: z.string().min(1).max(255),
  alias: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/i, 'Alias must be alphanumeric with dashes/underscores'),
  servicePath: z.string().min(1).max(500), // e.g., "/sap/opu/odata/sap/API_BUSINESS_PARTNER"
  description: z.string().max(1000).optional(),
  organizationId: z.string().uuid(),
  entities: z.array(z.string()).default([]) // e.g., ["A_BusinessPartner", "A_BusinessPartnerAddress"]
});

const updateServiceSchema = serviceSchema.partial().omit({ organizationId: true });

// List all services for an organization
app.get('/', async (c) => {
  const orgId = c.req.query('organizationId');
  
  const where = orgId ? eq(services.organizationId, orgId) : undefined;
  
  const allServices = await db.query.services.findMany({
    where,
    orderBy: [desc(services.createdAt)]
  });
  
  return c.json(allServices);
});

// Get single service
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const service = await db.query.services.findFirst({
    where: eq(services.id, id)
  });
  
  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }
  
  return c.json(service);
});

// Create new service
app.post('/', async (c) => {
  const body = await c.req.json();
  const result = serviceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Check for duplicate alias in same org
  const existing = await db.query.services.findFirst({
    where: and(
      eq(services.organizationId, result.data.organizationId),
      eq(services.alias, result.data.alias)
    )
  });

  if (existing) {
    return c.json({ error: 'Service with this alias already exists in the organization' }, 409);
  }

  const [newService] = await db.insert(services).values({
    name: result.data.name,
    alias: result.data.alias,
    servicePath: result.data.servicePath,
    description: result.data.description,
    organizationId: result.data.organizationId,
    entities: result.data.entities
  }).returning();

  return c.json(newService, 201);
});

// Update service
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateServiceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const [updated] = await db.update(services)
    .set({
      ...result.data,
      updatedAt: new Date()
    })
    .where(eq(services.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Service not found' }, 404);
  }

  return c.json(updated);
});

// Delete service
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db.delete(services)
    .where(eq(services.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Service not found' }, 404);
  }

  return c.json({ success: true });
});

// Add entities to a service
app.post('/:id/entities', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const entitiesSchema = z.object({
    entities: z.array(z.string().min(1))
  });
  
  const result = entitiesSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const service = await db.query.services.findFirst({
    where: eq(services.id, id)
  });

  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Merge new entities with existing (deduplicated)
  const currentEntities = (service.entities as string[]) || [];
  const newEntities = [...new Set([...currentEntities, ...result.data.entities])];

  const [updated] = await db.update(services)
    .set({ 
      entities: newEntities,
      updatedAt: new Date()
    })
    .where(eq(services.id, id))
    .returning();

  return c.json(updated);
});

// Remove entities from a service
app.delete('/:id/entities', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const entitiesSchema = z.object({
    entities: z.array(z.string().min(1))
  });
  
  const result = entitiesSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const service = await db.query.services.findFirst({
    where: eq(services.id, id)
  });

  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Filter out specified entities
  const currentEntities = (service.entities as string[]) || [];
  const entitiesToRemove = new Set(result.data.entities);
  const newEntities = currentEntities.filter(e => !entitiesToRemove.has(e));

  const [updated] = await db.update(services)
    .set({ 
      entities: newEntities,
      updatedAt: new Date()
    })
    .where(eq(services.id, id))
    .returning();

  return c.json(updated);
});

// =====================================================
// Metadata Discovery Endpoints
// =====================================================

const discoverMetadataSchema = z.object({
  // Option 1: Use existing connection
  connectionId: z.string().uuid().optional(),
  // Option 2: Provide raw credentials (for testing before saving)
  baseUrl: z.string().url().optional(),
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  // Service path is always required
  servicePath: z.string().min(1)
}).refine(
  (data) => data.connectionId || data.baseUrl,
  { message: 'Either connectionId or baseUrl must be provided' }
);

/**
 * Discover available entities from an OData service $metadata
 * Can use either an existing connection or raw credentials
 * 
 * POST /admin/services/discover-entities
 * Body: { connectionId?, baseUrl?, authType?, username?, password?, servicePath }
 */
app.post('/discover-entities', async (c) => {
  const body = await c.req.json();
  const result = discoverMetadataSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  const { connectionId, baseUrl, authType, username, password, servicePath } = result.data;

  try {
    let metadataResult;

    if (connectionId) {
      // Use existing connection
      const connection = await db.query.connections.findFirst({
        where: eq(connections.id, connectionId)
      });

      if (!connection) {
        return c.json({ error: 'Connection not found' }, 404);
      }

      metadataResult = await metadataParser.fetchMetadata({
        baseUrl: connection.baseUrl,
        servicePath,
        auth: {
          type: connection.authType,
          username: connection.username,
          password: connection.password
        }
      });
    } else if (baseUrl) {
      // Use raw credentials
      metadataResult = await metadataParser.fetchMetadataWithRawCredentials({
        baseUrl,
        servicePath,
        authType,
        username,
        password
      });
    } else {
      return c.json({ error: 'Either connectionId or baseUrl must be provided' }, 400);
    }

    if (metadataResult.error) {
      return c.json({ 
        error: metadataResult.error,
        entities: [] 
      }, 400);
    }

    return c.json({
      entities: metadataResult.entities,
      count: metadataResult.entities.length
    });
  } catch (error: any) {
    console.error('Metadata discovery error:', error);
    return c.json({ 
      error: error.message || 'Failed to discover entities',
      entities: []
    }, 500);
  }
});

/**
 * Discover entities for an existing service using a linked connection
 * Useful for refreshing the entity list after a service is created
 * 
 * POST /admin/services/:id/discover-entities
 * Body: { connectionId } - the connection to use for fetching metadata
 */
app.post('/:id/discover-entities', async (c) => {
  const serviceId = c.req.param('id');
  const body = await c.req.json();
  
  const schema = z.object({
    connectionId: z.uuidv4()
  });
  
  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Get the service
  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId)
  });

  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Get the connection
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, result.data.connectionId)
  });

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404);
  }

  // Optionally check if there's a connectionService with auth override
  const connService = await db.query.connectionServices.findFirst({
    where: and(
      eq(connectionServices.connectionId, connection.id),
      eq(connectionServices.serviceId, serviceId)
    )
  });

  // Use connectionService auth if available, otherwise connection auth
  const auth = connService?.authType ? {
    type: connService.authType,
    username: connService.username,
    password: connService.password
  } : {
    type: connection.authType,
    username: connection.username,
    password: connection.password
  };

  try {
    const metadataResult = await metadataParser.fetchMetadata({
      baseUrl: connection.baseUrl,
      servicePath: connService?.servicePathOverride || service.servicePath,
      auth
    });

    if (metadataResult.error) {
      return c.json({ 
        error: metadataResult.error,
        entities: [],
        currentEntities: service.entities
      }, 400);
    }

    // Extract entity names and merge with existing entities
    const discoveredEntities = metadataResult.entities.map(e => e.name);
    const currentEntities = (service.entities as string[]) || [];
    const newEntities = [...new Set([...currentEntities, ...discoveredEntities])];

    // Update the service with discovered entities
    const [updated] = await db.update(services)
      .set({ 
        entities: newEntities,
        updatedAt: new Date()
      })
      .where(eq(services.id, serviceId))
      .returning();

    return c.json({
      ...updated,
      entities: metadataResult.entities,
      count: metadataResult.entities.length,
      currentEntities: currentEntities,
      newEntities: discoveredEntities.filter(
        e => !currentEntities.includes(e)
      )
    });
  } catch (error: any) {
    console.error('Metadata discovery error:', error);
    return c.json({ 
      error: error.message || 'Failed to discover entities',
      entities: [],
      currentEntities: service.entities
    }, 500);
  }
});

/**
 * Auto-populate entities from $metadata for an existing service
 * Fetches metadata and updates the service's entities list
 * 
 * POST /admin/services/:id/sync-entities
 * Body: { connectionId, merge?: boolean }
 * - merge: if true, add new entities to existing; if false, replace all
 */
app.post('/:id/sync-entities', async (c) => {
  const serviceId = c.req.param('id');
  const body = await c.req.json();
  
  const schema = z.object({
    connectionId: z.string().uuid(),
    merge: z.boolean().default(true)
  });
  
  const result = schema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Get the service
  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId)
  });

  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Get the connection
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, result.data.connectionId)
  });

  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404);
  }

  // Check for connectionService with auth override
  const connService = await db.query.connectionServices.findFirst({
    where: and(
      eq(connectionServices.connectionId, connection.id),
      eq(connectionServices.serviceId, serviceId)
    )
  });

  const auth = connService?.authType ? {
    type: connService.authType,
    username: connService.username,
    password: connService.password
  } : {
    type: connection.authType,
    username: connection.username,
    password: connection.password
  };

  try {
    const metadataResult = await metadataParser.fetchMetadata({
      baseUrl: connection.baseUrl,
      servicePath: connService?.servicePathOverride || service.servicePath,
      auth
    });

    if (metadataResult.error) {
      return c.json({ error: metadataResult.error }, 400);
    }

    const discoveredEntities = metadataResult.entities.map(e => e.name);
    const currentEntities = (service.entities as string[]) || [];
    
    // Merge or replace based on option
    const newEntities = result.data.merge
      ? [...new Set([...currentEntities, ...discoveredEntities])]
      : discoveredEntities;

    const [updated] = await db.update(services)
      .set({ 
        entities: newEntities,
        updatedAt: new Date()
      })
      .where(eq(services.id, serviceId))
      .returning();

    return c.json({
      ...updated,
      discovered: discoveredEntities.length,
      added: newEntities.length - currentEntities.length
    });
  } catch (error: any) {
    console.error('Sync entities error:', error);
    return c.json({ error: error.message || 'Failed to sync entities' }, 500);
  }
});

export default app;
