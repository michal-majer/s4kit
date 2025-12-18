# Database Setup

This directory contains the database configuration and schema for the S4Kit platform.

## Structure

- `index.ts` - Database connection and Drizzle instance
- `schema.ts` - Drizzle schema definitions
- `migrate.ts` - Migration runner script

## Connection Configuration

The database connection uses connection pooling with the following settings:
- **Max connections**: 10
- **Idle timeout**: 20 seconds
- **Connect timeout**: 10 seconds

These settings are optimized for development. For production, adjust based on your workload.

## Usage Example

```typescript
import { db, organizations } from './db'
import { eq } from 'drizzle-orm'

// Query example
const orgs = await db.select().from(organizations)

// Insert example
const [newOrg] = await db.insert(organizations)
  .values({ name: 'My Organization' })
  .returning()

// Update example
await db.update(organizations)
  .set({ name: 'Updated Name' })
  .where(eq(organizations.id, orgId))
```

## Best Practices

1. **Always use transactions** for operations that modify multiple tables
2. **Use prepared statements** for queries with user input (Drizzle handles this automatically)
3. **Close connections gracefully** - The connection pool handles this automatically
4. **Monitor connection pool** - Adjust max connections based on your application's needs

