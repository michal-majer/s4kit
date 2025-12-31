import { Hono } from 'hono';
import { type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

// Get current user's membership info
app.get('/', async (c) => {
  const user = c.get('user')!;
  const organizationId = c.get('organizationId');
  const userRole = c.get('userRole');

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    organizationId,
    role: userRole,
  });
});

export default app;
