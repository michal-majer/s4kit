import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { auth } from './auth'
import { sessionMiddleware, adminAuthMiddleware } from './middleware/session-auth'
import systemsRoute from './routes/admin/systems'
import instancesRoute from './routes/admin/instances'
import systemServicesRoute from './routes/admin/system-services'
import instanceServicesRoute from './routes/admin/instance-services'
import apiKeysRoute from './routes/admin/api-keys'
import logsRoute from './routes/admin/logs'
import organizationRoute from './routes/admin/organization'
import profileRoute from './routes/admin/profile'
import sessionsRoute from './routes/admin/sessions'
import platformInfoRoute from './routes/admin/platform-info'

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

// Admin routes
app.route('/admin/systems', systemsRoute)
app.route('/admin/instances', instancesRoute)
app.route('/admin/system-services', systemServicesRoute)
app.route('/admin/instance-services', instanceServicesRoute)
app.route('/admin/api-keys', apiKeysRoute)
app.route('/admin/logs', logsRoute)
app.route('/admin/organization', organizationRoute)
app.route('/admin/profile', profileRoute)
app.route('/admin/sessions', sessionsRoute)
app.route('/admin/platform-info', platformInfoRoute)

export default app
