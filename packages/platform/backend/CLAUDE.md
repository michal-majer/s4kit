# S4Kit Admin Backend - AI Assistant Guide

## Package Overview

The admin backend (`@s4kit/admin`) is a Hono.js API server that provides the management layer for the S4Kit platform. It handles user authentication, organization management, and CRUD operations for systems, instances, services, and API keys.

**Note:** The SAP proxy functionality has been moved to the separate `@s4kit/proxy` package.

## Architecture

```
Request Flow:
┌────────────────────────────────────────────────────────────────────┐
│  Frontend → /admin/* → Session Auth → Admin Routes → Database     │
└────────────────────────────────────────────────────────────────────┘

Layers:
┌─────────────────┐
│   Routes        │  src/routes/admin/ - Admin API endpoints
├─────────────────┤
│   Auth          │  src/auth/ - better-auth integration
├─────────────────┤
│   Middleware    │  src/middleware/ - Session auth
├─────────────────┤
│   Services      │  src/services/ - Business logic
├─────────────────┤
│   Database      │  Uses @s4kit/shared for schema + client
└─────────────────┘
```

## File Structure

```
src/
├── index.ts                    # Hono app entry, route registration
├── types.ts                    # TypeScript types
├── auth/
│   └── index.ts                # better-auth configuration
├── config/
│   └── mode.ts                 # Platform mode (SaaS vs standalone)
├── routes/admin/
│   ├── systems.ts              # System CRUD
│   ├── instances.ts            # Instance CRUD
│   ├── system-services.ts      # System service management
│   ├── instance-services.ts    # Instance service management
│   ├── api-keys.ts             # API key management
│   ├── logs.ts                 # Request logs
│   ├── organization.ts         # Organization management
│   ├── profile.ts              # User profile
│   ├── sessions.ts             # Session management
│   └── platform-info.ts        # Platform info endpoint
├── middleware/
│   └── session-auth.ts         # Session authentication middleware
├── services/
│   ├── sap-client.ts           # SAP HTTP client with auth
│   ├── api-key.ts              # Key generation, hashing
│   ├── encryption.ts           # libsodium wrapper
│   ├── odata.ts                # OData response parsing
│   ├── oauth-token.ts          # OAuth token management
│   ├── metadata-parser.ts      # CSDL/OData metadata parsing
│   ├── type-generator.ts       # TypeScript type generation
│   └── service-binding-parser.ts # BTP service binding parser
├── db/
│   ├── index.ts                # Drizzle client initialization
│   ├── schema.ts               # Local schema (auth tables)
│   ├── auth-schema.ts          # better-auth schema
│   ├── migrate.ts              # Migration runner
│   ├── seed.ts                 # Database seeding
│   ├── recreate.ts             # Database reset
│   └── setup-admin.ts          # Admin user setup (standalone)
├── cache/
│   └── redis.ts                # Redis client singleton
├── scripts/
│   ├── fetch-sap-apis.ts       # SAP API catalog fetcher
│   └── sap-apis-generated.ts   # Generated API list
└── utils/
    ├── header-sanitizer.ts     # Sensitive header removal
    └── log-helpers.ts          # Logging utilities
```

## Development Commands

```bash
bun install                    # Install dependencies
bun run dev                    # Start with hot reload (port 3000)

# Database management
bun run db:generate            # Generate migrations from schema
bun run db:migrate             # Run pending migrations
bun run db:push                # Push schema directly (dev only)
bun run db:studio              # Open Drizzle Studio GUI
bun run db:seed                # Seed initial data
bun run db:reset               # Reset and re-seed (blocked in production!)
bun run db:recreate            # Full database recreation
bun run db:setup-admin         # Create admin user (standalone mode)

# SAP API catalog management
bun run fetch-sap-apis         # Fetch API catalog from SAP Hub
bun run db:refresh-apis        # Update predefined_services only (production-safe)
```

## Authentication

### better-auth Integration
The backend uses better-auth for user authentication:
- Email/password authentication
- Session-based auth with cookies
- Organization support

