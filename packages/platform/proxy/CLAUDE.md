# S4Kit Proxy Service - AI Assistant Guide

## Package Overview

The proxy service (`@s4kit/proxy`) is a Hono.js API server that handles all SDK requests. It acts as a secure proxy between the S4Kit SDK and SAP S/4HANA systems, providing authentication, rate limiting, access control, and request logging.

**Note:** This service was split from the backend to allow independent scaling of admin vs proxy workloads.

## Architecture

```
Request Flow:
┌────────────────────────────────────────────────────────────────────────┐
│  SDK Request → /api/proxy/* → Auth → RateLimit → Logging → SAP        │
└────────────────────────────────────────────────────────────────────────┘

Layers:
┌─────────────────┐
│   Routes        │  src/routes/ - Proxy endpoints
├─────────────────┤
│   Middleware    │  src/middleware/ - Auth, rate limit, logging
├─────────────────┤
│   Services      │  src/services/ - SAP client, OData parsing
├─────────────────┤
│   Database      │  Uses @s4kit/shared for schema + client
├─────────────────┤
│   Cache         │  Uses @s4kit/shared for Redis client
└─────────────────┘
```

## File Structure

```
src/
├── index.ts                    # Hono app entry, route registration
├── types.ts                    # TypeScript types (Hono context)
├── routes/
│   ├── proxy.ts                # /api/proxy/* - SAP request proxy
│   └── health.ts               # Health check endpoint
├── middleware/
│   ├── auth.ts                 # API key validation, access resolution
│   ├── rate-limit.ts           # Redis-based rate limiting
│   └── logging.ts              # Request/response logging
├── services/
│   ├── sap-client.ts           # SAP HTTP client with auth
│   ├── api-key.ts              # Key validation, hashing
│   ├── access-resolver.ts      # Permission checking
│   ├── odata.ts                # OData response parsing
│   └── oauth-token.ts          # OAuth token management
└── utils/
    └── log-helpers.ts          # Logging utilities
```

## Development Commands

```bash
bun install                    # Install dependencies
bun run dev                    # Start with hot reload (port 3002)
bun run start                  # Start production server
bun run build                  # Build for production
bun run type-check             # TypeScript type checking
```

## API Routes

### Proxy Route (`/api/proxy/*`)

The main proxy endpoint that forwards requests to SAP:

```
GET /api/proxy/A_BusinessPartner         # List entities
GET /api/proxy/A_BusinessPartner('123')  # Get single entity
POST /api/proxy/A_BusinessPartner        # Create entity
PATCH /api/proxy/A_BusinessPartner('123') # Update entity
DELETE /api/proxy/A_BusinessPartner('123') # Delete entity
```

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with API key (`Bearer sk_live_...`) |
| `X-S4Kit-Service` | No | Service alias (optional, auto-resolved from entity) |
| `X-S4Kit-Instance` | No | Instance environment (optional, uses default) |
| `X-S4Kit-Raw` | No | Return raw OData response if `true` |
| `X-S4Kit-Strip-Metadata` | No | Keep OData metadata if `false` |

### Health Route (`/health`)

```
GET /health              # Returns { status: 'healthy' } or 503
```

## Authentication Flow

### API Key Validation (auth.ts)

1. Extract `Bearer` token from Authorization header
2. Hash token with SHA-256
3. Find matching `apiKey` record by hash
4. Verify key is not revoked or expired
5. Resolve target instance + service from headers
6. Load permissions from `apiKeyAccess`
7. Store resolved data in Hono context

### Multi-level Auth Inheritance

When making SAP requests, auth credentials are resolved in order:
```
1. InstanceService auth (if configured)
2. SystemService auth (if configured)
3. Instance auth (default fallback)
```

### Supported Auth Types

| Type | Description |
|------|-------------|
| `none` | No authentication |
| `basic` | Username/password with CSRF token |
| `api_key` | Custom header with API key |
| `oauth2` | OAuth 2.0 client credentials |
| `custom` | Arbitrary header name/value |

## Rate Limiting

Redis-based rate limiting with two counters per API key:

| Limit | Default | Redis Key Pattern |
|-------|---------|-------------------|
| Per-minute | 60 | `rate:minute:{keyId}` |
| Per-day | 10,000 | `rate:day:{keyId}` |

Returns `429 Too Many Requests` when limits exceeded.

## Request Logging

Every proxy request is logged to `requestLogs` table:

| Field | Description |
|-------|-------------|
| `method` | HTTP method |
| `path` | Request path |
| `entity` | Parsed entity name (e.g., A_BusinessPartner) |
| `operation` | Operation type (read, create, update, delete) |
| `statusCode` | Response status |
| `responseTime` | Total latency in ms |
| `sapResponseTime` | SAP backend time in ms |
| `requestSize` | Request body size |
| `responseSize` | Response body size |
| `recordCount` | Number of records returned |
| `errorCode` | OData error code (if error) |
| `errorMessage` | Sanitized error message |

## Key Services

### sap-client.ts

Handles SAP HTTP requests:
- Auth header generation (Basic, API Key, OAuth, Custom)
- CSRF token fetching and caching
- OData query string building
- Response parsing and error handling

### access-resolver.ts

Permission checking:
```typescript
methodToOperation(method: string): 'read' | 'create' | 'update' | 'delete'
checkEntityPermission(entity: string, operation: string, permissions: Record<string, string[]>): boolean
```

### odata.ts

OData response processing:
- Extract `value` array from response
- Strip metadata annotations
- Parse error responses

### oauth-token.ts

OAuth 2.0 token management:
- Client credentials flow
- Token caching in Redis
- Automatic refresh

## Environment Variables

```env
PORT=3002
DATABASE_URL=postgresql://s4kit:s4kit_dev_password@localhost:5433/s4kit
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<32-byte hex key for libsodium>
```

## Hono Context Variables

```typescript
type Variables = {
  apiKey: ApiKey;
  instance: Instance;
  systemService: SystemService;
  instanceService: InstanceService;
  entityPermissions: Record<string, string[]>;
  logData?: RequestLogData;
};
```

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": "Additional context"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | No permission for entity/operation |
| `NOT_FOUND` | 404 | Entity or service not found |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SAP_ERROR` | 502 | Error from SAP backend |

## Common Tasks

### Adding a new middleware

1. Create file in `src/middleware/`
2. Export middleware function
3. Add to proxy route chain in `src/routes/proxy.ts`

```typescript
// src/middleware/my-middleware.ts
import { createMiddleware } from 'hono/factory';
import type { Variables } from '../types';

export const myMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    // Before request
    await next();
    // After request
  }
);
```

### Adding a new service

1. Create file in `src/services/`
2. Export service functions
3. Import in routes/middleware as needed

### Modifying proxy behavior

1. Edit `src/routes/proxy.ts` for route changes
2. Edit middleware for cross-cutting concerns
3. Edit services for business logic

## Dependencies

| Package | Purpose |
|---------|---------|
| hono | Web framework |
| @s4kit/shared | Shared schema, DB, cache |
| ky | HTTP client for SAP |

## Bun-Specific Notes

- Run with `bun run --hot src/index.ts` for development
- Bun auto-loads `.env` - no dotenv needed
- Use `bun run` for all npm scripts
- Uses `Bun.serve()` for HTTP server

## Scaling Considerations

The proxy service is stateless and can be horizontally scaled:
- Database connections are pooled
- Redis is used for shared state (rate limits, CSRF tokens)
- No session state - each request is independent

For high-traffic deployments:
- Run multiple proxy instances behind a load balancer
- Increase database pool size
- Consider Redis cluster for rate limiting
