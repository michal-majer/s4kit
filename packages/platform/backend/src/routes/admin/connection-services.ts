import { Hono } from 'hono';
import { db } from '../../db';
import { connectionServices, connections, services } from '../../db/schema';
import { encryption } from '../../services/encryption';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';

const app = new Hono();

const connectionServiceSchema = z.object({
  connectionId: z.uuidv4(),
  serviceId: z.uuidv4(),
  servicePathOverride: z.string().max(500).optional(),
  // Optional auth override
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional(),
  username: z.string().max(255).optional(),
  password: z.string().max(500).optional(),
  authConfig: z.record(z.string(), z.any()).optional(),
  credentials: z.record(z.string(), z.any()).optional()
});

const updateConnectionServiceSchema = connectionServiceSchema.partial().omit({ connectionId: true, serviceId: true });

// List connection-services (with optional filters)
app.get('/', async (c) => {
  const connectionId = c.req.query('connectionId');
  const serviceId = c.req.query('serviceId');
  
  let whereClause;
  if (connectionId && serviceId) {
    whereClause = and(
      eq(connectionServices.connectionId, connectionId),
      eq(connectionServices.serviceId, serviceId)
    );
  } else if (connectionId) {
    whereClause = eq(connectionServices.connectionId, connectionId);
  } else if (serviceId) {
    whereClause = eq(connectionServices.serviceId, serviceId);
  }
  
  const results = await db.query.connectionServices.findMany({
    where: whereClause,
    orderBy: [desc(connectionServices.createdAt)]
  });
  
  // Enrich with connection and service info
  const enriched = await Promise.all(results.map(async (cs) => {
    const [conn, svc] = await Promise.all([
      db.query.connections.findFirst({ where: eq(connections.id, cs.connectionId) }),
      db.query.services.findFirst({ where: eq(services.id, cs.serviceId) })
    ]);
    
    // Don't expose sensitive credentials
    const { password, credentials, ...safeCs } = cs;
    
    return {
      ...safeCs,
      hasAuthOverride: !!cs.authType,
      connection: conn ? { id: conn.id, name: conn.name, environment: conn.environment, baseUrl: conn.baseUrl } : null,
      service: svc ? { id: svc.id, name: svc.name, alias: svc.alias, servicePath: svc.servicePath, entities: svc.entities || [] } : null
    };
  }));
  
  return c.json(enriched);
});

// Get single connection-service
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const cs = await db.query.connectionServices.findFirst({
    where: eq(connectionServices.id, id)
  });
  
  if (!cs) {
    return c.json({ error: 'Connection-service not found' }, 404);
  }
  
  const [conn, svc] = await Promise.all([
    db.query.connections.findFirst({ where: eq(connections.id, cs.connectionId) }),
    db.query.services.findFirst({ where: eq(services.id, cs.serviceId) })
  ]);
  
  // Don't expose sensitive credentials
  const { password, credentials, ...safeCs } = cs;
  
  return c.json({
    ...safeCs,
    hasAuthOverride: !!cs.authType,
    connection: conn ? { id: conn.id, name: conn.name, environment: conn.environment, baseUrl: conn.baseUrl } : null,
    service: svc ? { id: svc.id, name: svc.name, alias: svc.alias, servicePath: svc.servicePath, entities: svc.entities || [] } : null
  });
});

// Create connection-service (link a service to a connection)
app.post('/', async (c) => {
  const body = await c.req.json();
  const result = connectionServiceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Verify connection exists
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, result.data.connectionId)
  });
  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404);
  }

  // Verify service exists
  const service = await db.query.services.findFirst({
    where: eq(services.id, result.data.serviceId)
  });
  if (!service) {
    return c.json({ error: 'Service not found' }, 404);
  }

  // Check for duplicate
  const existing = await db.query.connectionServices.findFirst({
    where: and(
      eq(connectionServices.connectionId, result.data.connectionId),
      eq(connectionServices.serviceId, result.data.serviceId)
    )
  });
  if (existing) {
    return c.json({ error: 'This service is already linked to this connection' }, 409);
  }

  // Encrypt credentials if provided
  const encryptedData: any = {
    connectionId: result.data.connectionId,
    serviceId: result.data.serviceId,
    servicePathOverride: result.data.servicePathOverride,
    authType: result.data.authType,
    authConfig: result.data.authConfig
  };

  if (result.data.username) {
    encryptedData.username = encryption.encrypt(result.data.username);
  }
  if (result.data.password) {
    encryptedData.password = encryption.encrypt(result.data.password);
  }
  if (result.data.credentials) {
    encryptedData.credentials = encryption.encryptJson(result.data.credentials);
  }

  const [newCs] = await db.insert(connectionServices).values(encryptedData).returning();

  if (!newCs) {
    return c.json({ error: 'Failed to create connection-service' }, 500);
  }

  // Return without sensitive data
  const { password: _pw, credentials: _creds, ...safeCs } = newCs;
  return c.json({
    ...safeCs,
    hasAuthOverride: !!newCs.authType,
    connection: { id: connection.id, name: connection.name, environment: connection.environment },
    service: { id: service.id, name: service.name, alias: service.alias, entities: service.entities || [] }
  }, 201);
});

// Update connection-service (e.g., change auth override)
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const result = updateConnectionServiceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  // Build update object, encrypting sensitive fields
  const updateData: any = {
    servicePathOverride: result.data.servicePathOverride,
    authType: result.data.authType,
    authConfig: result.data.authConfig
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) delete updateData[key];
  });

  if (result.data.username !== undefined) {
    updateData.username = result.data.username ? encryption.encrypt(result.data.username) : null;
  }
  if (result.data.password !== undefined) {
    updateData.password = result.data.password ? encryption.encrypt(result.data.password) : null;
  }
  if (result.data.credentials !== undefined) {
    updateData.credentials = result.data.credentials ? encryption.encryptJson(result.data.credentials) : null;
  }

  const [updated] = await db.update(connectionServices)
    .set(updateData)
    .where(eq(connectionServices.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Connection-service not found' }, 404);
  }

  const { password, credentials, ...safeCs } = updated;
  return c.json({
    ...safeCs,
    hasAuthOverride: !!updated.authType
  });
});

// Delete connection-service (unlink service from connection)
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db.delete(connectionServices)
    .where(eq(connectionServices.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Connection-service not found' }, 404);
  }

  return c.json({ success: true });
});

// Clear auth override (revert to inheriting from connection)
app.post('/:id/clear-auth', async (c) => {
  const id = c.req.param('id');

  const [updated] = await db.update(connectionServices)
    .set({
      authType: null,
      username: null,
      password: null,
      authConfig: null,
      credentials: null
    })
    .where(eq(connectionServices.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Connection-service not found' }, 404);
  }

  const { password, credentials, ...safeCs } = updated;
  return c.json({
    ...safeCs,
    hasAuthOverride: false
  });
});

export default app;
