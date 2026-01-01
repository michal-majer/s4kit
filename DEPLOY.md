# S4Kit Deployment Checklist

This document outlines all steps required before deploying S4Kit to production.

---

## 1. CI/CD Fixes Required

These items are currently disabled or skipped in CI and should be addressed:

- [ ] **Docker build job** - Disabled due to monorepo workspace dependency resolution
  - Fix: Update Dockerfiles to properly copy workspace packages
  - File: `.github/workflows/ci.yml` line 122 (`if: false`)

- [ ] **Backend integration tests** - Skipped (unit tests only)
  - Currently running: `bun test test/unit`
  - TODO: Fix environment-specific test failures

- [ ] **Proxy tests** - No test files exist
  - Create: `packages/platform/proxy/test/`

- [ ] **Frontend lint** - Non-blocking (76 pre-existing errors)
  - File: `.github/workflows/ci.yml` line 39 (`continue-on-error: true`)
  - Fix remaining ESLint errors before production

---

## 2. Infrastructure Setup

### DNS Configuration
- [ ] Configure A record for `api.s4kit.com` pointing to server IP
- [ ] Configure A record for `app.s4kit.com` (or use same server)

### SSL/TLS Certificates
- [ ] Obtain SSL certificates (Let's Encrypt recommended)
- [ ] Place certificates in `docker/certs/`
- [ ] Uncomment HTTPS section in `docker/nginx.conf` (lines 157-168)

### Database (PostgreSQL 16)
- [ ] Provision PostgreSQL 16 instance
- [ ] Create database and user
- [ ] Configure connection pooling (recommended: PgBouncer)
- [ ] Set up automated backups

### Cache (Redis 7)
- [ ] Provision Redis 7 instance
- [ ] Configure persistence (AOF recommended)
- [ ] Set appropriate memory limits

---

## 3. Environment Variables

### Backend (`packages/platform/backend`)

```bash
# Required
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/s4kit
REDIS_URL=redis://host:6379
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
FRONTEND_URL=https://app.s4kit.com

# Platform Mode
MODE=selfhost  # or 'saas' for multi-tenant

# Self-hosted Initial Admin (MODE=selfhost only)
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=<strong-password>
ADMIN_NAME=Administrator
ORGANIZATION_NAME=Your Company

# OAuth Providers (MODE=saas only, optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Proxy (`packages/platform/proxy`)

```bash
PORT=3002
DATABASE_URL=<same as backend>
REDIS_URL=<same as backend>
ENCRYPTION_KEY=<same as backend>
```

### Frontend (`packages/platform/frontend`)

```bash
NEXT_PUBLIC_API_URL=https://api.s4kit.com
```

---

## 4. Security Checklist

- [ ] **Generate production ENCRYPTION_KEY**
  ```bash
  openssl rand -hex 32
  ```
  Store securely - losing this key means losing access to encrypted credentials

- [ ] **Generate BETTER_AUTH_SECRET**
  ```bash
  openssl rand -base64 32
  ```

- [ ] **Review credentials** - Ensure no dev/test credentials in production config

- [ ] **Configure CORS** - Set `FRONTEND_URL` to production domain

- [ ] **Enable HTTPS-only** - Uncomment SSL config in nginx.conf

- [ ] **Firewall rules** - Only expose ports 80/443 externally

- [ ] **Database access** - Restrict to application servers only

---

## 5. Database Setup

Run these commands from `packages/platform/backend`:

```bash
# 1. Run all migrations
bun run db:migrate

# 2. Seed predefined SAP services (1,049 APIs)
bun run db:seed

# 3. Create admin user (selfhost mode only)
bun run db:setup-admin
```

### Backup Strategy
- [ ] Configure daily automated backups
- [ ] Test restore procedure
- [ ] Set retention policy (recommended: 30 days)

---

## 6. Docker Deployment

### Build Images

```bash
# From repository root
docker build -f packages/platform/backend/Dockerfile -t s4kit/admin .
docker build -f packages/platform/proxy/Dockerfile -t s4kit/proxy .
docker build -f packages/platform/frontend/Dockerfile -t s4kit/frontend .
```

### Production Deployment

```bash
# Copy and configure
cp docker/docker-compose.prod.yml docker-compose.yml

# Create .env file with production values
# Edit docker-compose.yml as needed

# Start services
docker-compose up -d
```

### Resource Recommendations

| Service | Replicas | CPU | Memory |
|---------|----------|-----|--------|
| Proxy   | 3        | 1   | 512MB  |
| Admin   | 2        | 1   | 512MB  |
| Frontend| 2        | 0.5 | 256MB  |

---

## 7. Health Checks

All services expose health endpoints:

| Service  | Endpoint            | Port |
|----------|---------------------|------|
| Backend  | `/health`           | 3000 |
| Proxy    | `/health/ready`     | 3002 |
| Frontend | `/` (HTTP 200)      | 3001 |

### Nginx Health Check
```
GET /health → Backend /health
```

---

## 8. Post-Deployment Verification

- [ ] Access frontend at `https://app.s4kit.com`
- [ ] Login with admin credentials
- [ ] Create a test system and instance
- [ ] Generate an API key
- [ ] Test SDK connection with the API key
- [ ] Verify request logs are being captured

---

## 9. Monitoring (Recommended)

- [ ] **Uptime monitoring** - Monitor health endpoints
- [ ] **Log aggregation** - Collect logs from all containers
- [ ] **Error tracking** - Sentry or similar for exception tracking
- [ ] **Metrics** - Prometheus + Grafana for performance metrics

---

## Quick Start (Development Reference)

```bash
# Start dev infrastructure
docker-compose up -d

# Install dependencies
bun install

# Setup database
cd packages/platform/backend
bun run db:push
bun run db:seed

# Start services (separate terminals)
cd packages/platform/backend && bun run dev    # Port 3000
cd packages/platform/proxy && bun run dev      # Port 3002
cd packages/platform/frontend && bun run dev   # Port 3001
```
