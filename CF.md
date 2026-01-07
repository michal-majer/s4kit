# Cloud Foundry Deployment Guide

This guide covers deploying S4Kit to SAP BTP Cloud Foundry or any Cloud Foundry environment.

## Prerequisites

- [Cloud Foundry CLI](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) installed
- Logged into CF: `cf login`
- Target space selected: `cf target -o <org> -s <space>`

## Architecture

S4Kit consists of three applications:

| App | Purpose | Port |
|-----|---------|------|
| `s4kit-backend` | Admin API + Authentication | 8080 |
| `s4kit-proxy` | SDK Proxy Service | 8080 |
| `s4kit-frontend` | Next.js Dashboard | 8080 |

All apps use the [Bun buildpack](https://github.com/michal-majer/cloudfoundry-buildpack-bun) for runtime.

## Step 1: Create Services

S4Kit requires PostgreSQL and Redis. You can use managed services or external providers.

### Option A: External Database (Railway, Neon, etc.)

Create user-provided services with connection strings:

```bash
# PostgreSQL
cf create-user-provided-service s4kit-postgres -p '{"uri":"postgresql://user:pass@host:port/database"}'

# Redis
cf create-user-provided-service s4kit-redis -p '{"uri":"redis://user:pass@host:port"}'
```

### Option B: SAP BTP Managed Services

```bash
# PostgreSQL on Hyperscaler
cf create-service postgresql-db standard s4kit-postgres

# Redis on Hyperscaler
cf create-service redis-cache standard s4kit-redis
```

### Secrets Service

Create a user-provided service for secrets:

```bash
# Generate encryption key (32 bytes hex)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Generate auth secret
BETTER_AUTH_SECRET=$(openssl rand -base64 32)

cf create-user-provided-service s4kit-secrets -p "{
  \"ENCRYPTION_KEY\": \"$ENCRYPTION_KEY\",
  \"BETTER_AUTH_SECRET\": \"$BETTER_AUTH_SECRET\"
}"
```

## Step 2: Deploy Backend

```bash
# From monorepo root
cf push -f packages/platform/backend/manifest.yml
```

### Backend Environment Variables

Set after deployment (optional):

```bash
# Optional: Change mode (default: selfhost)
# - selfhost: Single tenant, no signup
# - saas: Multi-tenant with signup
cf set-env s4kit-backend MODE saas

# Restart to apply
cf restart s4kit-backend
```

> **Note:** `COOKIE_DOMAIN` and `BETTER_AUTH_URL` are auto-detected from `VCAP_APPLICATION` on Cloud Foundry. No manual configuration needed.

## Step 3: Deploy Proxy

```bash
# From monorepo root
cf push -f packages/platform/proxy/manifest.yml
```

No additional configuration needed - proxy reads from bound services.

## Step 4: Deploy Frontend

The frontend requires a build step with the backend URL baked in:

```bash
cd packages/platform/frontend

# Set backend URL and deploy
NEXT_PUBLIC_API_URL=https://s4kit-backend.cfapps.us10-001.hana.ondemand.com ./deploy-cf.sh
```

The script:
1. Builds Next.js with standalone output
2. Packages for nodejs_buildpack
3. Deploys to CF

## Configuration Reference

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODE` | `selfhost` | Platform mode: `selfhost` or `saas` |
| `FRONTEND_URL` | (from manifest) | Frontend URL for CORS/redirects |
| `COOKIE_DOMAIN` | - | Domain for cross-subdomain cookies |
| `BETTER_AUTH_URL` | auto-detected | Backend URL for auth callbacks |

### Secrets (from s4kit-secrets service)

| Secret | Description |
|--------|-------------|
| `ENCRYPTION_KEY` | 32-byte hex key for encrypting credentials |
| `BETTER_AUTH_SECRET` | Secret for session signing |

### Database/Cache (auto-detected from VCAP_SERVICES)

The apps automatically detect connection strings from bound services:
- PostgreSQL: `s4kit-postgres` service
- Redis: `s4kit-redis` service

## Updating Routes

Edit manifest files to change routes:

```yaml
# packages/platform/backend/manifest.yml
routes:
  - route: your-backend.cfapps.your-region.hana.ondemand.com
```

After changing routes, update:
1. `FRONTEND_URL` in backend manifest
2. `NEXT_PUBLIC_API_URL` when building frontend
3. `COOKIE_DOMAIN` if domain changes

## Scaling

```bash
# Scale proxy for more throughput
cf scale s4kit-proxy -i 3

# Scale backend
cf scale s4kit-backend -i 2
```

## Logs

```bash
cf logs s4kit-backend --recent
cf logs s4kit-proxy --recent
cf logs s4kit-frontend --recent
```

## Health Checks

| App | Endpoint |
|-----|----------|
| Backend | `/health` |
| Proxy | `/health/live` |
| Frontend | `/` |

## Troubleshooting

### "Cannot find module" errors
The Bun buildpack caches `node_modules`. Clear cache:
```bash
cf restage s4kit-backend --no-cache
```

### Redis connection refused
Check that `s4kit-redis` service is bound and has correct `uri` in credentials:
```bash
cf env s4kit-backend | grep -A5 s4kit-redis
```

### Cookies not working (login redirects to home)
`COOKIE_DOMAIN` is auto-detected from `VCAP_APPLICATION`. If issues persist, set manually:
```bash
cf set-env s4kit-backend COOKIE_DOMAIN ".cfapps.us10-001.hana.ondemand.com"
cf restart s4kit-backend
```

### Frontend shows wrong API URL
Rebuild frontend with correct URL:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url ./deploy-cf.sh
```

## Complete Deployment Script

```bash
#!/bin/bash
set -e

REGION="us10-001"  # Change for your region
DOMAIN="cfapps.${REGION}.hana.ondemand.com"

# 1. Create services (skip if already exist)
cf create-user-provided-service s4kit-postgres -p '{"uri":"YOUR_POSTGRES_URL"}' || true
cf create-user-provided-service s4kit-redis -p '{"uri":"YOUR_REDIS_URL"}' || true
cf create-user-provided-service s4kit-secrets -p "{
  \"ENCRYPTION_KEY\": \"$(openssl rand -hex 32)\",
  \"BETTER_AUTH_SECRET\": \"$(openssl rand -base64 32)\"
}" || true

# 2. Deploy backend (COOKIE_DOMAIN auto-detected from VCAP_APPLICATION)
cf push -f packages/platform/backend/manifest.yml

# 3. Deploy proxy
cf push -f packages/platform/proxy/manifest.yml

# 4. Deploy frontend
cd packages/platform/frontend
NEXT_PUBLIC_API_URL="https://s4kit-backend.${DOMAIN}" ./deploy-cf.sh

echo "Deployment complete!"
echo "Frontend: https://s4kit-frontend.${DOMAIN}"
echo "Backend:  https://s4kit-backend.${DOMAIN}"
echo "Proxy:    https://s4kit-proxy.${DOMAIN}"
```
