import { Hono } from 'hono';
import { db } from '../../db';
import { requestLogs, apiKeys, instances, systems } from '../../db/schema';
import { desc, eq, and, gte, lte, sql, inArray, count } from 'drizzle-orm';
import { requirePermission, type SessionVariables } from '../../middleware/session-auth';

const app = new Hono<{ Variables: SessionVariables }>();

/**
 * List request logs with filtering (filtered to organization's API keys)
 *
 * Query parameters:
 * - apiKeyId: Filter by specific API key
 * - systemId: Filter by system
 * - environment: Filter by instance environment (sandbox, dev, quality, preprod, production)
 * - entity: Filter by entity name
 * - operation: Filter by operation type (read, create, update, delete)
 * - success: Filter by success status (true/false)
 * - statusCode: Filter by HTTP status code
 * - requestId: Filter by request ID (correlation ID)
 * - errorCategory: Filter by error category
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - limit: Max results (default 100, max 1000)
 * - offset: Pagination offset
 */
app.get('/', requirePermission('logs:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const {
    apiKeyId,
    systemId,
    environment,
    entity,
    operation,
    success,
    statusCode,
    requestId,
    errorCategory,
    from,
    to,
    limit: limitParam,
    offset: offsetParam,
  } = c.req.query();

  // Get all API keys for this organization to filter logs
  const orgApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, organizationId),
    columns: { id: true },
  });
  const orgApiKeyIds = orgApiKeys.map((k) => k.id);

  if (orgApiKeyIds.length === 0) {
    return c.json({
      data: [],
      pagination: { limit: 100, offset: 0, hasMore: false },
    });
  }

  // Build filter conditions
  const conditions = [inArray(requestLogs.apiKeyId, orgApiKeyIds)];

  if (apiKeyId) {
    // Verify the requested API key belongs to the organization
    if (!orgApiKeyIds.includes(apiKeyId)) {
      return c.json({ error: 'API key not found' }, 404);
    }
    conditions.push(eq(requestLogs.apiKeyId, apiKeyId));
  }

  if (systemId) {
    conditions.push(eq(requestLogs.systemId, systemId));
  }

  if (environment) {
    // Filter by instance environment - get instances for this org with this environment
    // Join through systems to filter by organizationId
    const instancesWithEnv = await db
      .select({ id: instances.id })
      .from(instances)
      .innerJoin(systems, eq(instances.systemId, systems.id))
      .where(and(
        eq(systems.organizationId, organizationId),
        eq(instances.environment, environment as 'sandbox' | 'dev' | 'quality' | 'preprod' | 'production')
      ));

    const instanceIds = instancesWithEnv.map((i) => i.id);
    if (instanceIds.length > 0) {
      conditions.push(inArray(requestLogs.instanceId, instanceIds));
    } else {
      // No instances with this environment - return empty result
      return c.json({
        data: [],
        pagination: { limit: 100, offset: 0, hasMore: false, total: 0 },
      });
    }
  }

  if (entity) {
    conditions.push(eq(requestLogs.entity, entity));
  }

  if (operation) {
    conditions.push(eq(requestLogs.operation, operation));
  }

  if (success !== undefined) {
    conditions.push(eq(requestLogs.success, success === 'true'));
  }

  if (errorCategory) {
    conditions.push(eq(requestLogs.errorCategory, errorCategory));
  }

  if (statusCode) {
    conditions.push(eq(requestLogs.statusCode, parseInt(statusCode, 10)));
  }

  if (requestId) {
    conditions.push(eq(requestLogs.requestId, requestId));
  }

  if (from) {
    conditions.push(gte(requestLogs.createdAt, new Date(from)));
  }

  if (to) {
    conditions.push(lte(requestLogs.createdAt, new Date(to)));
  }

  // Parse pagination params
  const limit = Math.min(Math.max(parseInt(limitParam || '100'), 1), 1000);
  const offset = Math.max(parseInt(offsetParam || '0'), 0);

  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(requestLogs)
    .where(and(...conditions));

  // Execute query
  const logs = await db
    .select()
    .from(requestLogs)
    .where(and(...conditions))
    .orderBy(desc(requestLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    data: logs,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + logs.length < total,
    },
  });
});

/**
 * Get aggregated log analytics (filtered to organization's API keys)
 *
 * Query parameters:
 * - apiKeyId: Filter by specific API key
 * - from: Start date (ISO string) - required
 * - to: End date (ISO string) - required
 */
