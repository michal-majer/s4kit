import { Hono } from 'hono';
import { db } from '../../db';
import { connections } from '../../db/schema';
import { encryption } from '../../services/encryption';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';

const app = new Hono();

const connectionSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.url(),
  authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).default('basic'),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  environment: z.enum(['dev', 'staging', 'prod']),
  organizationId: z.uuid() // In a real app, this comes from auth context
}).refine((data) => {
  // If authType is 'none', username and password are not required
  if (data.authType === 'none') {
    return true;
  }
  // For other auth types, username and password are required
  return !!(data.username && data.password);
}, {
  message: 'Username and password are required when authType is not "none"',
  path: ['username']
});

// List connections
app.get('/', async (c) => {
  const allConnections = await db.query.connections.findMany({
    orderBy: [desc(connections.createdAt)]
  });
  
  // Don't return secrets
  const safeConnections = allConnections.map(({ username, password, ...rest }) => rest);

  //Only admin can see authType, authConfig and credentials @TODO
  return c.json(safeConnections);
});

// Create connection
app.post('/', async (c) => {
  const body = await c.req.json();
  const result = connectionSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { username, password, authType, ...data } = result.data;

  const connectionData: any = {
    ...data,
    authType: authType as any,
  };

  // Only encrypt and store credentials if authType is not 'none'
  // Zod validation ensures username/password exist when authType !== 'none'
  if (authType !== 'none' && username && password) {
    connectionData.username = encryption.encrypt(username);
    connectionData.password = encryption.encrypt(password);
  }

  const [newConnection] = await db.insert(connections).values(connectionData).returning();

  if (!newConnection) {
    return c.json({ error: 'Failed to create connection' }, 500);
  }

  const { username: _, password: __, ...safeConnection } = newConnection;
  return c.json(safeConnection, 201);
});

// Get single connection
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const connection = await db.query.connections.findFirst({
    where: eq(connections.id, id)
  });
  
  if (!connection) {
    return c.json({ error: 'Connection not found' }, 404);
  }
  
  const { username, password, ...safeConnection } = connection;
  return c.json(safeConnection);
});

// Update connection
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  // For partial updates, we need a more flexible schema
  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    baseUrl: z.string().url().optional(),
    authType: z.enum(['none', 'basic', 'oauth2', 'api_key', 'custom']).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    environment: z.enum(['dev', 'staging', 'prod']).optional(),
  }).refine((data) => {
    // Only validate auth requirements if authType is being updated
    if (data.authType === undefined) return true;
    if (data.authType === 'none') return true;
    // If authType is being set to something other than 'none', 
    // username and password are required only if they're also being updated
    if (data.username !== undefined || data.password !== undefined) {
      return !!(data.username && data.password);
    }
    return true;
  }, {
    message: 'Username and password are required when authType is not "none"',
    path: ['username']
  });
  
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { username, password, authType, ...data } = result.data;

  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };

  if (authType !== undefined) {
    updateData.authType = authType;
  }

  // Only update credentials if provided
  if (username !== undefined || password !== undefined) {
    if (authType === 'none' || (result.data.authType === 'none')) {
      updateData.username = null;
      updateData.password = null;
    } else {
      if (username !== undefined) {
        updateData.username = encryption.encrypt(username);
      }
      if (password !== undefined) {
        updateData.password = encryption.encrypt(password);
      }
    }
  }

  const [updated] = await db.update(connections)
    .set(updateData)
    .where(eq(connections.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'Connection not found' }, 404);
  }

  const { username: _, password: __, ...safeConnection } = updated;
  return c.json(safeConnection);
});

// Delete connection
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db.delete(connections)
    .where(eq(connections.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Connection not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
