/**
 * Global test setup for S4Kit backend tests
 *
 * Provides:
 * - Database connection verification
 * - Global cleanup after each test
 * - Graceful shutdown on test completion
 */

import { beforeAll, afterEach, afterAll } from 'bun:test';
import { db, organizations, systems, instances, systemServices, instanceServices, apiKeys, apiKeyAccess, requestLogs } from '../src/db';
import { users, sessions, members, accounts, verifications, invitations } from '../src/db/auth-schema';
import { sql } from 'drizzle-orm';

// Track test data for cleanup
export const testDataTracker = {
  organizationIds: new Set<string>(),
  userIds: new Set<string>(),
};

/**
 * Register an organization ID for cleanup after test
 */
export function trackOrganization(id: string) {
  testDataTracker.organizationIds.add(id);
}

/**
 * Register a user ID for cleanup after test
 */
export function trackUser(id: string) {
  testDataTracker.userIds.add(id);
}

beforeAll(async () => {
  // Verify database connection
  try {
    await db.execute(sql`SELECT 1`);
    console.log('[Test Setup] Database connected');
  } catch (error) {
    console.error('[Test Setup] Database connection failed:', error);
    throw new Error('Cannot run tests without database connection. Make sure PostgreSQL is running.');
  }
});

afterEach(async () => {
  // Clean up test data in reverse dependency order
  // This ensures foreign key constraints are satisfied

  try {
    // First, delete data that depends on tracked organizations
    for (const orgId of testDataTracker.organizationIds) {
      // Request logs depend on API keys which depend on organizations
      await db.delete(requestLogs).where(
        sql`${requestLogs.apiKeyId} IN (
          SELECT id FROM api_keys WHERE organization_id = ${orgId}
        )`
      );

      // API key access depends on API keys
      await db.delete(apiKeyAccess).where(
        sql`${apiKeyAccess.apiKeyId} IN (
          SELECT id FROM api_keys WHERE organization_id = ${orgId}
        )`
      );

      // API keys
      await db.delete(apiKeys).where(
        sql`${apiKeys.organizationId} = ${orgId}`
      );

      // Instance services depend on instances and system services
      await db.delete(instanceServices).where(
        sql`${instanceServices.instanceId} IN (
          SELECT i.id FROM instances i
          JOIN systems s ON i.system_id = s.id
          WHERE s.organization_id = ${orgId}
        )`
      );

      // System services depend on systems
      await db.delete(systemServices).where(
        sql`${systemServices.systemId} IN (
          SELECT id FROM systems WHERE organization_id = ${orgId}
        )`
      );

      // Instances depend on systems
      await db.delete(instances).where(
        sql`${instances.systemId} IN (
          SELECT id FROM systems WHERE organization_id = ${orgId}
        )`
      );

      // Systems
      await db.delete(systems).where(
        sql`${systems.organizationId} = ${orgId}`
      );

      // Members and invitations
      await db.delete(members).where(
        sql`${members.organizationId} = ${orgId}`
      );

      await db.delete(invitations).where(
        sql`${invitations.organizationId} = ${orgId}`
      );

      // Finally, the organization itself
      await db.delete(organizations).where(
        sql`${organizations.id} = ${orgId}`
      );
    }

    // Clean up tracked users (sessions, accounts, etc.)
    for (const userId of testDataTracker.userIds) {
      await db.delete(sessions).where(
        sql`${sessions.userId} = ${userId}`
      );

      await db.delete(accounts).where(
        sql`${accounts.userId} = ${userId}`
      );

      await db.delete(users).where(
        sql`${users.id} = ${userId}`
      );
    }

    // Clear tracking sets
    testDataTracker.organizationIds.clear();
    testDataTracker.userIds.clear();

  } catch (error) {
    console.error('[Test Cleanup] Error during cleanup:', error);
    // Don't throw - we don't want cleanup failures to mask test failures
  }
});

afterAll(async () => {
  console.log('[Test Setup] Tests completed');
});

// Export db for use in tests
export { db };
