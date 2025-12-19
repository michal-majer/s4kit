import { Hono } from 'hono';
import { db } from '../../db';
import { systems, systemServices, predefinedServices } from '../../db/schema';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';

const app = new Hono();

const systemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['s4_public', 's4_private', 'btp', 'other']),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
});

// List systems
app.get('/', async (c) => {
  const allSystems = await db.query.systems.findMany({
    orderBy: [desc(systems.createdAt)]
  });
  return c.json(allSystems);
});

// Create system
app.post('/', async (c) => {
  const body = await c.req.json();
  const result = systemSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { type, ...data } = result.data;

  // Create the system
  const [newSystem] = await db.insert(systems).values({
    ...data,
    type: type as any,
  }).returning();

  if (!newSystem) {
    return c.json({ error: 'Failed to create system' }, 500);
  }

  // For S/4HANA types, auto-create predefined services
  if (type === 's4_public' || type === 's4_private') {
    const predefined = await db.query.predefinedServices.findMany({
      where: eq(predefinedServices.systemType, type),
    });

    if (predefined.length > 0) {
      await db.insert(systemServices).values(
        predefined.map((ps) => ({
          systemId: newSystem.id,
          predefinedServiceId: ps.id,
          name: ps.name,
          alias: ps.alias,
          servicePath: ps.servicePath,
          description: ps.description,
          entities: ps.defaultEntities || [],
        }))
      );
    }
  }

  return c.json(newSystem, 201);
});

// Get single system
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const system = await db.query.systems.findFirst({
    where: eq(systems.id, id)
  });
  
  if (!system) {
    return c.json({ error: 'System not found' }, 404);
  }
  
  return c.json(system);
});

// Update system
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const updateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  });
  
  const result = updateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const [updated] = await db.update(systems)
    .set({
      ...result.data,
      updatedAt: new Date(),
    })
    .where(eq(systems.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: 'System not found' }, 404);
  }

  return c.json(updated);
});

// Delete system
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db.delete(systems)
    .where(eq(systems.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'System not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
