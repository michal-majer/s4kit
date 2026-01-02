import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@s4kit/shared/db/schema';
import * as authSchema from './auth-schema';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection optimized for Railway/cloud environments
const queryClient = postgres(databaseUrl, {
  max: 5,                    // Reduced for single-instance Railway deployments
  idle_timeout: 30,          // Keep connections alive longer (Railway has connection overhead)
  connect_timeout: 10,       // Fail fast on connection issues
  prepare: false,            // Disable prepared statements (works better with connection poolers)
  connection: {
    application_name: 's4kit-backend',
  },
});

// Combine all schemas
const allSchemas = { ...schema, ...authSchema };

// Create drizzle instance with schema
export const db = drizzle(queryClient, { schema: allSchemas });

// Export schemas for use in other files
export * from '@s4kit/shared/db/schema';
export * from './auth-schema';

// Graceful shutdown
process.on('SIGINT', async () => {
  await queryClient.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await queryClient.end();
  process.exit(0);
});
