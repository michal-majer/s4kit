/**
 * Test-specific Hono app that bypasses better-auth session validation
 *
 * For integration tests, we need to create sessions directly in the database
 * without going through better-auth's signup/login flow. This test app uses
 * a simplified session middleware that looks up sessions directly from the DB.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { db, members, sessions, users } from '../../src/db';
import { eq, and } from 'drizzle-orm';
import type { SessionVariables, UserRole } from '../../src/middleware/session-auth';
import { adminAuthMiddleware, requirePermission, requireRole } from '../../src/middleware/session-auth';

// Import routes
import systemsRoute from '../../src/routes/admin/systems';
import instancesRoute from '../../src/routes/admin/instances';
import systemServicesRoute from '../../src/routes/admin/system-services';
import instanceServicesRoute from '../../src/routes/admin/instance-services';
import apiKeysRoute from '../../src/routes/admin/api-keys';
import logsRoute from '../../src/routes/admin/logs';

/**
 * Test session middleware that looks up sessions directly from the database
 * bypassing better-auth's validation
 */
const testSessionMiddleware = createMiddleware<{ Variables: SessionVariables }>(
  async (c, next) => {
    try {
      // Extract session token from cookie
      const cookieHeader = c.req.header('Cookie');
      let sessionToken: string | undefined;

      if (cookieHeader) {
        const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
        if (match) {
          sessionToken = match[1];
        }
      }

      if (!sessionToken) {
        c.set('user', null);
        c.set('session', null);
        c.set('organizationId', null);
        c.set('userRole', null);
        return next();
      }

      // Look up session directly in database
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.token, sessionToken),
      });

      if (!session || session.expiresAt < new Date()) {
        c.set('user', null);
        c.set('session', null);
        c.set('organizationId', null);
        c.set('userRole', null);
        return next();
      }

      // Look up user
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
      });

      if (!user) {
        c.set('user', null);
        c.set('session', null);
        c.set('organizationId', null);
        c.set('userRole', null);
        return next();
      }

      c.set('user', user);
      c.set('session', session);

      // Get organization from header or session
      let orgId = c.req.header('X-Organization-Id') || session.activeOrganizationId;
      c.set('organizationId', orgId || null);

      // Get user role in organization
      if (orgId) {
        const member = await db.query.members.findFirst({
          where: and(eq(members.userId, user.id), eq(members.organizationId, orgId)),
        });
        c.set('userRole', (member?.role as UserRole) || null);
      } else {
        c.set('userRole', null);
      }

      return next();
    } catch (error) {
      console.error('[Test Session Middleware] Error:', error);
      c.set('user', null);
      c.set('session', null);
      c.set('organizationId', null);
      c.set('userRole', null);
      return next();
    }
  }
);

// Create test app
const testApp = new Hono();

// CORS
testApp.use('/admin/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'Cookie'],
  credentials: true,
}));

// Test session middleware (bypasses better-auth)
testApp.use('/admin/*', testSessionMiddleware);
testApp.use('/admin/*', adminAuthMiddleware);

// Admin routes (same as production)
testApp.route('/admin/systems', systemsRoute);
testApp.route('/admin/instances', instancesRoute);
testApp.route('/admin/system-services', systemServicesRoute);
testApp.route('/admin/instance-services', instanceServicesRoute);
testApp.route('/admin/api-keys', apiKeysRoute);
testApp.route('/admin/logs', logsRoute);

export default testApp;
