import { Hono } from 'hono';
import { db } from '../../db';
import { systems, systemServices, predefinedServices } from '../../db/schema';
import { z } from 'zod';
import { desc, eq, and } from 'drizzle-orm';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

const createSystemSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['s4_public', 's4_private', 'btp', 'other']),
  description: z.string().optional(),
});

const updateSystemSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// List systems (filtered by organization)
app.get('/', requirePermission('system:read'), async (c) => {
  const organizationId = c.get('organizationId')!;

  const orgSystems = await db.query.systems.findMany({
    where: eq(systems.organizationId, organizationId),
    orderBy: [desc(systems.createdAt)],
  });

  return c.json(orgSystems);
});

// Create system
app.post('/', requirePermission('system:create'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const userId = c.get('user')!.id;
  const body = await c.req.json();

  const result = createSystemSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { type, ...data } = result.data;

  // Create the system
  const [newSystem] = await db
    .insert(systems)
    .values({
      ...data,
      type: type as 's4_public' | 's4_private' | 'btp' | 'other',
      organizationId,
      createdBy: userId,
    })
    .returning();

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

// Get single system (verify organization ownership)
app.get('/:id', requirePermission('system:read'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  const system = await db.query.systems.findFirst({
    where: and(eq(systems.id, id), eq(systems.organizationId, organizationId)),
  });

  if (!system) {
    return c.json({ error: 'System not found' }, 404);
  }

  return c.json(system);
});

// Update system
app.patch('/:id', requirePermission('system:update'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;
  const body = await c.req.json();

  const result = updateSystemSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const [updated] = await db
    .update(systems)
    .set({
      ...result.data,
      updatedAt: new Date(),
    })
    .where(and(eq(systems.id, id), eq(systems.organizationId, organizationId)))
    .returning();

  if (!updated) {
    return c.json({ error: 'System not found' }, 404);
  }

  return c.json(updated);
});

// Delete system
app.delete('/:id', requirePermission('system:delete'), async (c) => {
  const id = c.req.param('id');
  const organizationId = c.get('organizationId')!;

  const [deleted] = await db
    .delete(systems)
    .where(and(eq(systems.id, id), eq(systems.organizationId, organizationId)))
    .returning();

  if (!deleted) {
    return c.json({ error: 'System not found' }, 404);
  }

  return c.json({ success: true });
});

export default app;
