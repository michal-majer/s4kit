# S4Kit POC Implementation Plan

## Overview

**Goal**: Build a working POC demonstrating the core value proposition - simple SAP S/4HANA integration via API keys, without complex SAP infrastructure setup.

**Scope**: Focus on Phase 1 (SDK MVP) + Phase 2 (Platform MVP) with minimal viable features to prove the concept.

**Success Criteria**:
- Developer can install SDK and make authenticated requests
- Platform can generate API keys and proxy requests to SAP
- Basic request logging works
- End-to-end flow: SDK → Platform → SAP → Response

---

## Architecture Overview

```
┌─────────────────┐
│   SDK (npm)     │  ← Developer's app
│   s4kit         │
└────────┬────────┘
         │ HTTPS + API Key
         │
┌────────▼─────────────────────────┐
│   Platform Backend (Hono)        │
│   ┌──────────────────────────┐   │
│   │ API Key Validation       │   │
│   │ Rate Limiting (Redis)    │   │
│   │ Request Logging (DB)     │   │
│   │ SAP Proxy                │   │
│   └──────────────────────────┘   │
└────────┬─────────────────────────┘
         │ HTTPS + SAP Credentials
         │
┌────────▼────────┐
│   SAP S/4HANA   │
└─────────────────┘
```

---

## Project Structure

```
s4kit/
├── packages/
│   ├── sdk/                    # npm package: s4kit
│   │   ├── src/
│   │   │   ├── client.ts       # Main S4Kit class
│   │   │   ├── proxy.ts        # Proxy pattern implementation
│   │   │   ├── query-builder.ts
│   │   │   ├── http-client.ts  # HTTPky wrapper
│   │   │   ├── types.ts
│   │   │   └── errors.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── platform/               # Platform backend + frontend
│       ├── backend/
│       │   ├── src/
│       │   │   ├── index.ts    # Hono server entry
│       │   │   ├── routes/
│       │   │   │   ├── api/
│       │   │   │   │   ├── proxy.ts    # SAP proxy endpoint
│       │   │   │   │   └── health.ts
│       │   │   │   └── admin/
│       │   │   │       ├── connections.ts
│       │   │   │       ├── api-keys.ts
│       │   │   │       └── logs.ts
│       │   │   ├── middleware/
│       │   │   │   ├── auth.ts         # API key validation
│       │   │   │   ├── rate-limit.ts   # Rate limiting
│       │   │   │   └── logging.ts      # Request logging
│       │   │   ├── services/
│       │   │   │   ├── sap-client.ts   # SAP HTTP client
│       │   │   │   ├── api-key.ts      # Key generation/validation
│       │   │   │   └── encryption.ts   # libsodium wrapper
│       │   │   ├── db/
│       │   │   │   ├── schema.ts       # Drizzle schema
│       │   │   │   ├── migrations/
│       │   │   │   └── index.ts
│       │   │   ├── cache/
│       │   │   │   └── redis.ts        # Redis client
│       │   │   └── types.ts
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   └── Dockerfile
│       │
│       └── frontend/
│           ├── app/                    # Next.js 15 App Router
│           │   ├── layout.tsx
│           │   ├── page.tsx           # Dashboard home
│           │   ├── (auth)/
│           │   │   └── login/
│           │   ├── (dashboard)/
│           │   │   ├── connections/
│           │   │   ├── api-keys/
│           │   │   └── logs/
│           │   └── api/                # API routes (Better-Auth)
│           ├── components/
│           │   ├── ui/                 # shadcn components
│           │   ├── connections/
│           │   ├── api-keys/
│           │   └── charts/
│           ├── lib/
│           │   ├── db.ts               # Drizzle client (shared)
│           │   └── auth.ts             # Better-Auth config
│           ├── package.json
│           ├── tsconfig.json
│           └── tailwind.config.ts
│
├── docker-compose.yml          # PostgreSQL + Redis
├── package.json                # Root workspace (pnpm/npm workspaces)
├── tsconfig.json               # Root TS config
└── README.md
```

---

## Phase 1: SDK MVP

### 1.1 Project Setup
- [X] Initialize monorepo (pnpm workspaces or npm workspaces)
- [X] Setup TypeScript configs (strict mode)
- [X] Create `packages/sdk` structure
- [X] Setup build tooling (tsup/esbuild for bundling)

### 1.2 Core Client (`S4Kit` class)
**File**: `packages/sdk/src/client.ts`

**Responsibilities**:
- Accept API key + platform URL in constructor
- Initialize HTTP client with base URL
- Expose proxy-based entity access

