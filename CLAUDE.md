# S4Kit - AI Assistant Guide

## Project Overview

S4Kit is a lightweight, type-safe SDK and platform for SAP S/4HANA integration. It provides developers with a simplified API for interacting with SAP S/4HANA systems without requiring complex SAP infrastructure setup.

**Core Value Proposition:**
- Developer-friendly SDK for SAP OData integration
- API key-based authentication (Stripe-like model)
- TypeScript type generation from OData metadata
- Multi-environment support (sandbox, dev, quality, production)
- Request logging and audit trails
- Rate limiting and access control

## Repository Structure

```
s4kit/
├── packages/
│   ├── sdk/                    # @s4kit/sdk - NPM client library
│   └── platform/
│       ├── backend/            # Hono.js API server (SAP proxy)
│       └── frontend/           # Next.js admin dashboard
├── docker-compose.yml          # PostgreSQL + Redis
├── package.json                # Root monorepo config
└── tsconfig.json               # Root TypeScript config
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun 1.3.4+ |
| Language | TypeScript 5.3+ (strict) |
| SDK Build | tsup (CJS + ESM + types) |
| Backend Framework | Hono 4.x |
| Frontend Framework | Next.js 16 + React 19 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 |
| UI Components | Shadcn/ui + Tailwind CSS 4 |
| Validation | Zod 4.x |

## Development Commands

### Quick Start
```bash
bun install                    # Install all dependencies
docker-compose up -d           # Start PostgreSQL + Redis
cd packages/platform/backend && bun run db:seed  # Initialize database
```

### Running Services
```bash
# Backend (port 3000)
cd packages/platform/backend && bun run dev

# Frontend (port 3001)
cd packages/platform/frontend && bun run dev

# SDK development
cd packages/sdk && bun run dev
```

### Testing
```bash
bun test                       # Run all tests
bun test --watch              # Watch mode
```

### Database Management
```bash
cd packages/platform/backend
bun run db:generate           # Generate migrations
bun run db:migrate            # Run migrations
bun run db:push               # Push schema (dev only)
bun run db:studio             # Open Drizzle Studio
bun run db:seed               # Seed database
bun run db:recreate           # Reset database
```

### Building
```bash
bun run build                 # Build all packages
cd packages/sdk && bun run build  # Build SDK only
```

## Code Conventions

### TypeScript
- Strict mode enabled everywhere
- Use `import type { ... }` for type-only imports
- PascalCase for types/interfaces, camelCase for functions/variables
- Explicit nullability with `| null` or `| undefined`

### File Organization
- kebab-case for file names (e.g., `query-builder.ts`)
- Group by feature, not by type
- Co-locate tests with source files

### API Design
- RESTful routes: `/admin/systems`, `/api/proxy`
- JSON responses with consistent error format
- Status codes: 200, 201, 400, 401, 403, 404, 503

### Database
- snake_case for table/column names
- UUID primary keys with `defaultRandom()`
- Timestamps: `createdAt`, `updatedAt` with `defaultNow()`
- Cascade deletes for dependent records

## Key Architectural Patterns

### 1. Dynamic Proxy Pattern (SDK)
The SDK uses JavaScript Proxy to dynamically create entity handlers:
```typescript
client.sap.A_BusinessPartner.list()  // Dynamically resolved at runtime
```

### 2. Layered Backend
```
Request → Routes → Middleware (auth → rate-limit → logging) → Services → DB/Cache
```

### 3. Multi-level Auth Inheritance
```
InstanceService auth → SystemService auth → Instance auth (fallback)
```

### 4. API Key Model
- Keys stored as hash + prefix + last 4 chars
- Per-key rate limits (minute/day)
- Granular permissions per entity operation

## Environment Variables

Backend requires:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte hex key>
```

## Package-Specific Guides

Each package has its own CLAUDE.md with detailed guidance:
- `packages/sdk/CLAUDE.md` - SDK development
- `packages/platform/backend/CLAUDE.md` - Backend development
- `packages/platform/frontend/CLAUDE.md` - Frontend development

## Important Files

| File | Purpose |
|------|---------|
| `packages/sdk/src/client.ts` | Main SDK client class |
| `packages/sdk/src/proxy.ts` | Dynamic entity proxy |
| `packages/platform/backend/src/index.ts` | Hono app entry |
| `packages/platform/backend/src/db/schema.ts` | Database schema |
| `packages/platform/frontend/app/layout.tsx` | Root layout |

## Common Tasks

### Adding a new API endpoint
1. Create route in `packages/platform/backend/src/routes/`
2. Register route in `src/index.ts`
3. Add types to `src/types.ts` if needed

### Adding a new UI page
1. Create page in `packages/platform/frontend/app/`
2. Add components in `components/` directory
3. Update navigation if needed

### Modifying database schema
1. Edit `packages/platform/backend/src/db/schema.ts`
2. Run `bun run db:generate` to create migration
3. Run `bun run db:migrate` to apply

## Testing Guidelines

- Integration tests use public Northwind OData service
- Tests located in `test/` directories
- Use `bun:test` for test runner
- Mock external services, don't mock internal modules

## Bun-Specific Notes

- Use `bun run` instead of `npm run`
- Use `bun test` instead of jest/vitest
- Bun auto-loads `.env` files - no dotenv needed
- Use `Bun.serve()` for HTTP servers (backend uses Hono on top)
- Hot reload: `bun run --hot src/index.ts`
