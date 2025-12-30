/**
 * E2E Test User Seeding Script
 *
 * Creates the test user for E2E tests in selfhost mode.
 * Run this before running E2E tests in selfhost mode:
 *
 *   bun run e2e/seed-test-user.ts
 *
 * For SaaS mode, tests will auto-signup, so this script is not needed.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
import { TEST_USER } from './fixtures';

async function seedTestUser() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit';

  console.log('Seeding E2E test user...');
  console.log(`Email: ${TEST_USER.email}`);

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient);

  try {
    // Check if user already exists
    const existingUser = await db.execute(sql`
      SELECT id FROM users WHERE email = ${TEST_USER.email}
    `);

    if (existingUser.length > 0) {
      console.log('Test user already exists. Updating password and verifying email...');
      const userId = existingUser[0].id as string;
      const hashedPassword = await hashPassword(TEST_USER.password);

      // Update the password
      await db.execute(sql`
        UPDATE accounts SET password = ${hashedPassword}
        WHERE user_id = ${userId} AND provider_id = 'credential'
      `);

      // Ensure email is verified
      await db.execute(sql`
        UPDATE users SET email_verified = true WHERE id = ${userId}
      `);

      console.log('Password updated and email verified.');
      return;
    }

    // Create user
    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(TEST_USER.password);

    console.log('Creating test user...');
    await db.execute(sql`
      INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
      VALUES (${userId}, ${TEST_USER.name}, ${TEST_USER.email}, true, NOW(), NOW())
    `);

    // Create credential account
    await db.execute(sql`
      INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${userId}, 'credential', ${hashedPassword}, NOW(), NOW())
    `);

    // Create organization
    const orgId = crypto.randomUUID();
    const orgName = `${TEST_USER.name}'s Organization`;

    console.log(`Creating organization: ${orgName}`);
    await db.execute(sql`
      INSERT INTO organizations (id, name, created_at)
      VALUES (${orgId}, ${orgName}, NOW())
    `);

    // Add user as owner
    await db.execute(sql`
      INSERT INTO members (id, organization_id, user_id, role, created_at)
      VALUES (${crypto.randomUUID()}, ${orgId}, ${userId}, 'owner', NOW())
    `);

    console.log('');
    console.log('E2E test user created successfully!');
    console.log(`  Email: ${TEST_USER.email}`);
    console.log(`  Password: ${TEST_USER.password}`);
    console.log(`  Organization ID: ${orgId}`);
    console.log('');
    console.log('You can now run E2E tests.');

  } finally {
    await queryClient.end();
  }
}

// Run if called directly
seedTestUser()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to seed test user:', err);
    process.exit(1);
  });
