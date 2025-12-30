import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@s4kit/shared/db/schema';
import * as authSchema from './auth-schema';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection
// Using connection pooling with max 10 connections
const queryClient = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
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
