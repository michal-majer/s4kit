import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql, eq, and, or, desc, asc, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema.ts';

// Re-export drizzle utilities
export { sql, eq, and, or, desc, asc, inArray };

export type DbClient = PostgresJsDatabase<typeof schema>;

export interface DbConfig {
  connectionString: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
}

/**
 * Creates a Drizzle database client with the shared schema.
 *
 * @param config Database configuration
 * @returns Object containing the db client and cleanup function
 */
export function createDbClient(config: DbConfig): { db: DbClient; close: () => Promise<void> } {
  const connectionString = config.connectionString;

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
