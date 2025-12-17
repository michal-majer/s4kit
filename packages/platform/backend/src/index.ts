import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sql } from 'drizzle-orm'
import { db } from './db'
import proxyRoute from './routes/api/proxy'
import connectionsRoute from './routes/admin/connections'
import apiKeysRoute from './routes/admin/api-keys'
import logsRoute from './routes/admin/logs'
import servicesRoute from './routes/admin/services'
import connectionServicesRoute from './routes/admin/connection-services'

const app = new Hono()

// Enable CORS for all routes
app.use('*', cors({
  origin: '*', // In production, restrict this to your frontend domain
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-S4Kit-Service', 'X-S4Kit-Connection', 'X-S4Kit-Raw', 'X-S4Kit-Strip-Metadata'],
  exposeHeaders: ['Content-Length'],
  credentials: false,
}))

// Health check
app.get('/health', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({ status: 'healthy' })
  } catch {
    return c.json({ status: 'unhealthy' }, 503)
  }
})

// API routes
app.route('/api/proxy', proxyRoute)

// Admin routes
app.route('/admin/connections', connectionsRoute)
app.route('/admin/api-keys', apiKeysRoute)
app.route('/admin/logs', logsRoute)
app.route('/admin/services', servicesRoute)
app.route('/admin/connection-services', connectionServicesRoute)

export default app
