/**
 * Authentication test helpers for S4Kit backend tests
 *
 * Creates test users with sessions for authenticated API requests.
 * Handles the better-auth session format.
 */

import { db, organizations } from '../../src/db';
import { users, sessions, members, accounts } from '../../src/db/auth-schema';
import { trackOrganization, trackUser } from '../setup';
import type { UserRole } from '../../src/middleware/session-auth';

export interface TestUserContext {
  userId: string;
  organizationId: string;
  sessionToken: string;
  role: UserRole;
  headers: Record<string, string>;
}

/**
 * Create a test user with a session and organization membership
 *
 * @param role - The role to assign in the organization (owner, admin, developer)
 * @param existingOrgId - Optional: join an existing organization instead of creating new
 * @returns User context with headers ready for API requests
 */
export async function createTestUser(
  role: UserRole = 'owner',
  existingOrgId?: string
): Promise<TestUserContext> {
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();
  const email = `test-${userId.slice(0, 8)}@example.com`;

  // Create or use existing organization
  let orgId: string;
  if (existingOrgId) {
    orgId = existingOrgId;
  } else {
    orgId = crypto.randomUUID();
    await db.insert(organizations).values({
      id: orgId,
      name: `Test Org ${orgId.slice(0, 8)}`,
    });
    trackOrganization(orgId);
  }

  // Create user
  await db.insert(users).values({
    id: userId,
    email,
    name: `Test User ${userId.slice(0, 8)}`,
    emailVerified: true,
  });
  trackUser(userId);

  // Create credential account (better-auth format)
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: 'credential',
    password: 'hashed_test_password', // Not used in tests, just for schema compliance
  });

  // Create session with active organization
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    token: sessionToken,
    expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
    activeOrganizationId: orgId,
  });

  // Create organization membership
  await db.insert(members).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role,
  });

  return {
    userId,
    organizationId: orgId,
    sessionToken,
    role,
    headers: {
      Cookie: `better-auth.session_token=${sessionToken}`,
      'X-Organization-Id': orgId,
    },
  };
}

/**
 * Create a second user in an existing organization with a different role
 * Useful for testing permission boundaries
 */
export async function createUserInOrg(
  organizationId: string,
  role: UserRole
): Promise<TestUserContext> {
  return createTestUser(role, organizationId);
}

/**
 * Create two isolated users in separate organizations
 * Useful for tenant isolation tests
 */
export async function createIsolatedUsers(): Promise<{
  userA: TestUserContext;
  userB: TestUserContext;
}> {
  const userA = await createTestUser('owner');
  const userB = await createTestUser('owner');

  return { userA, userB };
}

/**
 * Create users with different roles in the same organization
 * Useful for RBAC tests
 */
export async function createRoleTestUsers(): Promise<{
  owner: TestUserContext;
  admin: TestUserContext;
  developer: TestUserContext;
}> {
  // Create the organization with owner
  const owner = await createTestUser('owner');

  // Add admin and developer to the same org
  const admin = await createUserInOrg(owner.organizationId, 'admin');
  const developer = await createUserInOrg(owner.organizationId, 'developer');

  return { owner, admin, developer };
}

/**
 * Create headers without authentication
 * Useful for testing unauthenticated access
 */
export function unauthenticatedHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Create headers with invalid session token
 * Useful for testing expired/invalid session handling
 */
export function invalidSessionHeaders(): Record<string, string> {
  return {
    Cookie: 'better-auth.session_token=invalid_token_12345',
    'X-Organization-Id': crypto.randomUUID(),
  };
}