app.get('/analytics', requirePermission('logs:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { apiKeyId, from, to } = c.req.query();

  if (!from || !to) {
    return c.json({ error: 'from and to dates are required' }, 400);
  }

  // Get all API keys for this organization
  const orgApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, organizationId),
    columns: { id: true },
  });
  const orgApiKeyIds = orgApiKeys.map((k) => k.id);

  if (orgApiKeyIds.length === 0) {
    return c.json({
      summary: {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
      },
      topEntities: [],
      errorDistribution: [],
      hourlyStats: [],
    });
  }

  const conditions = [
    inArray(requestLogs.apiKeyId, orgApiKeyIds),
    gte(requestLogs.createdAt, new Date(from)),
    lte(requestLogs.createdAt, new Date(to)),
  ];

  if (apiKeyId) {
    if (!orgApiKeyIds.includes(apiKeyId)) {
      return c.json({ error: 'API key not found' }, 404);
    }
    conditions.push(eq(requestLogs.apiKeyId, apiKeyId));
  }

  // Get summary statistics
  const summary = await db
    .select({
      totalRequests: sql<number>`count(*)::int`,
      successCount: sql<number>`count(*) filter (where ${requestLogs.success} = true)::int`,
      errorCount: sql<number>`count(*) filter (where ${requestLogs.success} = false)::int`,
      avgResponseTime: sql<number>`round(avg(${requestLogs.responseTime}))::int`,
      p50ResponseTime: sql<number>`percentile_cont(0.5) within group (order by ${requestLogs.responseTime})::int`,
      p95ResponseTime: sql<number>`percentile_cont(0.95) within group (order by ${requestLogs.responseTime})::int`,
      p99ResponseTime: sql<number>`percentile_cont(0.99) within group (order by ${requestLogs.responseTime})::int`,
      totalRequestBytes: sql<number>`coalesce(sum(${requestLogs.requestSize}), 0)::bigint`,
      totalResponseBytes: sql<number>`coalesce(sum(${requestLogs.responseSize}), 0)::bigint`,
    })
    .from(requestLogs)
    .where(and(...conditions));

  // Get top entities by request count
  const topEntities = await db
    .select({
      entity: requestLogs.entity,
      count: sql<number>`count(*)::int`,
      successRate: sql<number>`round(100.0 * count(*) filter (where ${requestLogs.success} = true) / count(*), 1)`,
      avgResponseTime: sql<number>`round(avg(${requestLogs.responseTime}))::int`,
    })
    .from(requestLogs)
    .where(and(...conditions))
    .groupBy(requestLogs.entity)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Get error distribution by category
  const errorDistribution = await db
    .select({
      category: requestLogs.errorCategory,
      count: sql<number>`count(*)::int`,
    })
    .from(requestLogs)
    .where(and(...conditions, eq(requestLogs.success, false)))
    .groupBy(requestLogs.errorCategory)
    .orderBy(sql`count(*) desc`);

  // Get hourly request counts for the time range
  const hourlyStats = await db
    .select({
      hour: sql<string>`to_char(${requestLogs.createdAt}, 'YYYY-MM-DD HH24:00')`,
      count: sql<number>`count(*)::int`,
      successCount: sql<number>`count(*) filter (where ${requestLogs.success} = true)::int`,
      avgResponseTime: sql<number>`round(avg(${requestLogs.responseTime}))::int`,
    })
    .from(requestLogs)
    .where(and(...conditions))
    .groupBy(sql`to_char(${requestLogs.createdAt}, 'YYYY-MM-DD HH24:00')`)
    .orderBy(sql`to_char(${requestLogs.createdAt}, 'YYYY-MM-DD HH24:00')`);

  return c.json({
    summary: summary[0],
    topEntities,
    errorDistribution,
    hourlyStats,
  });
});

/**
 * Get a single log entry by ID (verify belongs to organization)
 */
app.get('/:id', requirePermission('logs:read'), async (c) => {
  const organizationId = c.get('organizationId')!;
  const { id } = c.req.param();

  // Get all API keys for this organization
  const orgApiKeys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, organizationId),
    columns: { id: true },
  });
  const orgApiKeyIds = orgApiKeys.map((k) => k.id);

  const [log] = await db
    .select()
    .from(requestLogs)
    .where(and(eq(requestLogs.id, id), inArray(requestLogs.apiKeyId, orgApiKeyIds)))
    .limit(1);

  if (!log) {
    return c.json({ error: 'Log not found' }, 404);
  }

  return c.json(log);
});

export default app;
