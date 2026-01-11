<div align="center">

<img src="./packages/platform/frontend/public/logo.svg" alt="S4Kit Logo" width="80" height="80" />

# S4Kit

### Consume SAP APIs with ease.

The modern TypeScript SDK for building Clean Core applications.
Type-safe access to S/4HANA and CAP services. Zero boilerplate.

[![npm](https://img.shields.io/npm/v/s4kit?style=flat-square)](https://www.npmjs.com/package/s4kit)
[![npm downloads](https://img.shields.io/npm/dm/s4kit?style=flat-square)](https://www.npmjs.com/package/s4kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](https://opensource.org/licenses/MIT)

**Works with:** Next.js · Express · Hono · Fastify · NestJS · Remix · any Node.js framework

[Get Started](#quick-start) &nbsp;&bull;&nbsp; [Docs](https://docs.s4kit.com) &nbsp;&bull;&nbsp; [Try S4Kit](https://staging.app.s4kit.com)

</div>

---

## Why S4Kit?

| Traditional Approach | With S4Kit |
|---------------------|------------|
| Destinations, CSRF tokens, auth setup | **One API key** |
| Manual `$filter=substringof(...)` syntax | Type-safe filter objects |
| No SDK — raw `fetch()` or generated clients | Clean, intuitive API |
| No types, runtime errors everywhere | Full TypeScript inference |
| DIY pagination and batch requests | Built-in with async iterators |
| Custom error handling per API | `NotFoundError`, `ValidationError`, etc. |

---

## Quick Start

> **Get your API key:** Create a free account at [staging.app.s4kit.com](https://staging.app.s4kit.com)

```bash
npm install s4kit
```

```typescript
import { S4Kit } from 's4kit';

const client = S4Kit({ apiKey: 'sk_live_...' });

// That's it. Query any SAP entity.
const partners = await client.A_BusinessPartner.list({
  filter: { BusinessPartnerCategory: '1' },
  top: 10
});
```

---

## Type Generation (Recommended)

> **This is the key feature of S4Kit.** Generate TypeScript types directly from your SAP system's OData metadata for full autocomplete and compile-time type safety.

```bash
# Generate types from your connected SAP system
npx s4kit generate-types --api-key sk_live_... --output ./types
```

This creates type definitions based on your actual SAP entities. Then import them:

```typescript
import { S4Kit } from 's4kit';
import './types';  // ← Enables type inference for your SAP system

const client = S4Kit({ apiKey: 'sk_live_...' });

// Full autocomplete on entity names and fields
const partners = await client.A_BusinessPartner.list({
  select: ['BusinessPartner', 'BusinessPartnerName'],  // ← Type-safe!
  filter: { BusinessPartnerCategory: '1' }
});

// partners is A_BusinessPartner[], not any[]
partners.forEach(p => console.log(p.BusinessPartnerName));  // ← Autocomplete works!
```

**What you get:**
- Autocomplete for all entity names (`client.A_BusinessPartner`, `client.A_SalesOrder`, etc.)
- Type-safe `select`, `filter`, `orderBy`, and `expand` options
- Proper return types (no more `any[]`)
- Compile-time validation of field names

**CLI Options:**
```bash
npx s4kit generate-types \
  --api-key sk_live_...     # Your S4Kit API key (required)
  --output ./types          # Output directory (default: ./s4kit-types)
  --base-url <url>          # Custom proxy URL (optional)
  --connection <alias>      # Specific connection (optional, generates for all if omitted)
```

---

## Features

### Type-Safe Queries
Filter with objects, not strings. Full operator support.
```typescript
filter: { Price: { gt: 100 }, Name: { contains: 'Pro' } }
```

### Full CRUD
Every operation you need, with a clean API.
```typescript
client.Entity.list()    // Read all
client.Entity.get(id)   // Read one
client.Entity.create()  // Create
client.Entity.update()  // Update
client.Entity.delete()  // Delete
```

### Batch Operations
Multiple operations in a single request.
```typescript
await client.Entity.createMany([{ name: 'A' }, { name: 'B' }]);
await client.Entity.deleteMany([id1, id2, id3]);
```

### Atomic Transactions
All-or-nothing. If one fails, all roll back.
```typescript
await client.transaction(tx => [
  tx.Orders.create({ ... }),
  tx.Items.createMany([...])
]);
```

### Smart Pagination
Async iterators for efficient data processing.
```typescript
for await (const page of client.Entity.paginate()) { ... }
const all = await client.Entity.all();  // Or get everything
```

### Error Handling
Typed errors with helpful messages.
```typescript
catch (e) {
  if (e instanceof NotFoundError) console.log(e.help);
  if (e instanceof ValidationError) console.log(e.fieldErrors);
}
```

---

## Architecture

```
Your Application
        │
        ▼
┌───────────────────────────────────────────────────┐
│                   S4Kit SDK                       │
│  • Type-safe queries    • Batch operations        │
│  • Error handling       • Pagination              │
└───────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────┐
│               S4Kit Proxy Service                 │
│  • API key auth         • Rate limiting           │
│  • Request logging      • Connection management   │
└───────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────┐
│            SAP S/4HANA  /  CAP Services           │
│  • S/4HANA Cloud        • S/4HANA On-Premise      │
│  • CAP Applications     • Any OData Service       │
└───────────────────────────────────────────────────┘
```

---

## Try S4Kit

<div align="center">

### Get started in minutes

1. Create a free account on [**staging.app.s4kit.com**](https://staging.app.s4kit.com)
2. Connect your SAP system (S/4HANA, BTP, or CAP service)
3. Generate an API key and start building

[**Create Free Account**](https://staging.app.s4kit.com) &nbsp; &nbsp; [Documentation](https://docs.s4kit.com)

</div>

---

## SAP S/4HANA Examples

Real-world examples using SAP S/4HANA entities:

```typescript
import { S4Kit } from 's4kit';

const client = S4Kit({
  apiKey: 'sk_live_...',
});

// Query Business Partners with filtering
const partners = await client.A_BusinessPartner.list({
  filter: {
    BusinessPartnerCategory: '1',
    CreationDate: { gt: '2024-01-01' }
  },
  select: ['BusinessPartner', 'BusinessPartnerName', 'Industry'],
  orderBy: { BusinessPartnerName: 'asc' },
  top: 50
});

// Get Sales Order with line items expanded
const order = await client.A_SalesOrder.get('12345', {
  expand: {
    to_Item: {
      select: ['SalesOrderItem', 'Material', 'NetAmount'],
      orderBy: { SalesOrderItem: 'asc' }
    }
  }
});

// Create multiple products atomically
const products = await client.transaction(tx => [
  tx.A_Product.create({ Product: 'PROD001', ProductType: 'FINISHED' }),
  tx.A_Product.create({ Product: 'PROD002', ProductType: 'FINISHED' }),
  tx.A_Product.create({ Product: 'PROD003', ProductType: 'FINISHED' }),
]);
```

---

## CAP Bookshop Examples

Examples using the SAP CAP Bookshop sample service:

```typescript
const client = S4Kit({ apiKey: 'sk_live_...' });

// List books with type-safe filtering
const cheapBooks = await client.Books.list({
  filter: { price: { lt: 15 } },
  orderBy: { price: 'asc' },
  select: ['title', 'author', 'price']
});

// Authors with their books expanded
const authors = await client.Authors.list({
  expand: {
    books: {
      select: ['title', 'price'],
      top: 5
    }
  }
});

// Deep insert: Book with localized texts (Composition)
const book = await client.Books.createDeep({
  title: "The Hitchhiker's Guide",
  price: 42.00,
  texts: [
    { locale: 'de', title: 'Per Anhalter durch die Galaxis' },
    { locale: 'fr', title: 'Le Guide du voyageur galactique' }
  ]
});

// Batch create with automatic cleanup
const books = await client.Books.createMany([
  { title: 'Book 1', price: 9.99 },
  { title: 'Book 2', price: 14.99 },
  { title: 'Book 3', price: 19.99 }
]);

// Transaction with rollback on failure
await client.transaction(tx => [
  tx.Authors.create({ name: 'New Author' }),
  tx.Books.create({ title: 'New Book', author_ID: 101 })
]);
```

See the [complete demo](./packages/sdk/examples/demo.ts) for a full walkthrough.

---

## Self-Hosting

Run S4Kit on your own infrastructure:

**Prerequisites**: Docker, Bun 1.3.4+

```bash
# Clone and install
git clone https://github.com/michal-majer/s4kit.git
cd s4kit
bun install

# Start services
docker compose up -d postgres redis
cd packages/platform/backend
bun x drizzle-kit push --force
bun run db:seed
bun run db:setup-admin

# Run production build
cd ../..
bun run build
# Start services (3 terminals or use process manager)
cd packages/platform/backend && bun run start
cd packages/platform/frontend && bun run start
cd packages/platform/proxy && bun run start
```

**Access**: Frontend at http://localhost:3001

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3001 | Admin dashboard |
| Backend | 3000 | Admin API |
| Proxy | 3002 | SDK proxy |

See [DEPLOY.md](./DEPLOY.md) for production deployment guide.

---

## Documentation

| Resource | Description |
|----------|-------------|
| [docs.s4kit.com](https://docs.s4kit.com) | Full documentation |
| [SDK Reference](./packages/sdk/README.md) | SDK quick reference |
| [Examples](./packages/sdk/examples/) | Working code examples |

---


<div align="center">

**Build Clean Core applications faster.**

[Get Started](#quick-start) &nbsp;&bull;&nbsp; [GitHub](https://github.com/michal-majer/s4kit)

</div>
