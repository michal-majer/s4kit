import { createMiddleware } from 'hono/factory';
import { auth, type Session, type User } from '../auth';
import { db, members } from '../db';
import { eq, and } from 'drizzle-orm';
import { redis } from '../cache/redis';

export type UserRole = 'owner' | 'admin' | 'developer';

// Cache TTL for user memberships (5 minutes)
const MEMBERSHIP_CACHE_TTL = 300;

interface CachedMembership {
  organizationId: string;
  role: UserRole;
}

/**
 * Get user memberships with Redis caching
 */
async function getCachedMemberships(userId: string): Promise<CachedMembership[]> {
  const cacheKey = `user:${userId}:memberships`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Redis error - fall through to DB
  }

  // Fetch from database
  const memberships = await db.query.members.findMany({
    where: eq(members.userId, userId),
    columns: {
      organizationId: true,
      role: true,
    },
  });

  const result = memberships.map((m) => ({
    organizationId: m.organizationId,
    role: m.role as UserRole,
  }));

  // Cache the result
  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', MEMBERSHIP_CACHE_TTL);
  } catch {
    // Redis error - ignore
  }

  return result;
}

/**
 * Invalidate user membership cache (call after membership changes)
 */
export async function invalidateMembershipCache(userId: string): Promise<void> {
  try {
    await redis.del(`user:${userId}:memberships`);
  } catch {
    // Redis error - ignore
  }
}

export type SessionVariables = {
  user: User | null;
  session: Session['session'] | null;
  organizationId: string | null;
  userRole: UserRole | null;
};

// Permission definitions per role
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['*'],
  admin: [
    'organization:read',
    // Note: organization:update is owner-only (for name changes, deletion, etc.)
    'member:read',
    'member:create',
    'member:update',
    'member:delete',
    'invitation:read',
    'invitation:create',
    'invitation:delete',
    'system:read',
    'system:create',
    'system:update',
    'system:delete',
    'instance:read',
    'instance:create',
    'instance:update',
    'instance:delete',
    'service:read',
    'service:create',
    'service:update',
    'service:delete',
    'apiKey:read',
    'apiKey:create',
    'apiKey:update',
    'apiKey:delete',
    'logs:read',
  ],
  developer: [
    'organization:read',
    'member:read',
    'system:read',
    'system:create',
    'system:update',
    'instance:read',
    'instance:create',
    'instance:update',
    'instance:delete',
    'service:read',
    'service:create',
    'service:update',
    'service:delete',
    'apiKey:read',
    'logs:read',
  ],
};

/**
 * Extract and validate session from request
 * Sets user, session, organizationId, and userRole in context
 */
export const sessionMiddleware = createMiddleware<{ Variables: SessionVariables }>(
  async (c, next) => {
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });

      if (!session) {
        c.set('user', null);
        c.set('session', null);
        c.set('organizationId', null);
        c.set('userRole', null);
        return next();
      }

      c.set('user', session.user);
      c.set('session', session.session);

      // Get active organization from header or session
      let orgId = c.req.header('X-Organization-Id') || session.session.activeOrganizationId;

      // Fetch memberships once (with Redis caching)
      const userMemberships = await getCachedMemberships(session.user.id);

      // If no org selected, auto-select if user belongs to exactly one organization
      if (!orgId) {
        if (userMemberships.length === 1 && userMemberships[0]) {
          // User belongs to exactly one org, auto-select it
          orgId = userMemberships[0].organizationId;
          c.set('organizationId', orgId);
          c.set('userRole', userMemberships[0].role);
          return next();
        } else if (userMemberships.length > 1) {
          // User belongs to multiple orgs, they need to select one
          c.set('organizationId', null);
          c.set('userRole', null);
          return next();
        }
      }

      c.set('organizationId', orgId || null);

      // Get user role from cached memberships (no additional DB query)
      if (orgId) {
        const membership = userMemberships.find((m) => m.organizationId === orgId);
        c.set('userRole', membership?.role || null);
      } else {
        c.set('userRole', null);
      }

      return next();
    } catch (error) {
      console.error('[Session Middleware] Error:', error);
      c.set('user', null);
      c.set('session', null);
      c.set('organizationId', null);
      c.set('userRole', null);
      return next();
    }
  }
);

/**
 * Require authenticated user with valid organization
 */
export const adminAuthMiddleware = createMiddleware<{ Variables: SessionVariables }>(
  async (c, next) => {
    const user = c.get('user');
    const organizationId = c.get('organizationId');
    const userRole = c.get('userRole');

    if (!user) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    if (!organizationId) {
      return c.json({ error: 'No organization selected' }, 400);
    }

    if (!userRole) {
      return c.json({ error: 'You are not a member of this organization' }, 403);
    }

    return next();
  }
);

/**
 * Check if role has a specific permission
 */
function hasPermission(role: UserRole | null, permission: string): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role];

  // Check for wildcard
  if (permissions.includes('*')) return true;

  // Check exact match
  if (permissions.includes(permission)) return true;

  // Check wildcard for resource (e.g., "system:*" matches "system:read")
  const [resource] = permission.split(':');
  if (permissions.includes(`${resource}:*`)) return true;

  return false;
}

/**
 * Role-based access control middleware factory
 * Usage: app.get('/path', requireRole('admin', 'owner'), handler)
 */
export const requireRole = (...roles: UserRole[]) => {
  return createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
    const userRole = c.get('userRole');

    if (!userRole || !roles.includes(userRole)) {
      return c.json({ error: 'Forbidden - Insufficient permissions' }, 403);
    }

    return next();
  });
};

/**
 * Permission-based middleware factory
 * Usage: app.post('/path', requirePermission('apiKey:create'), handler)
 */
export const requirePermission = (permission: string) => {
  return createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
    const userRole = c.get('userRole');

    if (!hasPermission(userRole, permission)) {
      return c.json({ error: `Forbidden - Missing permission: ${permission}` }, 403);
    }

    return next();
  });
};

/**
 * Check permission in handler (for conditional logic)
 */
export function checkPermission(role: UserRole | null, permission: string): boolean {
  return hasPermission(role, permission);
}

/**
 * Simple auth check - only requires user to be logged in
 * Does NOT require organization to be selected (useful for onboarding)
 */
export const requireAuth = createMiddleware<{ Variables: SessionVariables }>(
  async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized - Please log in' }, 401);
    }

    return next();
  }
);