**API**:
```typescript
class S4Kit {
  constructor(apiKey: string, options?: { baseUrl?: string })
  // Proxy magic happens via getter
}
```

### 1.3 Proxy Pattern
**File**: `packages/sdk/src/proxy.ts`

**Implementation**:
- Return Proxy from S4Kit instance
- Intercept property access (e.g., `sap.businessPartner`)
- Return entity handler with CRUD methods
- Build OData URLs dynamically

**Entity Handler Interface**:
```typescript
{
  list(options?: QueryOptions): Promise<T[]>
  get(id: string, options?: QueryOptions): Promise<T>
  create(data: T): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}
```

### 1.4 Query Builder
**File**: `packages/sdk/src/query-builder.ts`

**Features**:
- `filter`: OData $filter syntax
- `select`: Field selection ($select)
- `expand`: Navigation properties ($expand)
- `top`: Limit results
- `skip`: Pagination
- `orderBy`: Sorting

**Type Safety**: Generic types for entity responses

### 1.5 HTTP Client
**File**: `packages/sdk/src/http-client.ts`

**Features**:
- Use HTTPky (lightweight, retry built-in)
- Handle CSRF tokens (X-CSRF-Token header)
- Automatic retry on 429/5xx
- Error transformation (SAP errors → SDK errors)
- Request/response interceptors

**Headers**:
- `Authorization: Bearer {apiKey}`
- `X-CSRF-Token: Fetch` (for POST/PUT/DELETE)
- `Content-Type: application/json`

### 1.6 Error Handling
**File**: `packages/sdk/src/errors.ts`

**Error Types**:
- `S4KitError` (base)
- `AuthenticationError` (401)
- `RateLimitError` (429, with retryAfter)
- `NotFoundError` (404)
- `ValidationError` (400)
- `ServerError` (5xx)
- `NetworkError` (timeout, connection)

### 1.7 Types & Exports
**File**: `packages/sdk/src/types.ts`

**Key Types**:
- `QueryOptions`
- `FilterOptions`
- `EntityResponse<T>`
- `S4KitConfig`

### 1.8 Package Configuration
- [ ] `package.json` with proper exports (ESM + CJS)
- [ ] Type definitions in `dist/`
- [ ] README with usage examples
- [ ] Build script (tsup/esbuild)

**Dependencies**:
- `ky` (HTTPky) - HTTP client
- `typescript` - Types

**Dev Dependencies**:
- `tsup` or `esbuild` - Bundling
- `@types/node` - Node types

---

## Phase 2: Platform MVP

### 2.1 Backend Setup
- [ ] Initialize Hono server
- [ ] Setup environment variables (.env)
- [ ] Database connection (Drizzle + PostgreSQL)
- [ ] Redis connection
- [ ] Error handling middleware

### 2.2 Database Schema
**File**: `packages/platform/backend/src/db/schema.ts`

**Tables**:

1. **organizations**
   - `id` (uuid, PK)
   - `name` (string)
   - `created_at` (timestamp)

2. **connections**
   - `id` (uuid, PK)
   - `organization_id` (uuid, FK)
   - `name` (string)
   - `base_url` (string) - SAP system URL
   - `username` (encrypted)
   - `password` (encrypted)
   - `environment` (enum: dev/staging/prod)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

3. **api_keys**
   - `id` (uuid, PK)
   - `organization_id` (uuid, FK)
   - `connection_id` (uuid, FK)
   - `key_hash` (string) - SHA-256 hash
   - `name` (string) - User-friendly name
   - `permissions` (jsonb) - Object mapping entity names to allowed methods: `{"SalesOrders": ["GET", "POST"], "Products": ["GET"]}`
   - `environment` (enum)
   - `rate_limit_per_minute` (integer)
   - `rate_limit_per_day` (integer)
   - `expires_at` (timestamp, nullable)
   - `revoked` (boolean, default false)
   - `created_at` (timestamp)
   - `last_used_at` (timestamp, nullable)

4. **request_logs**
   - `id` (uuid, PK)
   - `api_key_id` (uuid, FK)
   - `connection_id` (uuid, FK)
   - `method` (string) - HTTP method
   - `endpoint` (string) - OData path
   - `status_code` (integer)
   - `latency_ms` (integer)
   - `error_message` (text, nullable)
   - `created_at` (timestamp)
   - Index on: `created_at`, `api_key_id`, `connection_id`

**Migrations**: Use Drizzle migrations

### 2.3 Encryption Service
**File**: `packages/platform/backend/src/services/encryption.ts`

