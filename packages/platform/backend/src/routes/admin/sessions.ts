import { Hono } from 'hono';
import { db, sessions } from '../../db';
import { eq, and, ne, gt } from 'drizzle-orm';
import { type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

// List user's active sessions
app.get('/', async (c) => {
  const user = c.get('user');
  const currentSession = c.get('session');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userSessions = await db.query.sessions.findMany({
    where: and(
      eq(sessions.userId, user.id),
      gt(sessions.expiresAt, new Date())
    ),
  });

  // Format sessions and mark current
  const formattedSessions = userSessions.map((session) => ({
    id: session.id,
    isCurrent: session.id === currentSession?.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  }));

  return c.json(formattedSessions);
});

// Revoke a specific session
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const currentSession = c.get('session');
  const sessionId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Cannot revoke current session through this endpoint
  if (sessionId === currentSession?.id) {
    return c.json({ error: 'Cannot revoke current session. Use logout instead.' }, 400);
  }

  const [deleted] = await db
    .delete(sessions)
    .where(and(
      eq(sessions.id, sessionId),
      eq(sessions.userId, user.id)
    ))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ success: true });
});

// Revoke all sessions except current
app.delete('/', async (c) => {
  const user = c.get('user');
  const currentSession = c.get('session');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!currentSession) {
    return c.json({ error: 'No current session' }, 400);
  }

  const result = await db
    .delete(sessions)
    .where(and(
      eq(sessions.userId, user.id),
      ne(sessions.id, currentSession.id)
    ))
    .returning();

  return c.json({ success: true, revokedCount: result.length });
});

export default app;
