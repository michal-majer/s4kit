# S4Kit Backend - AI Assistant Guide

## Package Overview

The backend is a Hono.js API server that acts as a secure proxy between the S4Kit SDK and SAP S/4HANA systems. It handles authentication, rate limiting, access control, and request logging.

## Architecture

```
Request Flow:
┌────────────────────────────────────────────────────────────────────┐
│  SDK Request → /api/proxy/* → Auth → RateLimit → Logging → SAP   │
└────────────────────────────────────────────────────────────────────┘

Layers:
┌─────────────────┐
│   Routes        │  src/routes/ - API endpoints
├─────────────────┤
│   Middleware    │  src/middleware/ - Auth, rate limit, logging
├─────────────────┤
│   Services      │  src/services/ - Business logic
├─────────────────┤
│   Database      │  src/db/ - Drizzle ORM + PostgreSQL
├─────────────────┤
│   Cache         │  src/cache/ - Redis for CSRF tokens, rate limits
└─────────────────┘
```

## File Structure

```
src/
├── index.ts                    # Hono app entry, route registration
├── types.ts                    # TypeScript types (inferred from schema)
├── routes/
│   ├── api/
│   │   └── proxy.ts            # /api/proxy/* - SAP request proxy
│   └── admin/
│       ├── systems.ts          # System CRUD
│       ├── instances.ts        # Instance CRUD
│       ├── system-services.ts  # System service management
│       ├── instance-services.ts # Instance service management
│       ├── api-keys.ts         # API key management
│       └── logs.ts             # Request logs
├── middleware/
│   ├── auth.ts                 # API key validation, access resolution
│   ├── rate-limit.ts           # Redis-based rate limiting
│   └── logging.ts              # Request/response logging
├── services/
│   ├── sap-client.ts           # SAP HTTP client with auth
│   ├── api-key.ts              # Key generation, hashing, validation
│   ├── access-resolver.ts      # Permission checking
│   ├── encryption.ts           # libsodium encryption wrapper
│   ├── odata.ts                # OData response parsing
│   ├── metadata-parser.ts      # CSDL/OData metadata parsing
│   └── type-generator.ts       # TypeScript type generation
├── db/
│   ├── index.ts                # Drizzle client initialization
│   ├── schema.ts               # Database schema definition
│   ├── migrate.ts              # Migration runner
│   ├── seed.ts                 # Database seeding
│   └── recreate.ts             # Database reset
├── cache/
│   └── redis.ts                # Redis client singleton
└── utils/
    └── header-sanitizer.ts     # Sensitive header removal
```

## Development Commands

```bash
bun install                    # Install dependencies
bun run dev                    # Start with hot reload

# Database management
bun run db:generate            # Generate migrations from schema
bun run db:migrate             # Run pending migrations
bun run db:push                # Push schema directly (dev only)
bun run db:studio              # Open Drizzle Studio GUI
bun run db:seed                # Seed initial data
bun run db:reset               # Reset and re-seed
bun run db:recreate            # Full database recreation
```

## Database Schema

### Core Tables

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

### Key Relationships

```
Organization
    └── System (1:N)
           └── Instance (1:N) - each env (dev/prod)
           └── SystemService (1:N)
                  └── InstanceService (N:M link)
                         └── ApiKeyAccess (permissions)
```

### Enums

```typescript
systemType: 's4_public' | 's4_private' | 'btp' | 'other'
instanceEnvironment: 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production'
authType: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom'
```

## Authentication Flow

### API Key Validation (auth.ts)
1. Extract `Bearer` token from Authorization header
2. Hash token, find matching `apiKey` record
3. Check not revoked, not expired
4. Resolve instance + service from headers
5. Load permissions from `apiKeyAccess`
6. Store in Hono context for handlers

### Multi-level Auth Inheritance
```
Priority (highest to lowest):
1. InstanceService auth (if set)
2. SystemService auth (if set)
3. Instance auth (default)
```