**Implementation**:
- Use libsodium for encryption at rest
- Encrypt/decrypt SAP credentials
- Key derivation from environment variable

**Functions**:
- `encrypt(plaintext: string): string`
- `decrypt(ciphertext: string): string`

### 2.4 API Key Service
**File**: `packages/platform/backend/src/services/api-key.ts`

**Functions**:
- `generateKey(): string` - Generate `sk_live_xxx` format
- `hashKey(key: string): string` - SHA-256
- `validateKey(key: string): Promise<ApiKeyRecord>`
- `checkScopes(key: ApiKeyRecord, entity: string, method: string): boolean`

### 2.5 SAP Client Service
**File**: `packages/platform/backend/src/services/sap-client.ts`

**Responsibilities**:
- Fetch SAP credentials from DB (decrypted)
- Make authenticated requests to SAP
- Handle CSRF token flow
- Transform SAP errors

**CSRF Flow**:
1. GET request with `X-CSRF-Token: Fetch` header
2. Extract token from response header
3. Use token in subsequent POST/PUT/DELETE

### 2.6 Middleware: API Key Auth
**File**: `packages/platform/backend/src/middleware/auth.ts`

**Flow**:
1. Extract API key from `Authorization: Bearer {key}` header
2. Hash key and lookup in DB
3. Check if revoked/expired
4. Attach key record to context
5. Return 401 if invalid

### 2.7 Middleware: Rate Limiting
**File**: `packages/platform/backend/src/middleware/rate-limit.ts`

**Implementation**:
- Redis sliding window counter
- Check per-minute limit
- Check per-day limit (separate counter)
- Return 429 with `Retry-After` header if exceeded

**Redis Keys**:
- `ratelimit:minute:{keyId}` - TTL: 60s
- `ratelimit:day:{keyId}` - TTL: 86400s

### 2.8 Middleware: Request Logging
**File**: `packages/platform/backend/src/middleware/logging.ts`

**Log After Response**:
- API key ID
- Connection ID
- Method + endpoint
- Status code
- Latency (ms)
- Error message (if any)

**Async**: Use background job or fire-and-forget

### 2.9 Proxy Route
**File**: `packages/platform/backend/src/routes/api/proxy.ts`

**Endpoint**: `POST /api/proxy/*` or `GET /api/proxy/*`

**Flow**:
1. Extract OData path from URL
2. Validate API key (middleware)
3. Check rate limits (middleware)
4. Check scopes (entity + method)
5. Fetch connection + decrypt credentials
6. Forward request to SAP
7. Log request (middleware)
8. Return response

**Path Parsing**:
- `/api/proxy/BusinessPartner` → SAP: `/sap/opu/odata/sap/API_BUSINESS_PARTNER/BusinessPartner`
- Support query params: `?$filter=...&$top=10`

### 2.10 Admin Routes (Basic)
**File**: `packages/platform/backend/src/routes/admin/`

**Endpoints**:
- `GET /admin/connections` - List connections
- `POST /admin/connections` - Create connection
- `GET /admin/api-keys` - List API keys
- `POST /admin/api-keys` - Generate new key
- `DELETE /admin/api-keys/:id` - Revoke key
- `GET /admin/logs` - Query request logs

**Auth**: Basic auth or API key for admin (separate from user API keys)

### 2.11 Frontend Setup (Minimal)
- [ ] Next.js 15 project
- [ ] shadcn/ui setup
- [ ] Better-Auth for authentication
- [ ] Basic layout

**Pages** (MVP):
- Login page
- Dashboard home (stats)
- Connections list + create form
- API keys list + generate form
- Request logs table

**Components**:
- Connection form (name, URL, username, password, environment)
- API key form (name, connection, scopes, limits, expiration)
- Logs table (with filters: date range, API key, status)

---

## Phase 3: Integration & Testing

### 3.1 End-to-End Flow
1. Create connection in platform
2. Generate API key
3. Install SDK in test app
4. Make request: `sap.businessPartner.list()`
5. Verify: Platform logs request, proxies to SAP, returns data

### 3.2 Error Scenarios
- Invalid API key → 401
- Expired key → 401
- Rate limit exceeded → 429
- Invalid scope → 403
- SAP connection failure → 502
- Invalid OData path → 404

### 3.3 Performance
- Measure latency overhead (Platform adds ~50-100ms?)
- Test rate limiting accuracy
- Verify Redis performance

---

## Dependencies Summary

