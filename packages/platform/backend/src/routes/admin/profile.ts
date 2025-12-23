import { Hono } from 'hono';
import { db, users, accounts } from '../../db';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// Get current user profile
app.get('/', async (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const profile = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    emailVerified: profile.emailVerified,
    image: profile.image,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
});

// Update user profile
app.patch('/', async (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();

  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const [updated] = await db
    .update(users)
    .set({
      name: result.data.name,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))
    .returning();

  if (!updated) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    emailVerified: updated.emailVerified,
    image: updated.image,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
});

// Change password
app.post('/change-password', async (c) => {
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();

  const result = changePasswordSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  const { currentPassword, newPassword } = result.data;

  // Find credential account for this user
  const credentialAccount = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, user.id),
      eq(accounts.providerId, 'credential')
    ),
  });

  if (!credentialAccount || !credentialAccount.password) {
    return c.json({ error: 'No password set for this account. You may have signed up with a social provider.' }, 400);
  }

  // Verify current password using Bun's password API
  const isValid = await Bun.password.verify(currentPassword, credentialAccount.password);

  if (!isValid) {
    return c.json({ error: 'Current password is incorrect' }, 400);
  }

  // Hash new password
  const newPasswordHash = await Bun.password.hash(newPassword, {
    algorithm: 'bcrypt',
    cost: 10,
  });

  // Update password
  await db
    .update(accounts)
    .set({
      password: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(and(
      eq(accounts.userId, user.id),
      eq(accounts.providerId, 'credential')
    ));

  return c.json({ success: true });
});

export default app;
