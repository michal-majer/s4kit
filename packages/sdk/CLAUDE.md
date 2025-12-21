# S4Kit SDK - AI Assistant Guide

## Package Overview

The S4Kit SDK (`s4kit`) is a lightweight, type-safe TypeScript client for SAP S/4HANA integration via the S4Kit platform. It provides a clean API for CRUD operations on SAP OData entities.

## Architecture

```
S4Kit (client.ts)
    ├── HttpClient (http-client.ts)  - HTTP requests via ky
    ├── Proxy (proxy.ts)             - Dynamic entity handlers
    └── QueryBuilder (query-builder.ts) - OData query params
```

### Key Design Patterns

**Dynamic Proxy Pattern**: Entity handlers are created dynamically at runtime using JavaScript Proxy. This allows `client.sap.AnyEntity.list()` to work without pre-defining entity types.

```typescript
// proxy.ts creates handlers dynamically
client.sap.A_BusinessPartner.list()  // Works without defining A_BusinessPartner
client.sap.SalesOrder.get('12345')   // Any entity name works
```

**Connection/Service Headers**: The SDK uses custom headers to route requests:
- `X-S4Kit-Connection` - Target SAP instance
- `X-S4Kit-Service` - OData service (optional, auto-resolved)

## File Structure

```
src/
├── index.ts          # Public exports
├── client.ts         # S4Kit main class
├── http-client.ts    # HTTP client wrapper (ky)
├── proxy.ts          # Dynamic entity proxy
├── query-builder.ts  # OData query string builder
├── types.ts          # TypeScript interfaces
├── typed-helpers.ts  # Type-safe helper functions
└── errors.ts         # Error handling
test/
└── integration.test.ts  # Integration tests
examples/
└── usage.ts          # Example code
```

## Development Commands

```bash
bun install           # Install dependencies
bun run dev           # Watch mode (build on change)
bun run build         # Build distribution (CJS + ESM + types)
bun test              # Run tests
bun test --watch      # Watch mode tests
```

## Build Output

The SDK builds to `dist/` with dual format:
- `dist/index.js` - CommonJS
- `dist/index.mjs` - ES Module
- `dist/index.d.ts` - TypeScript declarations

## Core Interfaces

### S4KitConfig
```typescript
interface S4KitConfig {
  apiKey: string;           // Required: Platform API key
  baseUrl?: string;         // Default: https://api.s4kit.com
  connection?: string;      // Default SAP instance alias
  service?: string;         // Default OData service (optional)
}
```

### QueryOptions
```typescript
interface QueryOptions<T = any> {
  select?: Array<keyof T>;  // $select
  filter?: string;          // $filter
  top?: number;             // $top
  skip?: number;            // $skip
  orderBy?: string;         // $orderby
  expand?: string[];        // $expand
  connection?: string;      // Override instance
  service?: string;         // Override service
}
```

### EntityHandler
```typescript
interface EntityHandler<T = any> {
  list(options?: QueryOptions<T>): Promise<T[]>;
  get(id: string | number, options?: QueryOptions<T>): Promise<T>;
  create(data: T, options?: QueryOptions<T>): Promise<T>;
  update(id: string | number, data: Partial<T>, options?: QueryOptions<T>): Promise<T>;
  delete(id: string | number, options?: QueryOptions<T>): Promise<void>;
}
```

## Usage Examples

```typescript
import { S4Kit } from 's4kit';

const client = new S4Kit({
  apiKey: 'sk_live_...',
  connection: 'erp-prod'
});

// List entities with filtering
const partners = await client.sap.A_BusinessPartner.list({
  select: ['BusinessPartner', 'BusinessPartnerName'],
  filter: "BusinessPartnerCategory eq '1'",
  top: 10
});

// Get single entity
const partner = await client.sap.A_BusinessPartner.get('12345');

// Create entity
const newPartner = await client.sap.A_BusinessPartner.create({
  BusinessPartnerCategory: '1',
  BusinessPartnerName: 'New Company'
});

// Update entity
await client.sap.A_BusinessPartner.update('12345', {
  BusinessPartnerName: 'Updated Name'
});

// Delete entity
await client.sap.A_BusinessPartner.delete('12345');

// Override connection per request
await client.sap.A_SalesOrder.list({
  connection: 'erp-dev',  // Use different instance
  top: 5
});
```

## Testing

Tests use the public Northwind OData service for integration testing:

```typescript
import { describe, test, expect } from 'bun:test';

describe('S4Kit', () => {
  test('should list entities', async () => {
    const client = new S4Kit({ apiKey: 'test', baseUrl: '...' });
    const results = await client.sap.Products.list({ top: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });
});
```

## Code Conventions

### TypeScript
- Use `import type` for type-only imports
- Generic type `T` for entity types
- Explicit return types on public methods

### Error Handling
- HTTP errors wrapped in custom error classes
- OData error responses parsed and re-thrown

### ID Formatting
```typescript
// String IDs wrapped in quotes
formatId('ABC123') → "'ABC123'"
// Numeric IDs passed as-is
formatId(12345) → "12345"
```

## Bun-Specific Notes

- Use `bun test` for running tests (not jest/vitest)
- Use `bun run build` for production builds
- Bun auto-loads `.env` - no dotenv needed
- Use `bun:test` imports for test utilities

## Adding New Features

### Adding a new query option
1. Add field to `QueryOptions` in `types.ts`
2. Handle in `buildQuery()` in `query-builder.ts`
3. Add tests for the new option

### Adding a new HTTP method
1. Add method to `HttpClient` in `http-client.ts`
2. Add corresponding method to handler in `proxy.ts`
3. Update `EntityHandler` interface in `types.ts`

## Dependencies

| Package | Purpose |
|---------|---------|
| ky | HTTP client (lightweight fetch wrapper) |
| tsup | Build tool (bundler) |
| typescript | Type checking |

## Important Considerations

- The `sap` property uses `any` type because entities are dynamic
- For type safety, use typed helpers or generate types from metadata
- Connection is required for requests (either in config or per-request)
- Service is optional - platform auto-resolves from entity name
