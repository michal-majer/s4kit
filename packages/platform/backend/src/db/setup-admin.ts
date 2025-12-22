import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
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
    // Check if admin user already exists
    const existingUser = await db.execute(sql`
      SELECT id FROM users WHERE email = ${adminEmail}
    `);

    if (existingUser.length > 0) {
      console.log(`Admin user with email ${adminEmail} already exists. Skipping.`);
      return;
    }

    // Find or create organization
    let organizationId: string;

    // First, check if any organization exists
    const existingOrg = await db.execute(sql`
      SELECT id, name FROM organizations LIMIT 1
    `);

    if (existingOrg.length > 0) {
      // Use existing organization
      organizationId = existingOrg[0].id as string;
      console.log(`Using existing organization: ${existingOrg[0].name}`);
    } else {
      // Create new organization with random UUID
      organizationId = crypto.randomUUID();
      console.log(`Creating organization: ${organizationName}`);
      await db.execute(sql`
        INSERT INTO organizations (id, name, created_at)
        VALUES (${organizationId}, ${organizationName}, NOW())
      `);
    }

    // Create admin user
    console.log(`Creating admin user: ${adminEmail}`);
    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(adminPassword);

    // Insert user
    await db.execute(sql`
      INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
      VALUES (${userId}, ${adminName}, ${adminEmail}, true, NOW(), NOW())
    `);

    // Insert credential account (for email/password login)
    await db.execute(sql`
      INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, ${userId}, 'credential', ${hashedPassword}, NOW(), NOW())
    `);

    // Add user as owner of the organization
    await db.execute(sql`
      INSERT INTO members (id, organization_id, user_id, role, created_at)
      VALUES (${crypto.randomUUID()}, ${organizationId}, ${userId}, 'owner', NOW())
    `);

    console.log('Admin user created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Organization ID: ${organizationId}`);
    console.log(`Role: owner`);
    console.log('');
    console.log('You can now log in to the dashboard with these credentials.');

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
