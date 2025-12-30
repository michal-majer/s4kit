/**
 * Playwright Global Setup
 *
 * Cleans up any leftover test data before E2E tests start.
 * This ensures tests start with a clean slate.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { or, like, ne, and } from 'drizzle-orm';
import { organizations } from '@s4kit/shared/db/schema';

// Main s4kit organization ID that should never be deleted
const PROTECTED_ORG_ID = '00000000-0000-4000-8000-000000000001';

async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit';

  console.log('\n🧹 E2E Setup: Cleaning leftover test data...');

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Delete any leftover test organizations from previous runs
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
      .returning({ id: organizations.id });

    if (deleted.length > 0) {
      console.log(`   ✓ Cleaned up ${deleted.length} leftover test organization(s)`);
    } else {
      console.log('   ✓ No leftover test data found');
    }
  } catch (error) {
    console.error('   ✗ Setup cleanup failed:', error);
    // Don't throw - allow tests to continue even if cleanup fails
  } finally {
    await client.end();
  }

  console.log('🧹 E2E Setup complete\n');
}

export default globalSetup;
