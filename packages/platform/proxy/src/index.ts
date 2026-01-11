import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDbClient, sql } from '@s4kit/shared/db';
import { redis } from './cache/redis.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import proxyRoute from './routes/proxy.ts';
import healthRoute from './routes/health.ts';
import typesRoute from './routes/types.ts';
import batchRoute from './routes/batch.ts';

// Validate required environment variables at startup
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

const isValidHex = /^[0-9a-fA-F]{64}$/.test(encryptionKey);
const isValidBase64 = /^[A-Za-z0-9+/]{43}=$/.test(encryptionKey);
if (!isValidHex && !isValidBase64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters or 44 base64 characters');
}

// Initialize shared clients

export const { db, close: closeDb } = createDbClient({
  connectionString: databaseUrl,
  max: 10,
  idleTimeout: 20,
});

// Re-export redis from cache module
export { redis };

const app = new Hono();

// Apply security headers to all responses
app.use('*', securityHeaders);

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
app.route('/api/proxy/batch', batchRoute);
app.route('/api/proxy', proxyRoute);

// Start server
const port = Number(process.env.PORT) || 3002;

console.log(`S4Kit Proxy Service starting on port ${port}...`);

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`S4Kit Proxy Service running at http://localhost:${server.port}`);

// Warm up connections on startup to reduce first-request latency and ensure health checks pass
async function warmupConnections() {
  try {
    // Warm up database connection
    await db.execute(sql`SELECT 1`);
    console.log('[Startup] Database connection warmed up');

    // Warm up Redis connection (lazyConnect is enabled)
    await redis.ping();
    console.log('[Startup] Redis connection warmed up');
  } catch (error) {
    console.error('[Startup] Failed to warm up connections:', error);
  }
}

// Run warmup - wait for it to complete so health checks pass
warmupConnections();

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  await closeDb();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