### Session Middleware
Admin routes are protected by session authentication:
```typescript
app.use('/admin/*', sessionMiddleware)
app.use('/admin/*', adminAuthMiddleware)
```

### Platform Modes
The backend supports two modes (configured via `PLATFORM_MODE`):
- **saas**: Multi-tenant with user signup
- **standalone**: Single-tenant with admin setup

## Database Schema

The main schema is in `@s4kit/shared`. Backend-specific auth tables:

### Auth Tables (auth-schema.ts)
| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Active sessions |
| `accounts` | OAuth accounts |
| `verifications` | Email verifications |

### Core Tables (from @s4kit/shared)
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

## SAP API Catalog

The backend includes a catalog of **1,049 predefined SAP OData APIs**:

| Edition | System Type | APIs | Source Package |
|---------|-------------|------|----------------|
| Public Cloud | `s4_public` | 503 | `SAPS4HANACloud` |
| Private/On-Premise | `s4_private` | 546 | `S4HANAOPAPI` |

To refresh the API catalog:
```bash
bun run fetch-sap-apis    # Fetch latest APIs from SAP Hub
bun run db:refresh-apis   # Update predefined_services only
```

## API Routes

### Auth Routes (`/api/auth/*`)
Handled by better-auth:
```
POST /api/auth/sign-in/email
POST /api/auth/sign-up/email
POST /api/auth/sign-out
GET  /api/auth/session
```

### Admin Routes (`/admin/*`)
Protected by session auth:
```
/admin/systems              # System CRUD
/admin/instances            # Instance CRUD (query: ?systemId=)
/admin/system-services      # System service CRUD (query: ?systemId=)
/admin/instance-services    # Instance service CRUD (query: ?instanceId=)
/admin/api-keys             # API key management
/admin/logs                 # Request logs (query: ?apiKeyId=)
/admin/organization         # Organization settings
/admin/profile              # User profile
/admin/sessions             # Session management
/admin/platform-info        # Platform mode info
```

## Environment Variables

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte hex key for libsodium>
FRONTEND_URL=http://localhost:3001
PLATFORM_MODE=saas  # or 'standalone'
BETTER_AUTH_SECRET=<secret for better-auth>
```

## Key Services

### api-key.ts
Stripe-like key management:
- Generate: `sk_live_` + random bytes
- Hash with SHA-256 for storage
- Store prefix + last 4 for display

### encryption.ts
libsodium wrapper for:
- Encrypting credentials at rest
- Decrypting before SAP requests

### sap-client.ts
SAP HTTP client for admin operations:
- Metadata fetching
- Service verification
- Entity discovery

## Code Conventions

### Error Responses
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Additional context"
  }
}
```

### Hono Context Variables
```typescript
type Variables = {
  user: User;
  session: Session;
  organizationId: string;
};
```

## Common Tasks

### Adding a new admin route
1. Create file in `src/routes/admin/`
2. Define Hono router with CRUD handlers
3. Register in `src/index.ts`

### Adding a new middleware
1. Create file in `src/middleware/`
2. Export middleware function
3. Add to route chain in `src/index.ts`

### Modifying database schema
1. Edit `@s4kit/shared/src/db/schema.ts` (for shared tables)
2. Or edit `src/db/auth-schema.ts` (for auth tables)
3. Run `bun run db:generate`
4. Run `bun run db:migrate`

## Dependencies

| Package | Purpose |
|---------|---------|
| hono | Web framework |
| better-auth | Authentication |
| @s4kit/shared | Shared schema, DB, cache |
| drizzle-orm | Type-safe ORM |
| drizzle-kit | Migration tooling |
| ky | HTTP client for SAP |
| libsodium-wrappers | Encryption |
| fast-xml-parser | OData metadata parsing |
| zod | Request validation |

## Bun-Specific Notes

- Run with `bun run --hot src/index.ts` for development
- Bun auto-loads `.env` - no dotenv needed
- Use `bun run` for all npm scripts
- Drizzle Studio: `bun run db:studio` opens browser GUI
