# Contributing to S4Kit

Thanks for your interest in contributing! This guide will help you get started with local development.

## Prerequisites

- **Bun** 1.3.4+ ([install](https://bun.sh))
- **Docker** & Docker Compose ([install](https://www.docker.com/products/docker-desktop))
- **Git**

## Quick Setup

```bash
# Clone and install dependencies
git clone https://github.com/michal-majer/s4kit.git
cd s4kit
bun install

# Start database services
docker compose up -d postgres redis

# Initialize database
cd packages/platform/backend
bun x drizzle-kit push --force
bun run db:seed
bun run db:setup-admin
```

## Development

Start the development servers (use 3 terminals or a process manager):

```bash
# Terminal 1 - Backend API
cd packages/platform/backend
bun run dev  # http://localhost:3000

# Terminal 2 - Frontend Dashboard
cd packages/platform/frontend
bun run dev  # http://localhost:3001

# Terminal 3 - Proxy Service
cd packages/platform/proxy
bun run dev  # http://localhost:3002
```

**Login**: admin@example.com / changeme123 (from .env)

## Running Tests

```bash
# Backend tests
cd packages/platform/backend
bun test

# Frontend E2E tests
cd packages/platform/frontend
bun run test:e2e
```

## Project Structure

- `packages/sdk/` - NPM client library + CLI
- `packages/platform/backend/` - Admin API (Hono.js)
- `packages/platform/frontend/` - Dashboard (Next.js)
- `packages/platform/proxy/` - SDK proxy service
- `packages/shared/` - Shared database schema and utilities

## Database Management

```bash
cd packages/platform/backend

bun run db:studio      # Open Drizzle Studio (visual editor)
bun run db:reset       # Reset and re-seed database
bun run db:push        # Push schema changes
```

## Need Help?

- See [CLAUDE.md](./CLAUDE.md) for detailed architecture and patterns
- Check existing [issues](https://github.com/michal-majer/s4kit/issues)
- Backend docs: [packages/platform/backend/CLAUDE.md](./packages/platform/backend/CLAUDE.md)
- Frontend docs: [packages/platform/frontend/CLAUDE.md](./packages/platform/frontend/CLAUDE.md)
- SDK docs: [packages/sdk/CLAUDE.md](./packages/sdk/CLAUDE.md)
