import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '@s4kit/shared/db/schema';
import { getApisForSystemType, type SapApiDefinition } from '../scripts/sap-apis-generated';

// Demo organization ID - must be a valid UUID format
const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';

// System types that get predefined services (each with their own API catalog)
const systemTypesWithServices: ('s4_public' | 's4_private')[] = ['s4_public', 's4_private'];

export async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient, { schema });

  console.log('Seeding database...');

  try {
    // Create demo organization if it doesn't exist
    console.log('Creating demo organization...');
    await db.execute(sql`
      INSERT INTO organizations (id, name, created_at)
      VALUES (${DEMO_ORG_ID}, 'Demo Organization', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed predefined services - each system type gets its own API catalog
    console.log('Seeding predefined services...');

    let totalSeeded = 0;

    for (const systemType of systemTypesWithServices) {
      const apis = getApisForSystemType(systemType);
      console.log(`  Seeding ${apis.length} APIs for ${systemType}...`);

      for (const service of apis) {
        await db.execute(sql`
          INSERT INTO predefined_services (system_type, name, alias, service_path, description, odata_version, default_entities, created_at)
          VALUES (
            ${systemType},
            ${service.name},
            ${service.alias},
            ${service.servicePath},
            ${service.description},
            ${service.odataVersion},
            ${JSON.stringify(service.defaultEntities)}::jsonb,
            NOW()
          )
          ON CONFLICT (system_type, alias) DO NOTHING
        `);
      }

      totalSeeded += apis.length;
    }

    console.log(`Seeded ${totalSeeded} predefined services.`);
  } finally {
    await queryClient.end();
  }
}

export async function refreshPredefinedServices() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient, { schema });

  console.log('Refreshing predefined services (safe for production)...');

  try {
    let totalUpdated = 0;
    let totalInserted = 0;

    for (const systemType of systemTypesWithServices) {
      const apis = getApisForSystemType(systemType);
      console.log(`  Processing ${apis.length} APIs for ${systemType}...`);

      for (const service of apis) {
        // Use upsert: update service_path if exists, insert if not
        const result = await db.execute(sql`
          INSERT INTO predefined_services (system_type, name, alias, service_path, description, odata_version, default_entities, created_at)
          VALUES (
            ${systemType},
            ${service.name},
            ${service.alias},
            ${service.servicePath},
            ${service.description},
            ${service.odataVersion},
            ${JSON.stringify(service.defaultEntities)}::jsonb,
            NOW()
          )
          ON CONFLICT (system_type, alias) DO UPDATE SET
            name = EXCLUDED.name,
            service_path = EXCLUDED.service_path,
            description = EXCLUDED.description,
            odata_version = EXCLUDED.odata_version,
            default_entities = EXCLUDED.default_entities
          RETURNING (xmax = 0) AS inserted
        `);

        // xmax = 0 means insert, otherwise update
        if (result.length > 0 && (result[0] as any).inserted) {
          totalInserted++;
        } else {
          totalUpdated++;
        }
      }
    }

    console.log(`Refreshed predefined services: ${totalInserted} inserted, ${totalUpdated} updated.`);
  } finally {
    await queryClient.end();
  }
}

export async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient, { schema });

  console.log('Resetting database...');

  try {
    // Truncate all tables in correct order (respecting foreign keys)
    await db.execute(sql`TRUNCATE TABLE request_logs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE api_key_access CASCADE`);
    await db.execute(sql`TRUNCATE TABLE api_keys CASCADE`);
    await db.execute(sql`TRUNCATE TABLE instance_services CASCADE`);
    await db.execute(sql`TRUNCATE TABLE instances CASCADE`);
    await db.execute(sql`TRUNCATE TABLE system_services CASCADE`);
    await db.execute(sql`TRUNCATE TABLE systems CASCADE`);
    await db.execute(sql`TRUNCATE TABLE predefined_services CASCADE`);
    await db.execute(sql`TRUNCATE TABLE organizations CASCADE`);
    console.log('Database reset complete.');
  } finally {
    await queryClient.end();
  }
}

// Run if called directly
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--reset')) {
    // Prevent accidental reset in production
    if (process.env.NODE_ENV === 'production') {
      console.error('ERROR: --reset is not allowed in production!');
      console.error('This would delete all data including systems, instances, API keys, and logs.');
      process.exit(1);
    }

    resetDatabase()
      .then(() => seedDatabase())
      .then(() => {
        console.log('Reset and seed complete');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
      });
  } else if (args.includes('--refresh-apis')) {
    // Safe for production - only updates predefined_services
    refreshPredefinedServices()
      .then(() => {
        console.log('API catalog refresh complete');
        process.exit(0);
      })
      .catch((err) => {
        console.error('API refresh failed:', err);
        process.exit(1);
      });
  } else {
    seedDatabase()
      .then(() => {
        console.log('Seed complete');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
      });
  }
}
