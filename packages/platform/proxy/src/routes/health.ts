import { Hono } from 'hono';
import { db, redis } from '../index.ts';
import { sql } from '@s4kit/shared/db';

const app = new Hono();

// Health check secret for detailed endpoint access (optional)
const HEALTH_CHECK_SECRET = process.env.HEALTH_CHECK_SECRET;

// Liveness probe - service is running
app.get('/live', (c) => {
  return c.json({ status: 'ok' });
});

// Readiness probe - service can handle requests
app.get('/ready', async (c) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  return c.json({ status: allOk ? 'ready' : 'degraded', checks }, allOk ? 200 : 503);
});

// Detailed health for monitoring
// If HEALTH_CHECK_SECRET is set, requires X-Health-Secret header
app.get('/', async (c) => {
  // If secret is configured, require it for detailed health info
  if (HEALTH_CHECK_SECRET) {
    const providedSecret = c.req.header('X-Health-Secret');
    if (providedSecret !== HEALTH_CHECK_SECRET) {
      // Return minimal health status without system details
      try {
        await db.execute(sql`SELECT 1`);
        await redis.ping();
        return c.json({ status: 'healthy' });
      } catch {
        return c.json({ status: 'unhealthy' }, 503);
      }
    }
  }

  const checks: Record<string, any> = {};

  // Database check
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message };
  }

  // Redis check
  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - start };
  } catch (e: any) {
    checks.redis = { status: 'error', error: e.message };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  checks.memory = {
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    rssMB: Math.round(memUsage.rss / 1024 / 1024),
  };

  const allOk = checks.database.status === 'ok' && checks.redis.status === 'ok';
  return c.json({
    status: allOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.VERSION || '0.1.0',
    checks,
  }, allOk ? 200 : 503);
});

export default app;
