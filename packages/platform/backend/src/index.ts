import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { auth } from './auth'
import { config } from './config/mode'
import { sessionMiddleware, adminAuthMiddleware } from './middleware/session-auth'
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

const app = new Hono()

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'

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

export default app