### SDK
```json
{
  "dependencies": {
    "ky": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### Platform Backend
```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "ioredis": "^5.3.0",
    "libsodium-wrappers": "^0.7.13",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "drizzle-kit": "^0.20.0",
    "@types/node": "^20.0.0"
  }
}
```

### Platform Frontend
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.0.0",
    "better-auth": "^1.0.0",
    "@radix-ui/react-*": "...",
    "tailwindcss": "^3.4.0",
    "recharts": "^2.10.0"
  }
}
```

---

## Key Design Decisions

### 1. Monorepo Structure
**Why**: SDK and Platform share types, easier development
**Tool**: pnpm workspaces (faster, better disk usage)

### 2. Proxy Pattern (SDK)
**Why**: Zero code generation, lightweight, dynamic
**Trade-off**: Less type safety at compile time (runtime discovery)

### 3. API Key Format
**Format**: `sk_live_xxx` or `sk_test_xxx`
**Why**: Familiar (Stripe-like), easy to identify in logs

### 4. Rate Limiting Strategy
**Method**: Redis sliding window
**Why**: Fast, atomic, accurate
**Alternative considered**: Token bucket (more complex)

### 5. Encryption
**Library**: libsodium
**Why**: Modern, secure, well-audited
**Key Management**: Environment variable (MVP), Vault later

### 6. Request Logging
**Storage**: PostgreSQL (partitioned by date)
**Why**: Queryable, relational, can join with API keys/connections
**Trade-off**: Slower than time-series DB, but simpler

### 7. CSRF Handling
**Strategy**: Auto-fetch token on first POST/PUT/DELETE
**Why**: Transparent to SDK user
**Caching**: Cache token per connection (Redis, TTL: 1 hour)

---

## Risk & Considerations

### 1. SAP OData Complexity
**Risk**: Different SAP versions, custom entities, authentication methods
**Mitigation**: Start with standard OData v2, document assumptions

### 2. Performance Overhead
**Risk**: Platform adds latency
**Mitigation**: Measure, optimize hot paths, consider connection pooling

### 3. Security
**Risk**: API key leakage, credential storage
**Mitigation**: 
- Hash keys (never store plaintext)
- Encrypt credentials at rest
- HTTPS only
- Rate limiting prevents abuse

### 4. Scalability
**Risk**: Single platform instance may not scale
**Mitigation**: Stateless design, horizontal scaling ready (Redis shared)

### 5. Type Safety (SDK)
**Risk**: Proxy pattern = less compile-time safety
**Mitigation**: Runtime validation, good error messages, consider schema registry later

---

## MVP Scope Boundaries

### ✅ Included
- Basic CRUD operations (list, get, create, update, delete)
- Query builder (filter, select, top, skip)
- API key authentication
- Rate limiting (per minute, per day)
- Request logging
- Connection management
- Basic dashboard

### ❌ Excluded (for POC)
- Monitoring dashboards (Phase 3)
- Alerting (Phase 4)
- Audit log export (Phase 4)
- Multi-tenant organizations (simplify: single org)
- API key rotation reminders
- Burst allowance (simple fixed limits)
- Advanced error retry logic
- Webhook notifications

---

## Next Steps After Planning

1. **Review & Adjust**: Validate plan with stakeholders
2. **Setup Infrastructure**: Docker Compose for PostgreSQL + Redis
3. **Start Phase 1**: Build SDK first (can test independently)
4. **Iterate**: Build Platform alongside SDK testing
5. **Document**: Keep README updated with examples

---

## Questions to Resolve

1. **SAP Authentication**: Basic auth only, or support OAuth2/SAML?
   - **POC Decision**: Basic auth only (simplest)

2. **OData Version**: v2 or v4?
   - **POC Decision**: v2 (more common in S/4HANA)

3. **Entity Discovery**: How does SDK know available entities?
   - **POC Decision**: Manual/dynamic (no schema registry yet)

4. **Error Format**: Standardize error responses?
   - **POC Decision**: RFC 7807 Problem Details format

5. **CORS**: Platform needs CORS for browser SDK usage?
   - **POC Decision**: Not needed (SDK is Node.js only initially)

---

## Success Metrics (POC)

- ✅ SDK can make authenticated request to Platform
- ✅ Platform validates API key and proxies to SAP
- ✅ Request is logged in database
- ✅ Rate limiting works (test with burst)
- ✅ Error handling works (invalid key, expired, rate limit)
- ✅ End-to-end latency < 200ms overhead
- ✅ Developer can create connection + API key in < 5 minutes

---

**Status**: Planning Complete ✅
**Next**: Begin Phase 1 implementation
