<div align="center">

# S4Kit

**The Stripe-like SDK for SAP S/4HANA**

One line of code to query any SAP entity. Type-safe. No boilerplate.

[![npm version](https://img.shields.io/npm/v/s4kit.svg)](https://www.npmjs.com/package/s4kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)

[Documentation](#documentation) · [Quick Start](#quick-start) · [Features](#features) · [Self-Hosting](#self-hosting)

</div>

---

## Why S4Kit?

| Traditional SAP Integration | With S4Kit |
|-----------------------------|------------|
| Weeks of OData setup | **Minutes** to first query |
| Complex `$filter` syntax | Intuitive object filters |
| Manual type definitions | Generated TypeScript types |
| Build your own rate limiting | Built-in with Redis |
| DIY audit logging | Comprehensive request logs |

## Quick Start

```bash
npm install s4kit
```

```typescript
import { S4Kit } from 's4kit';

const client = S4Kit({
  apiKey: 'sk_live_xxx',
  connection: 'erp-prod'
});

// Query any SAP entity - that's it.
const partners = await client.A_BusinessPartner.list({
  filter: { BusinessPartnerCategory: '1' },
  select: ['BusinessPartner', 'BusinessPartnerName'],
  top: 10
});
```

## Features

### SDK

- **Dynamic Entity Access** - Query any OData entity without code generation
- **Full CRUD Operations** - `list()`, `get()`, `create()`, `update()`, `delete()`
- **Type-Safe Queries** - Generated TypeScript interfaces from SAP metadata
- **Fluent Query Builder** - Chainable, readable query construction
- **Advanced Filtering** - Object notation, logical operators (`$or`, `$and`, `$not`)
- **Batch Operations** - Atomic and non-atomic batch requests
- **Navigation Properties** - Access related entities with `expand`
- **OData Functions & Actions** - Call bound and unbound operations
- **Pagination** - Built-in `paginate()` with async iterators
- **Interceptors** - Request/response/error hooks

### Platform (Optional)

Self-host the S4Kit platform for enterprise features:

- **Multi-Tenant Architecture** - SaaS-ready with organization isolation
- **1,049 Predefined SAP APIs** - Built-in catalog for S/4HANA Cloud & On-Premise
- **Stripe-like API Keys** - Secure key management with hashing & masking
- **Rate Limiting** - Redis-backed distributed rate limits
- **Audit Logging** - Comprehensive request logs with privacy controls
- **Role-Based Access Control** - Owner, Admin, Developer roles
- **Multi-Level Auth** - Instance, Service, and System-level credentials

## Installation

```bash
# npm
npm install s4kit

# yarn
yarn add s4kit

# pnpm
pnpm add s4kit

# bun
bun add s4kit
```

## Usage Examples

### Filtering

```typescript
// Simple equality
const partners = await client.A_BusinessPartner.list({
  filter: { BusinessPartnerCategory: '1' }
});

// Comparison operators
const products = await client.A_Product.list({
  filter: {
    StandardPrice: { gt: 100, lt: 500 },
    ProductType: 'FINISHED'
  }
});

// Logical operators
const orders = await client.A_SalesOrder.list({
  filter: {
    $or: [
      { SalesOrderType: 'OR' },
      { TotalNetAmount: { gt: 10000 } }
    ]
  }
});
```

### Type Generation (Optional)

Generate TypeScript interfaces from your SAP system:

```bash
npx s4kit generate-types --api-key sk_live_xxx --output ./types
```

```typescript
import type { A_BusinessPartner } from './types';

// Full autocomplete and type checking
const partner: A_BusinessPartner = await client.A_BusinessPartner.get('1000000');
```

### Fluent Query Builder

```typescript
import { query } from 's4kit';

const results = await query(client.A_Product)
  .select('Product', 'ProductType', 'StandardPrice')
  .where('ProductType', 'eq', 'FINISHED')
  .and('StandardPrice', 'gt', 100)
  .orderBy('StandardPrice', 'desc')
  .top(20)
  .execute();
```

### Batch Operations

```typescript
// Atomic batch - all succeed or all fail
const results = await client.batch([
  { method: 'POST', entity: 'A_BusinessPartner', data: partner1 },
  { method: 'POST', entity: 'A_BusinessPartner', data: partner2 },
], { atomic: true });
```

### Navigation Properties

```typescript
// Expand related entities
const orders = await client.A_SalesOrder.list({
  expand: {
    to_Item: {
      select: ['SalesOrderItem', 'Material', 'NetAmount'],
      top: 10
    }
  }
});

// Or use nav() for direct access
const items = await client.A_SalesOrder.nav('12345', 'to_Item').list();
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
│                                                             │
│    import { S4Kit } from 's4kit';                           │
│    const client = S4Kit({ apiKey: 'sk_live_xxx' });         │
│    await client.A_BusinessPartner.list();                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   S4Kit Proxy Service                        │
│                                                             │
│  • API Key Authentication    • Rate Limiting                │
│  • Permission Checking       • Request Logging              │
│  • Service Resolution        • Response Normalization       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SAP S/4HANA                               │
│                                                             │
│  • S/4HANA Cloud (Public)    • S/4HANA On-Premise          │
│  • S/4HANA Private Cloud     • SAP BTP Services            │
└─────────────────────────────────────────────────────────────┘
```

## Self-Hosting

Deploy the S4Kit platform with Docker:

```bash
# Clone the repository
git clone https://github.com/michal-majer/s4kit.git
cd s4kit

# Start the platform
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3001 | Admin dashboard (Next.js) |
| Backend | 3000 | Admin API (Hono.js) |
| Proxy | 3002 | SDK proxy service (Hono.js) |
| PostgreSQL | 5433 | Database |
| Redis | 6379 | Cache & rate limiting |

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5433/s4kit
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte-hex-key>
BETTER_AUTH_SECRET=<random-string>

# Optional
MODE=selfhost  # or 'saas' for multi-tenant
```

## Configuration

### SDK Options

```typescript
const client = S4Kit({
  apiKey: 'sk_live_xxx',        // Required: Your API key
  baseUrl: 'https://api.s4kit.com', // Platform URL
  connection: 'erp-prod',       // Default SAP connection
  timeout: 30000,               // Request timeout (ms)
  retries: 3,                   // Retry failed requests
  debug: false,                 // Enable debug logging
});
```

### Per-Request Overrides

```typescript
// Override connection for specific requests
const devData = await client.A_Product.list({
  connection: 'erp-dev',
  top: 5
});
```

## Documentation

- [SDK Reference](./packages/sdk/README.md)
- [Platform Guide](./packages/platform/README.md)
- [API Reference](./docs/api.md)

## Tech Stack

| Component | Technology |
|-----------|------------|
| SDK | TypeScript, Bun |
| Backend | Hono.js, Drizzle ORM |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | better-auth |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Setup development environment
bun install
docker-compose up -d  # Start PostgreSQL + Redis

# Run services
bun run dev:platform  # Start all platform services
cd packages/sdk && bun run dev  # SDK development
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with love for SAP developers who deserve better tools.**

[Get Started](#quick-start) · [Star on GitHub](https://github.com/michal-majer/s4kit)

</div>
