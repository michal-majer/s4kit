/**
 * Playwright Global Teardown
 *
 * Cleans up test data after E2E tests complete.
 * Deletes all test organizations (and cascades to systems, services, etc.)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { or, like, ne, and } from 'drizzle-orm';
import { organizations } from '@s4kit/shared/db/schema';

// Main s4kit organization ID that should never be deleted
const PROTECTED_ORG_ID = '00000000-0000-4000-8000-000000000001';

async function globalTeardown() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit';

  console.log('\n🧹 E2E Cleanup: Removing test data...');

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Delete all organizations except the protected one
    // This will cascade delete: systems, instances, systemServices, instanceServices, apiKeys, etc.
    const deleted = await db
      .delete(organizations)
      .where(
        and(
          ne(organizations.id, PROTECTED_ORG_ID),
          or(
            like(organizations.name, 'Test Org%'),
            like(organizations.name, "E2E Test User's Organization%"),
            like(organizations.name, '%E2E%'),
            like(organizations.name, '%test%')
          )
        )
      )
      .returning({ id: organizations.id, name: organizations.name });

    if (deleted.length > 0) {
      console.log(`   ✓ Deleted ${deleted.length} test organization(s)`);
    } else {
      console.log('   ✓ No test organizations to clean up');
    }
  } catch (error) {
    console.error('   ✗ Cleanup failed:', error);
  } finally {
    await client.end();
  }

  console.log('🧹 E2E Cleanup complete\n');
}

export default globalTeardown;
