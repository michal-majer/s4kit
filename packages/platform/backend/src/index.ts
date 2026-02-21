import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'

// Validate required environment variables at startup
function validateEnv() {
  const required = ['DATABASE_URL', 'ENCRYPTION_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate ENCRYPTION_KEY format (64 hex chars or 44 base64 chars)
  const key = process.env.ENCRYPTION_KEY!;
  const isValidHex = /^[0-9a-fA-F]{64}$/.test(key);
  const isValidBase64 = /^[A-Za-z0-9+/]{43}=$/.test(key);

  if (!isValidHex && !isValidBase64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters or 44 base64 characters');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required in production');
  }
}

validateEnv();

import { db } from './db'
import { redis } from './cache/redis'
import { auth } from './auth'
import { config } from './config/mode'
import { sessionMiddleware, adminAuthMiddleware } from './middleware/session-auth'
import { cacheHeaders } from './middleware/cache-headers'
import { securityHeaders } from './middleware/security-headers'
import systemsRoute from './routes/admin/systems'
import instancesRoute from './routes/admin/instances'
import systemServicesRoute from './routes/admin/system-services'
import instanceServicesRoute from './routes/admin/instance-services'
import authConfigurationsRoute from './routes/admin/auth-configurations'
import apiKeysRoute from './routes/admin/api-keys'
import logsRoute from './routes/admin/logs'
import organizationRoute from './routes/admin/organization'
import onboardingRoute from './routes/admin/onboarding'
import profileRoute from './routes/admin/profile'
import sessionsRoute from './routes/admin/sessions'
import platformInfoRoute from './routes/admin/platform-info'
import meRoute from './routes/admin/me'
import invitationsRoute from './routes/admin/invitations'
import resendVerificationRoute from './routes/public/resend-verification'

const app = new Hono()

// Apply security headers to all responses
app.use('*', securityHeaders)

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'

// Validate CORS origin in production
if (process.env.NODE_ENV === 'production') {
  try {
    const url = new URL(frontendUrl);
    if (url.protocol !== 'https:') {
      console.warn(`[Security] FRONTEND_URL should use HTTPS in production: ${frontendUrl}`);
    }
  } catch {
    throw new Error(`Invalid FRONTEND_URL: ${frontendUrl}`);
  }
}

// CORS for auth routes (requires credentials)
app.use('/api/auth/*', cors({
  origin: frontendUrl,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// CORS for admin routes (requires credentials for session auth)
app.use('/admin/*', cors({
  origin: frontendUrl,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  credentials: true,
}))

// Session auth middleware for admin routes
app.use('/admin/*', sessionMiddleware)
app.use('/admin/*', adminAuthMiddleware)
// Add cache headers for GET requests (stale-while-revalidate pattern)
app.use('/admin/*', cacheHeaders(0, 30))

// Health check
app.get('/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({ status: 'healthy' })
  } catch {
    return c.json({ status: 'unhealthy' }, 503)
  }
})

// Better-auth handler
app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

// CORS for public platform info (no credentials needed)
app.use('/api/platform-info', cors({
  origin: frontendUrl,
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: false,
}))

// Public platform info (no auth required, for login page)
app.route('/api/platform-info', platformInfoRoute)

// CORS for resend verification (public, no credentials)
app.use('/api/resend-verification', cors({
  origin: frontendUrl,
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: false,
}))

// Public resend verification route (no auth required)
app.route('/api/resend-verification', resendVerificationRoute)

// CORS for invitations (public GET, auth required for POST)
app.use('/api/invitations/*', cors({
  origin: frontendUrl,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
}))

// Public invitations route (view invitation + accept with auth)
app.route('/api/invitations', invitationsRoute)

// Admin routes
app.route('/admin/systems', systemsRoute)
app.route('/admin/instances', instancesRoute)
app.route('/admin/system-services', systemServicesRoute)
app.route('/admin/instance-services', instanceServicesRoute)
app.route('/admin/auth-configurations', authConfigurationsRoute)
app.route('/admin/api-keys', apiKeysRoute)
app.route('/admin/logs', logsRoute)
app.route('/admin/organization', organizationRoute)
app.route('/admin/onboarding', onboardingRoute)
app.route('/admin/profile', profileRoute)
app.route('/admin/sessions', sessionsRoute)
app.route('/admin/platform-info', platformInfoRoute)
app.route('/admin/me', meRoute)

// Auto-setup admin user for selfhost mode on startup
if (config.isSelfHosted) {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    // Check if any users exist, if not, run setup
    db.execute(sql`SELECT COUNT(*) as count FROM users`).then(async (result) => {
      const count = Number((result[0] as { count: string | number })?.count || 0)
      if (count === 0) {
        console.log('No users found. Running auto-setup for selfhost mode...')
        const { setupAdmin } = await import('./db/setup-admin')
        await setupAdmin()
      }
    }).catch((err) => {
      console.error('Failed to check for existing users:', err)
    })
  }
}

// Warm up connections on startup to reduce first-request latency
async function warmupConnections() {
  try {
    // Warm up database connection
    await db.execute(sql`SELECT 1`)
    console.log('[Startup] Database connection warmed up')

    // Warm up Redis connection (lazyConnect is enabled)
    await redis.ping()
    console.log('[Startup] Redis connection warmed up')
  } catch (error) {
    console.error('[Startup] Failed to warm up connections:', error)
  }
}

// Run warmup in background (don't block server start)
warmupConnections()

const port = Number(process.env.PORT) || 3000

export default {
  fetch: app.fetch,
  port,
}
