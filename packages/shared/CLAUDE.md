# S4Kit Shared - AI Assistant Guide

## Package Overview

The shared package (`@s4kit/shared`) contains common code used by both the admin backend and proxy service. It provides the database schema, database client, Redis client, encryption service, and shared types.

## Architecture

```
@s4kit/shared
├── db/           # Database schema + client
├── cache/        # Redis client
├── services/     # Encryption service
└── types/        # Shared TypeScript types
```

## File Structure

```
src/
├── index.ts              # Main exports
├── types.ts              # Shared TypeScript types
├── db/
│   ├── index.ts          # Database client factory
│   └── schema.ts         # Drizzle ORM schema definition
├── cache/
│   └── index.ts          # Redis client factory
└── services/
    ├── index.ts          # Service exports
    └── encryption.ts     # libsodium encryption wrapper
```

## Exports

The package provides multiple entry points:

```typescript
// Main export - everything
import { createDbClient, createRedisClient, encryption, ... } from '@s4kit/shared';

// Database only
import { createDbClient, type DbClient } from '@s4kit/shared/db';
import * as schema from '@s4kit/shared/db/schema';

// Cache only
import { createRedisClient } from '@s4kit/shared/cache';

// Services only
import { encryption } from '@s4kit/shared/services';

// Types only
import type { ... } from '@s4kit/shared/types';
```

## Database Schema

The schema defines all core tables for the S4Kit platform:

### Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant organizations |
| `systems` | SAP systems (e.g., "ERP", "CRM") |
| `instances` | System environments (dev, quality, prod) |
| `predefinedServices` | Seed data for S/4HANA APIs |
| `systemServices` | Services available on a system |
| `instanceServices` | Service-instance links with auth override |
| `apiKeys` | Stripe-like secure API keys |
| `apiKeyAccess` | API key → instance service permissions |
| `requestLogs` | Request audit trail |

### Enums

```typescript
// System types
systemTypeEnum: 's4_public' | 's4_private' | 'btp' | 'other'

// Instance environments
instanceEnvironmentEnum: 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production'

// Authentication types
authTypeEnum: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom'

// Log levels
logLevelEnum: 'minimal' | 'standard' | 'extended'
```

### Key Relationships

```
Organization
    └── System (1:N)
           └── Instance (1:N) - each env (dev/prod)
           └── SystemService (1:N)
                  └── InstanceService (N:M link)
                         └── ApiKeyAccess (permissions)
```

## Database Client

Factory function to create a Drizzle client:

```typescript
import { createDbClient } from '@s4kit/shared/db';

const { db, close } = createDbClient({
  connectionString: process.env.DATABASE_URL,
  max: 10,           // Max pool connections
  idleTimeout: 20,   // Connection idle timeout (seconds)
});

// Use db for queries
const systems = await db.select().from(schema.systems);

// Close on shutdown
await close();
```

## Redis Client

Factory function to create an ioredis client:

```typescript
import { createRedisClient } from '@s4kit/shared/cache';

const redis = createRedisClient({
  url: process.env.REDIS_URL,
  lazyConnect: true,  // Don't connect immediately
});

// Use redis for caching
await redis.set('key', 'value');
const value = await redis.get('key');

// Disconnect on shutdown
redis.disconnect();
```

## Encryption Service

libsodium wrapper for encrypting/decrypting sensitive data:

```typescript
import { encryption } from '@s4kit/shared/services';

// Initialize (required before use)
await encryption.initialize();

// Encrypt sensitive data (returns base64 string)
const encrypted = encryption.encrypt('sensitive-password');

// Decrypt data
const decrypted = encryption.decrypt(encrypted);
```

**Note:** Requires `ENCRYPTION_KEY` environment variable (32-byte hex string).

## Usage in Consumers

### Admin Backend
```typescript
// packages/platform/backend/src/db/index.ts
import { createDbClient } from '@s4kit/shared/db';
import * as schema from '@s4kit/shared/db/schema';

export const { db, close } = createDbClient({
  connectionString: process.env.DATABASE_URL!,
});

export { schema };
```

### Proxy Service
```typescript
// packages/platform/proxy/src/index.ts
import { createDbClient } from '@s4kit/shared/db';
import { createRedisClient } from '@s4kit/shared/cache';

export const { db, close: closeDb } = createDbClient({
  connectionString: process.env.DATABASE_URL!,
});

export const redis = createRedisClient({
  url: process.env.REDIS_URL,
});
```

## Common Tasks

### Adding a new table
1. Edit `src/db/schema.ts`
2. Define table using Drizzle's `pgTable()`
3. Export the table
4. Run migrations in backend: `bun run db:generate && bun run db:migrate`

### Adding a new enum
1. Define enum using `pgEnum()` in `schema.ts`
2. Use in table definitions
3. Export for consumers

### Adding a new shared type
1. Add type to `src/types.ts`
2. Export from `src/index.ts` if needed

### Adding a new service
1. Create file in `src/services/`
2. Export from `src/services/index.ts`
3. Re-export from `src/index.ts`

## Code Conventions

### Schema Naming
- snake_case for table/column names in database
- camelCase for TypeScript property names (Drizzle handles conversion)

### Table Definition Pattern
```typescript
export const tableName = pgTable('table_name', {
  id: uuid('id').defaultRandom().primaryKey(),
  // ... columns
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Constraints
  uniqueConstraint: unique().on(table.column1, table.column2),
}));
```

### UUID Primary Keys
All tables use UUID primary keys with `defaultRandom()`.

### Timestamps
- `createdAt` - Always set with `defaultNow()`
- `updatedAt` - Set with `defaultNow()`, updated manually

## Dependencies

| Package | Purpose |
|---------|---------|
| drizzle-orm | Type-safe ORM |
| postgres | PostgreSQL driver |
| ioredis | Redis client |
| libsodium-wrappers | Encryption |

## Environment Variables

Required by consumers:
```env
DATABASE_URL=postgresql://user:pass@host:port/database
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte hex string>
```

## Important Notes

- This package is internal (`"private": true`) - not published to npm
- Schema changes require migrations in the backend package
- The encryption service must be initialized before use
- Database client creates a connection pool - always close on shutdown
