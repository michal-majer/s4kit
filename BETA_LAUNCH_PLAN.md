# S4Kit Beta Launch Plan

## Current Status Assessment

**Implementation Progress: ~55-60% complete**

### What's Working
- SDK core functionality (client, proxy, query builder)
- Backend SAP proxy with authentication inheritance
- API key system with rate limiting
- Multi-tenant database schema
- Frontend admin dashboard (systems, services, API keys)
- Type generation from OData metadata
- Docker Compose for local development

### Critical Gaps for Beta
- No admin authentication (dashboard is public)
- No production deployment infrastructure
- No automated tests for backend/frontend
- Limited error handling
- No monitoring/observability
- CORS allows all origins

---

## Beta Launch Requirements

### Priority Legend
- 🔴 **P0 - Blocker**: Must have before any real users
- 🟠 **P1 - Critical**: Required for beta launch
- 🟡 **P2 - Important**: Should have for good beta experience
- 🟢 **P3 - Nice to have**: Can add during beta

---

## Phase 1: Security Hardening (P0)

### 1.1 Admin Authentication
- [ ] Implement authentication system for admin dashboard
  - Option A: Email/password with magic links (simpler)
  - Option B: OAuth providers (Google, GitHub)
  - Recommendation: Start with email magic links
- [ ] Add session management with secure cookies
- [ ] Protect all `/admin/*` routes with auth middleware
- [ ] Add logout functionality
- [ ] Implement password reset flow (if using passwords)

**Files to modify:**
- `packages/platform/backend/src/routes/admin/` - Add auth checks
- `packages/platform/backend/src/middleware/` - Add admin-auth.ts
- `packages/platform/frontend/app/` - Add login page and auth context
- `packages/platform/backend/src/db/schema.ts` - Add users table

### 1.2 CORS Configuration
- [ ] Restrict CORS to allowed origins
- [ ] Configure per-environment (localhost for dev, specific domains for prod)
- [ ] Add CORS preflight caching

**Files to modify:**
- `packages/platform/backend/src/index.ts` - Update CORS middleware

### 1.3 Input Validation & Sanitization
- [ ] Add Zod validation to all API endpoints
- [ ] Validate and sanitize OData query parameters
- [ ] Add request body size limits
- [ ] Sanitize log entries (prevent log injection)

### 1.4 Secrets Management
- [ ] Move from .env to secure secrets manager (consider Doppler, Vault, or cloud provider)
- [ ] Rotate encryption key on deployment
- [ ] Add credential expiration warnings

---

## Phase 2: Reliability & Testing (P1)

### 2.1 Backend Tests
- [ ] Unit tests for services
  - `api-key.ts` - Key generation, hashing, validation
  - `access-resolver.ts` - Permission checking logic
  - `encryption.ts` - Encrypt/decrypt operations
  - `sap-client.ts` - Request building, auth handling
  - `metadata-parser.ts` - OData metadata parsing
  - `type-generator.ts` - TypeScript generation
- [ ] Integration tests for routes
  - Admin CRUD operations
  - Proxy authentication flow
  - Rate limiting behavior
  - Error responses
- [ ] Mock SAP responses for deterministic testing

**Target: 70%+ code coverage for services**

### 2.2 Frontend Tests
- [ ] Component tests with Vitest + Testing Library
- [ ] Form validation tests
- [ ] API error handling tests
- [ ] E2E tests with Playwright for critical paths:
  - Create system → add instance → configure service → generate API key
  - Use API key to proxy request

### 2.3 SDK Tests Enhancement
- [ ] Add unit tests (currently only integration tests)
- [ ] Add error handling tests
- [ ] Test edge cases (empty responses, large payloads)

### 2.4 Error Handling
- [ ] Implement custom error classes in SDK (`packages/sdk/src/errors.ts`)
  - `S4KitError` (base)
  - `AuthenticationError`
  - `RateLimitError`
  - `SAPError`
  - `ValidationError`
