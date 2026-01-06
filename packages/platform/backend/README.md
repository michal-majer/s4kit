To install dependencies:
```sh
bun install
```

## Database Setup

### Using Docker Compose (Recommended)

The project includes a Docker Compose configuration at the root level for easy PostgreSQL setup.

1. **Start PostgreSQL:**
   ```sh
   # From project root
   docker-compose up -d postgres
   ```

2. **Start with pgAdmin (optional database management UI):**
   ```sh
   docker-compose --profile tools up -d
   ```
   Then access pgAdmin at http://localhost:5050

3. **Stop services:**
   ```sh
   docker-compose down
   ```

4. **View logs:**
   ```sh
   docker-compose logs -f postgres
   ```

### Database Migrations

The project uses [Drizzle ORM](https://orm.drizzle.team/) for database management.

**Available scripts:**
- `bun run db:generate` - Generate migration files from schema changes
- `bun run db:push` - Push schema changes directly to database (development only)
- `bun run db:migrate` - Run pending migrations
- `bun run db:studio` - Open Drizzle Studio (database GUI)

**Initial setup:**
```sh
# Generate initial migration
bun run db:generate

# Apply migrations to database
bun run db:push
# OR use migrations (recommended for production)
bun run db:migrate
```

**Schema location:** `src/db/schema.ts`

## Environment Variables

The backend uses Hono's `env()` helper from `hono/adapter` to access environment variables. On Bun, this reads from `Bun.env` or `process.env`.

Create a `.env` file in the backend directory (copy from `.env.example`):

```sh
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

See `.env.example` for all available configuration options.

## Running the Server

```sh
bun run dev
```

Open http://localhost:3000

## Proxy Service

The proxy service runs on port 3002 and handles SDK requests. See `packages/platform/proxy/` for details.

### Proxy Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token with API key (`Bearer sk_live_...`) |
| `X-S4Kit-Service` | No | Service alias (auto-resolved from entity name) |
| `X-S4Kit-Instance` | No | Target instance environment |
| `X-S4Kit-Raw` | No | Return raw OData response if `true` |

### Instance Selection

When an API key has access to multiple instances for the same service and no `X-S4Kit-Instance` header is provided, the proxy automatically selects the **highest-level instance**:

**Priority order:** `production` > `preprod` > `quality` > `dev` > `sandbox`

To target a specific instance, include the header:
```
X-S4Kit-Instance: sandbox
```
