import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Prevent accidental recreation in production
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: db:recreate is not allowed in production!');
  console.error('This would DROP ALL TABLES and recreate the database from scratch.');
  process.exit(1);
}

async function recreateDatabase() {
  const sqlClient = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(sqlClient);

  console.log('Recreating database...');

  try {
    // Drop all tables in the public schema (CASCADE to handle foreign keys)
    console.log('Dropping all tables...');
    const result = await sqlClient`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;

    if (result.length > 0) {
      // Drop each table individually for safety
      for (const row of result) {
        const tableName = (row as any).tablename;
        await sqlClient.unsafe(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      }
      console.log(`Dropped ${result.length} table(s).`);
    } else {
      console.log('No tables to drop.');
    }

    // Drop all enums
    console.log('Dropping all enums...');
    const enumResult = await sqlClient`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `;

    if (enumResult.length > 0) {
      for (const row of enumResult) {
        const enumName = (row as any).typname;
        await sqlClient.unsafe(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
      }
      console.log(`Dropped ${enumResult.length} enum(s).`);
    } else {
      console.log('No enums to drop.');
    }

    // Clear the migrations journal (if it exists)
    console.log('Clearing migrations journal...');
    await sqlClient`
      DROP TABLE IF EXISTS __drizzle_migrations CASCADE
    `.catch(() => {
      // Table might not exist, that's okay
      console.log('Migrations journal table does not exist (expected on first run).');
    });

    // Run migrations from scratch
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed!');

    console.log('Database recreated successfully!');
  } catch (error) {
    console.error('Failed to recreate database:', error);
    throw error;
  } finally {
    await sqlClient.end();
  }
}

recreateDatabase().catch((error) => {
  console.error('Recreation failed:', error);
  process.exit(1);
});