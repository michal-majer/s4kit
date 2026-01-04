# S4Kit SDK

Type-safe SDK for consuming SAP APIs. Build Clean Core applications faster.

[![npm](https://img.shields.io/npm/v/s4kit)](https://www.npmjs.com/package/s4kit)
[![TypeScript](https://img.shields.io/npm/types/s4kit)](https://www.npmjs.com/package/s4kit)
[![Bundle](https://img.shields.io/bundlephobia/minzip/s4kit)](https://bundlephobia.com/package/s4kit)

Works with Next.js, Express, Hono, Fastify, NestJS, Remix, and more.

[Documentation](https://docs.s4kit.com) · [Get API Key](https://staging.app.s4kit.com) · [Examples](./examples/)

```bash
npm install s4kit    # or yarn add s4kit / pnpm add s4kit / bun add s4kit
```

---

## Quick Start

```typescript
import { S4Kit } from 's4kit';

const client = S4Kit({ apiKey: 'sk_live_...' });

const partners = await client.A_BusinessPartner.list({
  filter: { BusinessPartnerCategory: '1' },
  top: 10
});
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your S4Kit API key |
| `baseUrl` | `string` | `https://staging.proxy.s4kit.com/api/proxy` | API endpoint |
| `connection` | `string` | - | Default SAP connection alias |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `retries` | `number` | `0` | Retry failed requests |
| `debug` | `boolean` | `false` | Enable debug logging |

---

## How It Works

The SDK connects to **S4Kit Platform** — a proxy service that handles the complexity of SAP integration:

```
Your App  →  S4Kit SDK  →  S4Kit Platform  →  Your SAP System
                              ├─ API key authentication
                              ├─ Connection management
                              ├─ Rate limiting
                              └─ Request logging
```

**Getting started:**
1. Create an account at [staging.app.s4kit.com](https://staging.app.s4kit.com)
2. Connect your SAP system (S/4HANA, BTP, or CAP service)
3. Generate an API key
4. Use the API key in your SDK configuration

The platform handles CSRF tokens, authentication, and connection pooling — you just write clean TypeScript.

---

## Type Generation

Generate TypeScript types from your SAP system for full autocomplete and type safety:

```bash
npx s4kit generate-types --api-key sk_live_... --base-url https://staging.proxy.s4kit.com/api/proxy --output ./types
```

```typescript
import { S4Kit } from 's4kit';
import './types';  // Enable type inference

const client = S4Kit({ apiKey: 'sk_live_...' });

// Full autocomplete on entity names and fields
const partners = await client.A_BusinessPartner.list({
  select: ['BusinessPartner', 'BusinessPartnerName'],  // ← Type-safe!
  filter: { BusinessPartnerCategory: '1' }
});

// partners is A_BusinessPartner[], not any[]
partners.forEach(p => console.log(p.BusinessPartnerName));  // ← Autocomplete works!
```

---

## SAP S/4HANA Examples

### Reading Data

```typescript
// List with filtering and pagination
const partners = await client.A_BusinessPartner.list({
  filter: {
    BusinessPartnerCategory: '1',
    CreationDate: { gt: '2024-01-01' }
  },
  select: ['BusinessPartner', 'BusinessPartnerName', 'Industry'],
  orderBy: { BusinessPartnerName: 'asc' },
  top: 50,
  skip: 0
});

// Get single entity
const partner = await client.A_BusinessPartner.get('1000000');

// Get with expanded relations
const order = await client.A_SalesOrder.get('12345', {
  expand: {
    to_Item: {
      select: ['SalesOrderItem', 'Material', 'NetAmount'],
      orderBy: { SalesOrderItem: 'asc' }
    }
  }
});

// Count
const total = await client.A_BusinessPartner.count();
const active = await client.A_BusinessPartner.count({
  filter: { BusinessPartnerCategory: '1' }
});

// List with count
const { value, count } = await client.A_BusinessPartner.listWithCount({
  top: 20
});
console.log(`Showing ${value.length} of ${count}`);
```

### Creating Data

```typescript
// Single create
const partner = await client.A_BusinessPartner.create({
  BusinessPartnerCategory: '1',
  BusinessPartnerFullName: 'Acme Corporation'
});

// Batch create
const products = await client.A_Product.createMany([
  { Product: 'PROD001', ProductType: 'FINISHED' },
  { Product: 'PROD002', ProductType: 'FINISHED' },
  { Product: 'PROD003', ProductType: 'FINISHED' }
]);
```

### Updating Data

```typescript
// Partial update (PATCH)
await client.A_BusinessPartner.update('1000000', {
  BusinessPartnerFullName: 'Updated Name'
});

// Full replacement (PUT)
await client.A_BusinessPartner.replace('1000000', {
  BusinessPartnerCategory: '1',
  BusinessPartnerFullName: 'Complete Replacement'
});

// Upsert (create or update)
await client.A_Product.upsert({
  Product: 'PROD001',
  ProductType: 'FINISHED',
  StandardPrice: 99.99
});
```

### Deleting Data

```typescript
// Single delete
await client.A_BusinessPartner.delete('1000000');

// Batch delete
await client.A_Product.deleteMany(['PROD001', 'PROD002', 'PROD003']);
```

---

## CAP Bookshop Examples

Examples using the SAP CAP Bookshop sample service:

### Full CRUD Cycle

```typescript
const client = S4Kit({ apiKey: 'sk_live_...' });

// List books with filtering
const cheapBooks = await client.Books.list({
  filter: { price: { lt: 15 } },
  orderBy: { price: 'asc' },
  select: ['title', 'author', 'price']
});

// Create author
const author = await client.Authors.create({
  name: 'Ada Lovelace',
  dateOfBirth: '1815-12-10',
  placeOfBirth: 'London'
});

// Update author
await client.Authors.update(author.ID, {
  dateOfDeath: '1852-11-27',
  placeOfDeath: 'London'
});

// Delete author
await client.Authors.delete(author.ID);
```

### Deep Insert (Composition)

Create an entity with nested related entities in a single request.

> **Note**: `createDeep()` only works with **Composition** relationships. For **Association** relationships, nested data is silently ignored - use separate `create()` calls or transactions instead.

```typescript
// Book with localized texts (Composition relationship)
const book = await client.Books.createDeep({
  title: "The Hitchhiker's Guide",
  price: 42.00,
  author_ID: 101,
  genre_ID: 'fiction',
  texts: [
    { locale: 'de', title: 'Per Anhalter durch die Galaxis' },
    { locale: 'fr', title: 'Le Guide du voyageur galactique' }
  ]
});
```

### Batch Operations

```typescript
// Create multiple books
const books = await client.Books.createMany([
  { title: 'Book 1', author_ID: 101, genre_ID: 'fiction', price: 9.99 },
  { title: 'Book 2', author_ID: 101, genre_ID: 'fiction', price: 14.99 },
  { title: 'Book 3', author_ID: 101, genre_ID: 'fiction', price: 19.99 }
]);

// Delete multiple books
await client.Books.deleteMany(books.map(b => b.ID));
```

### Transactions

All-or-nothing operations. If any operation fails, all are rolled back.

```typescript
// Successful transaction
const [book1, book2, book3] = await client.transaction(tx => [
  tx.Books.create({ title: 'Transaction Book 1', author_ID: 101, genre_ID: 'fiction', price: 19.99 }),
  tx.Books.create({ title: 'Transaction Book 2', author_ID: 101, genre_ID: 'fiction', price: 29.99 }),
  tx.Books.create({ title: 'Transaction Book 3', author_ID: 101, genre_ID: 'fiction', price: 39.99 })
]);

// Failed transaction - all rolled back
try {
  await client.transaction(tx => [
    tx.Books.create({ title: 'Will be rolled back', author_ID: 101, genre_ID: 'fiction', price: 9.99 }),
    tx.Books.create({ title: 'Missing required field' }) // Fails - missing genre_ID
  ]);
} catch (error) {
  // Neither book was created
}
```

---

## Filtering

Type-safe filtering with operators - no more manual `$filter` strings.

### Object Syntax

```typescript
// Simple equality
filter: { Category: 'Electronics' }

// Multiple conditions (AND)
filter: { Category: 'Electronics', Active: true }

// Comparison operators
filter: { Price: { gt: 100 } }           // Greater than
filter: { Price: { lt: 500 } }           // Less than
filter: { Price: { ge: 100 } }           // Greater than or equal
filter: { Price: { le: 500 } }           // Less than or equal
filter: { Price: { ne: 0 } }             // Not equal
filter: { Price: { gt: 100, lt: 500 } }  // Range

// String operators
filter: { Name: { contains: 'Pro' } }
filter: { Name: { startswith: 'A' } }
filter: { Name: { endswith: 'ion' } }

// Array operators
filter: { Status: { in: ['active', 'pending'] } }
filter: { Price: { between: [100, 500] } }
```

### Logical Operators

```typescript
// OR conditions
filter: {
  Category: 'Electronics',
  $or: [
    { Price: { lt: 100 } },
    { OnSale: true }
  ]
}

// NOT condition
filter: {
  $not: { Discontinued: true }
}

// Complex nested logic
filter: {
  $or: [
    { Category: 'Electronics', Price: { lt: 500 } },
    { Category: 'Books', Rating: { ge: 4 } }
  ]
}
```

### Raw OData Syntax

```typescript
// When you need full control
filter: "Price gt 100 and contains(Name,'Pro')"
```

---

## Sorting

Multiple formats supported:

```typescript
// String
orderBy: 'Name desc'
orderBy: 'Category asc, Name desc'

// Object
orderBy: { Name: 'desc' }
orderBy: { Category: 'asc', Name: 'desc' }

// Array (explicit order)
orderBy: [{ Category: 'asc' }, { Name: 'desc' }]
```

---

## Expanding Relations

Fetch related entities in a single request.

```typescript
// Simple expand
expand: ['Category', 'Supplier']
expand: { Category: true, Supplier: true }

// Expand with nested options
expand: {
  Items: {
    select: ['ItemID', 'Quantity', 'Price'],
    filter: { Quantity: { gt: 0 } },
    orderBy: { ItemID: 'asc' },
    top: 10
  }
}

// Nested expand
expand: {
  Items: {
    expand: { Product: true }
  }
}
```

---

## Pagination

### Async Iterator

Process large datasets efficiently:

```typescript
for await (const page of client.Products.paginate({ pageSize: 100 })) {
  console.log(`Processing ${page.value.length} of ${page.count} total`);

  for (const product of page.value) {
    // Process each product
  }
}

// With maximum items limit
for await (const page of client.Products.paginate({ pageSize: 100, maxItems: 500 })) {
  process(page.value);
}
```

### Get All

Fetch all records with auto-pagination:

```typescript
const allProducts = await client.Products.all();
```

### Manual Pagination

```typescript
// First page
const page1 = await client.Products.listWithCount({ top: 20, skip: 0 });

// Next page
const page2 = await client.Products.listWithCount({ top: 20, skip: 20 });
```

---

## Navigation Properties

Access related entities directly:

```typescript
// Using expand
const order = await client.Orders.get(12345, {
  expand: { Items: true }
});
console.log(order.Items);

// Using nav() for direct access
const items = await client.Orders.nav(12345, 'Items').list();

// Chain operations
const expensiveItems = await client.Orders.nav(12345, 'Items').list({
  filter: { Price: { gt: 100 } },
  orderBy: { Price: 'desc' }
});
```

---

## Transactions

Atomic operations - all succeed or all fail.

```typescript
const [order, items] = await client.transaction(tx => [
  tx.Orders.create({
    CustomerID: 'ALFKI',
    OrderDate: new Date().toISOString()
  }),
  tx.OrderItems.createMany([
    { ProductID: 1, Quantity: 5 },
    { ProductID: 2, Quantity: 3 }
  ])
]);
```

Supported operations in transactions:
- `create(data)`
- `update(id, data)`
- `delete(id)`
- `createMany(items)`
- `updateMany(items)`
- `deleteMany(ids)`

---

## Error Handling

Typed errors with helpful messages:

```typescript
import {
  S4KitError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  RateLimitError
} from 's4kit';

try {
  await client.Products.get(99999);
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(error.message);     // "Entity not found"
    console.log(error.help);        // "Verify the entity exists..."
    console.log(error.status);      // 404
  }

  if (error instanceof ValidationError) {
    console.log(error.fieldErrors); // Map of field-level errors
    console.log(error.getFieldError('Name')); // "Name is required"
  }

  if (error instanceof RateLimitError) {
    console.log(error.retryAfter);  // Seconds to wait
  }

  if (error instanceof S4KitError) {
    console.log(error.code);        // Error code
    console.log(error.friendlyMessage);
    console.log(error.toJSON());    // Serializable error info
  }
}
```

### Error Types

| Error | Status | Description |
|-------|--------|-------------|
| `NetworkError` | - | Connection failed |
| `TimeoutError` | - | Request timed out |
| `AuthenticationError` | 401 | Invalid API key |
| `AuthorizationError` | 403 | Permission denied |
| `NotFoundError` | 404 | Entity not found |
| `ValidationError` | 400 | Invalid request data |
| `ConflictError` | 409 | Optimistic locking conflict |
| `RateLimitError` | 429 | Too many requests |
| `ServerError` | 5xx | Server error |

---

## Interceptors

Hook into the request lifecycle:

```typescript
const client = S4Kit({ apiKey: 'sk_live_...' })
  .onRequest((config) => {
    console.log('Request:', config.method, config.url);
    return config;
  })
  .onResponse((response) => {
    console.log('Response:', response.status);
    return response;
  })
  .onError((error) => {
    console.log('Error:', error.message);
    throw error;
  });
```

---

## OData Functions & Actions

Call unbound and bound operations:

```typescript
// Unbound function (GET)
const result = await client.Entity.func('GetStatistics', {
  year: 2024,
  region: 'EU'
});

// Unbound action (POST)
const result = await client.Entity.action('ProcessBatch', {
  items: [1, 2, 3]
});

// Bound function on entity instance
const discount = await client.Products.boundFunc(123, 'CalculateDiscount', {
  quantity: 10
});

// Bound action on entity instance
await client.Orders.boundAction(456, 'Approve');
```

---

## Query Builder

Fluent API alternative:

```typescript
import { query } from 's4kit';

const products = await query(client.Products)
  .select('ProductID', 'Name', 'Price')
  .where('Category', 'eq', 'Electronics')
  .and('Price', 'gt', 100)
  .orderBy('Price', 'desc')
  .top(20)
  .execute();

// With count
const { value, count } = await query(client.Products)
  .where('Active', 'eq', true)
  .count()
  .executeWithCount();

// First or single
const first = await query(client.Products).where('ID', 'eq', 1).first();
const single = await query(client.Products).where('ID', 'eq', 1).single();
```

---

## Advanced

### Composite Keys

```typescript
// Simple key
await client.Products.get(123);
await client.Products.get('ABC');

// Composite key
await client.OrderItems.get({ OrderID: '12345', ItemNo: 10 });
```

### Per-Request Overrides

```typescript
// Override connection
await client.Products.list({
  connection: 'sandbox',
  service: 'API_PRODUCT_SRV'
});

// Get raw OData response
const raw = await client.Products.list({
  raw: true
});
```

### Search

```typescript
// Full-text search
const results = await client.Products.list({
  search: 'laptop computer'
});
```

---

## Examples

See the [examples directory](./examples/) for complete working examples:

- [`demo.ts`](./examples/demo.ts) - Complete feature walkthrough

---

## License

MIT