- [ ] Consistent error response format across all endpoints
- [ ] User-friendly error messages (don't expose internals)
- [ ] Add error codes for programmatic handling

---

## Phase 3: Production Infrastructure (P1)

### 3.1 Containerization
- [ ] Create Dockerfile for backend
  - Multi-stage build (build → runtime)
  - Non-root user
  - Health check command
- [ ] Create Dockerfile for frontend
  - Next.js standalone output
  - Static asset optimization
- [ ] Create docker-compose.prod.yml
  - Production PostgreSQL config
  - Redis with persistence
  - Reverse proxy (Traefik/nginx)

### 3.2 Deployment Pipeline
- [ ] Set up CI/CD (GitHub Actions recommended)
  - Lint check
  - Type check
  - Test execution
  - Build verification
  - Container build & push
- [ ] Deploy target options:
  - Option A: Railway/Render (simpler, managed)
  - Option B: AWS ECS/GCP Cloud Run (more control)
  - Option C: Kubernetes (complex, for scale)
  - Recommendation: Start with Railway for backend, Vercel for frontend
- [ ] Set up staging environment
- [ ] Configure production database (managed PostgreSQL)
- [ ] Configure production Redis (managed Redis)

### 3.3 Database Production Readiness
- [ ] Set up connection pooling (PgBouncer or Drizzle pool)
- [ ] Configure automated backups
- [ ] Set up point-in-time recovery
- [ ] Create database migration strategy for production
- [ ] Add database indexes for query performance:
  - `apiKeys(keyPrefix)` - For key lookups
  - `requestLogs(createdAt, apiKeyId)` - For log queries
  - `instanceServices(instanceId, systemServiceId)` - For service resolution

### 3.4 Health & Readiness
- [ ] Expand `/health` endpoint to check:
  - Database connectivity
  - Redis connectivity
  - Disk space (if applicable)
- [ ] Add `/ready` endpoint for orchestrators
- [ ] Add graceful shutdown handling

---

## Phase 4: Observability (P1)

### 4.1 Logging
- [ ] Structured JSON logging (pino or winston)
- [ ] Log levels (debug, info, warn, error)
- [ ] Request correlation IDs
- [ ] Log aggregation setup (options):
  - Datadog
  - CloudWatch
  - Grafana Loki
  - Axiom (simpler, pay-as-you-go)

### 4.2 Metrics
- [ ] Prometheus metrics endpoint
- [ ] Key metrics to track:
  - Request count by endpoint
  - Request latency (p50, p95, p99)
  - SAP backend latency
  - Error rate by type
  - Active API keys
  - Rate limit hits
- [ ] Grafana dashboards (or use provider's built-in)

### 4.3 Alerting
- [ ] Set up alert channels (Slack, email, PagerDuty)
- [ ] Critical alerts:
  - Error rate > 5%
  - P99 latency > 5s
  - Database connection failures
  - Redis connection failures
- [ ] Warning alerts:
  - Rate limit approaching
  - Disk usage > 80%

### 4.4 Error Tracking
- [ ] Integrate Sentry or similar
- [ ] Source maps for frontend errors
- [ ] Backend error grouping
- [ ] User context in errors (API key prefix, not full key)

---

## Phase 5: User Experience (P2)

### 5.1 Onboarding Flow
- [ ] Welcome page for new organizations
- [ ] Guided setup wizard:
  1. Create your first system
  2. Add an instance
  3. Configure a service
  4. Generate an API key
  5. Test the connection
- [ ] Interactive API key test (try a request from dashboard)
- [ ] Copy-paste code snippets with user's API key

### 5.2 Documentation
- [ ] API documentation (OpenAPI/Swagger)
  - Generate from Hono routes
  - Host on `/docs` endpoint
- [ ] User guide (Docusaurus or similar)
  - Getting started
  - SDK reference
  - Authentication setup
  - Common use cases
- [ ] Inline help in dashboard
- [ ] Video tutorials (optional, nice to have)

### 5.3 SDK CLI Tool
- [ ] Create `@s4kit/cli` package
  - `s4kit init` - Initialize project with config
  - `s4kit generate` - Generate types from API key
  - `s4kit test` - Test connection
- [ ] npx support (`npx @s4kit/cli generate`)

### 5.4 Dashboard Improvements
- [ ] Real-time request log viewer
- [ ] API key usage analytics charts
- [ ] Service health status (last check, latency)
- [ ] Quick actions from dashboard home

---

## Phase 6: Beta Features (P2)

### 6.1 Organization Management
- [ ] Invite team members
- [ ] Role-based access (admin, developer, viewer)
- [ ] Organization settings page

### 6.2 Billing Preparation
- [ ] Usage tracking per organization
- [ ] Usage limits by tier
- [ ] Stripe integration (or prepare for it)
- [ ] Usage dashboard

### 6.3 Rate Limiting Improvements
- [ ] Per-organization limits
- [ ] Burst allowance
- [ ] Rate limit headers in responses
- [ ] Dashboard to view rate limit status

### 6.4 Webhook Notifications
- [ ] Webhook registration for events:
  - Rate limit exceeded
  - API key expiring
  - Request errors
- [ ] Webhook signature verification

---

## Phase 7: Polish (P3)

### 7.1 Performance
- [ ] OData metadata caching in Redis
- [ ] Response caching for GET requests
- [ ] Gzip/Brotli compression
- [ ] CDN for static assets

### 7.2 Advanced Features
- [ ] OAuth2 client credentials flow for SAP
- [ ] Batch request support ($batch)
- [ ] Request/response transformations
- [ ] Custom entity mappings

### 7.3 Developer Experience
- [ ] SDK autocomplete for entity names
- [ ] Better TypeScript error messages
- [ ] Debug mode with request logging
- [ ] Mock server for testing without SAP

---

## Recommended Beta Launch Timeline

### Week 1-2: Security & Critical Fixes (P0)
- Admin authentication
- CORS restrictions
- Input validation
- Basic error handling

### Week 3-4: Testing & Reliability (P1)
- Backend unit tests
- Integration tests
- Error classes
- Health checks

### Week 5-6: Deployment Infrastructure (P1)
- Dockerfiles
- CI/CD pipeline
- Staging environment
- Production database

### Week 7-8: Observability & Documentation (P1)
- Logging & metrics
- Error tracking
- API documentation
- User guide (minimal)

### Week 9-10: Onboarding & Polish (P2)
- Onboarding wizard
- Dashboard improvements
- CLI tool (basic)
- Beta user testing

---

## Minimum Viable Beta Checklist

Before inviting any real users, these MUST be complete:

- [ ] Admin authentication working
- [ ] CORS restricted to allowed origins
- [ ] All admin routes require authentication
- [ ] Backend deployed to production environment
- [ ] Frontend deployed to production environment
- [ ] Production database with backups
- [ ] Production Redis
- [ ] CI/CD pipeline running
- [ ] Error tracking enabled
- [ ] Basic logging in place
- [ ] Health check endpoint working
- [ ] API documentation available
- [ ] Getting started guide written
- [ ] At least one successful end-to-end test
- [ ] Rate limiting tested and tuned
- [ ] Security review completed

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SAP credentials exposed | Critical | Encryption at rest, audit logs, key rotation |
| API keys leaked | High | Key prefix for identification, instant revocation, rate limits |
| Service unavailable | Medium | Health checks, auto-restart, redundancy |
| Data loss | High | Automated backups, PITR, replication |
| Rate limit abuse | Medium | Per-key limits, organization limits, monitoring |
| Unauthorized access | Critical | Authentication, RBAC, audit logs |

---

## Success Metrics for Beta

### Technical
- 99.5% uptime
- P95 latency < 500ms (excluding SAP response time)
- Zero security incidents
- < 1% error rate

### User
- 10+ beta organizations
- 50+ API keys created
- 1000+ proxy requests per day
- NPS > 30

### Development
- 70% test coverage
- < 24h bug fix turnaround
- Weekly releases
