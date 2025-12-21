import { Hono } from 'hono';
import { db } from '../../db';
import { requestLogs } from '../../db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

const app = new Hono();

/**
 * List request logs with filtering
 *
 * Query parameters:
 * - apiKeyId: Filter by specific API key
 * - entity: Filter by entity name
 * - operation: Filter by operation type (read, create, update, delete)
 * - success: Filter by success status (true/false)
 * - errorCategory: Filter by error category
 * - from: Start date (ISO string)
 * - to: End date (ISO string)
 * - limit: Max results (default 100, max 1000)
 * - offset: Pagination offset
 */
app.get('/', async (c) => {
  const {
    apiKeyId,
    entity,
    operation,
    success,
    errorCategory,
    from,
    to,
    limit: limitParam,
    offset: offsetParam,
  } = c.req.query();

  // Build filter conditions
  const conditions = [];

  if (apiKeyId) {
    conditions.push(eq(requestLogs.apiKeyId, apiKeyId));
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

  if (from) {
    conditions.push(gte(requestLogs.createdAt, new Date(from)));
  }

  if (to) {
    conditions.push(lte(requestLogs.createdAt, new Date(to)));
  }

  // Parse pagination params
  const limit = Math.min(Math.max(parseInt(limitParam || '100'), 1), 1000);
  const offset = Math.max(parseInt(offsetParam || '0'), 0);

  // Execute query
  const logs = await db.select().from(requestLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(requestLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    data: logs,
    pagination: {
      limit,
      offset,
      hasMore: logs.length === limit,
    },
  });
});

/**
 * Get aggregated log analytics
 *
 * Query parameters:
 * - apiKeyId: Filter by specific API key
 * - from: Start date (ISO string) - required
 * - to: End date (ISO string) - required
 */
app.get('/analytics', async (c) => {
  const { apiKeyId, from, to } = c.req.query();

  if (!from || !to) {
    return c.json({ error: 'from and to dates are required' }, 400);
  }

  const conditions = [
    gte(requestLogs.createdAt, new Date(from)),
    lte(requestLogs.createdAt, new Date(to)),
  ];

  if (apiKeyId) {
    conditions.push(eq(requestLogs.apiKeyId, apiKeyId));
  }

  // Get summary statistics
  const summary = await db.select({
    totalRequests: sql<number>`count(*)::int`,
    successCount: sql<number>`count(*) filter (where ${requestLogs.success} = true)::int`,
    errorCount: sql<number>`count(*) filter (where ${requestLogs.success} = false)::int`,
    avgResponseTime: sql<number>`round(avg(${requestLogs.responseTime}))::int`,
    p50ResponseTime: sql<number>`percentile_cont(0.5) within group (order by ${requestLogs.responseTime})::int`,
    p95ResponseTime: sql<number>`percentile_cont(0.95) within group (order by ${requestLogs.responseTime})::int`,
    p99ResponseTime: sql<number>`percentile_cont(0.99) within group (order by ${requestLogs.responseTime})::int`,
    totalRequestBytes: sql<number>`coalesce(sum(${requestLogs.requestSize}), 0)::bigint`,
    totalResponseBytes: sql<number>`coalesce(sum(${requestLogs.responseSize}), 0)::bigint`,
  }).from(requestLogs)
    .where(and(...conditions));

  // Get top entities by request count
  const topEntities = await db.select({
    entity: requestLogs.entity,
    count: sql<number>`count(*)::int`,
    successRate: sql<number>`round(100.0 * count(*) filter (where ${requestLogs.success} = true) / count(*), 1)`,
    avgResponseTime: sql<number>`round(avg(${requestLogs.responseTime}))::int`,
  }).from(requestLogs)
    .where(and(...conditions))
    .groupBy(requestLogs.entity)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Get error distribution by category
  const errorDistribution = await db.select({
    category: requestLogs.errorCategory,
    count: sql<number>`count(*)::int`,
  }).from(requestLogs)
    .where(and(...conditions, eq(requestLogs.success, false)))
    .groupBy(requestLogs.errorCategory)
    .orderBy(sql`count(*) desc`);

  // Get hourly request counts for the time range
  const hourlyStats = await db.select({
    hour: sql<string>`to_char(${requestLogs.createdAt}, 'YYYY-MM-DD HH24:00')`,
    count: sql<number>`count(*)::int`,
    successCount: sql<number>`count(*) filter (where ${requestLogs.success} = true)::int`,
    avgResponseTime: sql<number>`round(avg(${requestLogs.responseTime}))::int`,
  }).from(requestLogs)
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
 * Get a single log entry by ID
 */
app.get('/:id', async (c) => {
  const { id } = c.req.param();

  const [log] = await db.select().from(requestLogs)
    .where(eq(requestLogs.id, id))
    .limit(1);

  if (!log) {
    return c.json({ error: 'Log not found' }, 404);
  }

  return c.json(log);
});

export default app;
