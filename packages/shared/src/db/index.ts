import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, eq, and, or, desc, asc, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema.ts';
import { getDatabaseUrl } from '../services/cf-env-parser.ts';

// Re-export drizzle utilities
export { sql, eq, and, or, desc, asc, inArray };

export type DbClient = PostgresJsDatabase<typeof schema>;

export interface DbConfig {
  /**
   * PostgreSQL connection string. If not provided, will attempt to read from:
   * 1. DATABASE_URL environment variable
   * 2. VCAP_SERVICES (Cloud Foundry service bindings)
   */
  connectionString?: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
}

/**
 * Creates a Drizzle database client with the shared schema.
 *
 * @param config Database configuration. If connectionString is not provided,
 *               it will be resolved from DATABASE_URL or VCAP_SERVICES.
 * @returns Object containing the db client and cleanup function
 */
export function createDbClient(config: DbConfig = {}): { db: DbClient; close: () => Promise<void> } {
  const connectionString = config.connectionString || getDatabaseUrl();

  if (!connectionString) {
    throw new Error('Database connection string is required');
  }

  const queryClient = postgres(connectionString, {
    max: config.max ?? 10,
    idle_timeout: config.idleTimeout ?? 20,
    connect_timeout: config.connectTimeout ?? 10,
  });

  const db = drizzle(queryClient, { schema });

  return {
    db,
    close: async () => {
      await queryClient.end();
    },
  };
}

// Re-export schema for convenience
export * from './schema.ts';