### Supported Auth Types
- `none` - No authentication
- `basic` - Username/password with CSRF token
- `api_key` - Custom header with API key
- `custom` - Arbitrary header name/value
- `oauth2` - (Planned, not yet implemented)

## Rate Limiting

Redis-based with two counters:
- Per-minute limit (default: 60)
- Per-day limit (default: 10000)

Keys: `rate:minute:{keyId}`, `rate:day:{keyId}`

## Request Logging

Every proxy request is logged with:
- Method, path, status code
- Request/response timing (total + SAP)
- Truncated request/response bodies (10KB limit)
- Sanitized headers (auth removed)
- Error messages

## Environment Variables

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte hex key for libsodium>
```

## Key Services

### sap-client.ts
Handles SAP HTTP requests:
- Auth header generation (Basic, API Key, Custom)
- CSRF token fetching and caching
- OData query string building
- Response parsing and error handling

### encryption.ts
libsodium wrapper for:
- Encrypting credentials at rest
- Decrypting before SAP requests
- Uses `ENCRYPTION_KEY` from env

### api-key.ts
Stripe-like key management:
- Generate: `sk_live_` + random bytes
- Hash with SHA-256 for storage
- Store prefix + last 4 for display

### access-resolver.ts
Permission checking:
- `methodToOperation()` - GET→read, POST→create, etc.
- `checkEntityPermission()` - Verify entity+operation allowed

## API Routes

### Proxy Route (`/api/proxy/*`)
```
GET /api/proxy/A_BusinessPartner         # List entities
GET /api/proxy/A_BusinessPartner('123')  # Get single entity
POST /api/proxy/A_BusinessPartner        # Create entity
PATCH /api/proxy/A_BusinessPartner('123') # Update entity
DELETE /api/proxy/A_BusinessPartner('123') # Delete entity
```

Headers:
- `Authorization: Bearer sk_live_...` - Required
- `X-S4Kit-Service: business-partner` - Service alias (optional)
- `X-S4Kit-Instance: prod` - Instance env (optional)
- `X-S4Kit-Raw: true` - Return raw OData response
- `X-S4Kit-Strip-Metadata: false` - Keep OData metadata

### Admin Routes
```
/admin/systems          # System CRUD
/admin/instances        # Instance CRUD (query: ?systemId=)
/admin/system-services  # System service CRUD (query: ?systemId=)
/admin/instance-services # Instance service CRUD (query: ?instanceId=)
/admin/api-keys         # API key management
/admin/logs             # Request logs (query: ?apiKeyId=)
```

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

### OData Error Handling
SAP OData errors are parsed and re-thrown with:
- `error.odataError` - Parsed OData error structure
- `error.status` - HTTP status code
- `error.code` - OData error code

### Hono Context Variables
```typescript
type Variables = {
  apiKey: ApiKey;
  instance: Instance;
  systemService: SystemService;
  instanceService: InstanceService;
  entityPermissions: EntityPermissions;
  logData?: { ... };
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
3. Add to proxy route chain in `src/routes/api/proxy.ts`

### Modifying database schema
1. Edit `src/db/schema.ts`
2. Run `bun run db:generate`
3. Run `bun run db:migrate`
4. Update `src/types.ts` if needed (usually auto-inferred)

### Adding new auth type
1. Add to `authTypeEnum` in `schema.ts`
2. Handle in `sap-client.ts` → `requestWithAuth()`
3. Handle in `proxy.ts` → `resolveAuth()`

## Dependencies

| Package | Purpose |
|---------|---------|
| hono | Web framework |
| drizzle-orm | Type-safe ORM |
| postgres | PostgreSQL driver |
| ioredis | Redis client |
| ky | HTTP client for SAP |
| libsodium-wrappers | Encryption |
| fast-xml-parser | OData metadata parsing |
| zod | Request validation |

## Bun-Specific Notes

- Run with `bun run --hot src/index.ts` for development
- Bun auto-loads `.env` - no dotenv needed
- Use `bun run` for all npm scripts
- Drizzle Studio: `bun run db:studio` opens browser GUI
