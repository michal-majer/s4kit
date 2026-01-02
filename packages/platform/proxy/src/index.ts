import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDbClient } from '@s4kit/shared/db';
import { redis } from './cache/redis.ts';
import proxyRoute from './routes/proxy.ts';
import healthRoute from './routes/health.ts';
import typesRoute from './routes/types.ts';

// Initialize shared clients
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const { db, close: closeDb } = createDbClient({
  connectionString: databaseUrl,
  max: 10,
  idleTimeout: 20,
});

// Re-export redis from cache module
export { redis };

const app = new Hono();

// CORS for proxy routes (API key auth, no credentials needed)
app.use('/api/proxy/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-S4Kit-Service', 'X-S4Kit-Instance', 'X-S4Kit-Raw', 'X-S4Kit-Strip-Metadata'],
  exposeHeaders: ['Content-Length'],
  credentials: false,
}));

// Health routes (no CORS needed)
app.route('/health', healthRoute);

// API routes
app.route('/api/proxy/$types', typesRoute);
app.route('/api/proxy', proxyRoute);

// Start server
const port = Number(process.env.PORT) || 3002;

console.log(`S4Kit Proxy Service starting on port ${port}...`);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`S4Kit Proxy Service running at http://localhost:${server.port}`);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await closeDb();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
