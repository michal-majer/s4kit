import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@s4kit/shared/db/schema';
import * as authSchema from './auth-schema';
import { config } from '../config/mode';
import { hashPassword } from 'better-auth/crypto';

export async function setupAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin';
  const organizationName = process.env.ORGANIZATION_NAME || 'Default Organization';

  if (!adminEmail || !adminPassword) {
    console.log('ADMIN_EMAIL and ADMIN_PASSWORD are not set. Skipping admin setup.');
    console.log('To create an admin user, set these environment variables and run this script again.');
    return;
  }

  if (adminPassword.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters long');
  }

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient, { schema: { ...schema, ...authSchema } });

  console.log('Setting up admin user...');
  console.log(`Mode: ${config.mode}`);
  console.log(`Organization: ${organizationName}`);

  try {
    // Find or create organization
    let organizationId: string;

    const existingOrg = await db.execute(sql`
      SELECT id, name FROM organizations LIMIT 1
    `);

    if (existingOrg.length > 0 && existingOrg[0]) {
      organizationId = existingOrg[0].id as string;
      console.log(`Using existing organization: ${existingOrg[0].name}`);
    } else {
      organizationId = crypto.randomUUID();
      console.log(`Creating organization: ${organizationName}`);
      await db.execute(sql`
        INSERT INTO organizations (id, name, created_at)
        VALUES (${organizationId}, ${organizationName}, NOW())
      `);
    }

    // Check if admin user already exists
    const existingUser = await db.execute(sql`
      SELECT id FROM users WHERE email = ${adminEmail}
    `);

    let userId: string;

    if (existingUser.length > 0 && existingUser[0]) {
      userId = existingUser[0].id as string;
      console.log(`Admin user ${adminEmail} already exists (${userId})`);

      // Check if user has organization membership
      const existingMember = await db.execute(sql`
        SELECT id FROM members WHERE user_id = ${userId}
      `);

      if (existingMember.length > 0) {
        console.log('User already has organization membership. Setup complete.');
        return;
      }

      console.log('User has no organization membership. Adding to organization...');
    } else {
      // Create admin user
      console.log(`Creating admin user: ${adminEmail}`);
      userId = crypto.randomUUID();
      const hashedPassword = await hashPassword(adminPassword);

      await db.execute(sql`
        INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
        VALUES (${userId}, ${adminName}, ${adminEmail}, true, NOW(), NOW())
      `);

      await db.execute(sql`
        INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${userId}, ${userId}, 'credential', ${hashedPassword}, NOW(), NOW())
      `);
    }

    // Add user as owner of the organization
    await db.execute(sql`
      INSERT INTO members (id, organization_id, user_id, role, created_at)
      VALUES (${crypto.randomUUID()}, ${organizationId}, ${userId}, 'owner', NOW())
    `);

    console.log('Admin setup complete!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Organization ID: ${organizationId}`);
    console.log(`Role: owner`);
    console.log('');
    console.log('You can now log in to the dashboard.');

  } finally {
    await queryClient.end();
  }
}

// Run if called directly
if (import.meta.main) {
  setupAdmin()
    .then(() => {
      console.log('Setup complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
}
