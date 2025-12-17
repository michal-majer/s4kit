import { Hono } from 'hono';
import { db } from '../../db';
import { requestLogs } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';

const app = new Hono();

// List Logs
app.get('/', async (c) => {
  const { apiKeyId, limit } = c.req.query();
  
  const query = db.select().from(requestLogs);
  
  if (apiKeyId) {
    query.where(eq(requestLogs.apiKeyId, apiKeyId));
  }
  
  const logs = await query
    .orderBy(desc(requestLogs.createdAt))
    .limit(limit ? parseInt(limit) : 100);

  return c.json(logs);
});

export default app;
