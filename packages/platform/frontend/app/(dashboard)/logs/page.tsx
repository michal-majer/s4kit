import { Suspense } from 'react';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { PageHeader } from '@/components/common/page-header';
import { StatsCard } from '@/components/common/stats-card';
import { LogsTable } from '@/components/logs/logs-table';
import { LogsFilters } from '@/components/logs/logs-filters';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Database } from 'lucide-react';

interface LogsPageProps {
  searchParams: Promise<{
    apiKeyId?: string;
    systemId?: string;
    environment?: string;
    entity?: string;
    operation?: string;
    success?: string;
    statusCode?: string;
    requestId?: string;
    errorCategory?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 50;

async function getLogsData(params: Record<string, string | undefined>) {
  try {
    // Build query params
    const queryParams: Record<string, string | boolean | number | undefined> = {};

    if (params.apiKeyId) queryParams.apiKeyId = params.apiKeyId;
    if (params.systemId) queryParams.systemId = params.systemId;
    if (params.environment) queryParams.environment = params.environment;
    if (params.entity) queryParams.entity = params.entity;
    if (params.operation) queryParams.operation = params.operation;
    if (params.success) queryParams.success = params.success === 'true';
    if (params.statusCode) queryParams.statusCode = parseInt(params.statusCode, 10);
    if (params.requestId) queryParams.requestId = params.requestId;
    if (params.errorCategory) queryParams.errorCategory = params.errorCategory;
    if (params.from) queryParams.from = params.from;
    if (params.to) queryParams.to = params.to;

    // Calculate offset from page number
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const offset = (page - 1) * PAGE_SIZE;

    // Get logs with filters
    const logsResponse = await api.logs.list({
      limit: PAGE_SIZE,
      offset,
      ...queryParams,
    } as Parameters<typeof api.logs.list>[0]);

    // Get analytics for the last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const analytics = await api.logs.analytics({
      from: yesterday.toISOString(),
      to: now.toISOString(),
      apiKeyId: params.apiKeyId,
    }).catch(() => null);

    // Get API keys for filter dropdown
    const apiKeys = await api.apiKeys.list().catch(() => []);

    // Get systems for filter dropdown
    const systems = await api.systems.list().catch(() => []);

    // Get all instances for table display (to show environment names)
    const allInstances: Array<{ id: string; systemId: string; environment: string }> = [];
    for (const system of systems) {
      const sysInstances = await api.instances.list(system.id).catch(() => []);
      allInstances.push(...sysInstances.map(i => ({ id: i.id, systemId: system.id, environment: i.environment })));
    }

    return {
      logs: logsResponse.data,
      pagination: logsResponse.pagination,
      currentPage: page,
      analytics,
      apiKeys: apiKeys.map((k) => ({ id: k.id, name: k.name })),
      systems: systems.map((s) => ({ id: s.id, name: s.name })),
      instances: allInstances,
    };
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return {
      logs: [],
      pagination: { limit: PAGE_SIZE, offset: 0, total: 0, hasMore: false },
      currentPage: 1,
      analytics: null,
      apiKeys: [],
      systems: [],
      instances: [],
    };
  }
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const params = await searchParams;

  const { logs, pagination, currentPage, analytics, apiKeys, systems, instances } = await withServerCookies(() => getLogsData(params));

  const successRate = analytics?.summary
    ? Math.round(
        (analytics.summary.successCount / analytics.summary.totalRequests) * 100
      ) || 0
    : 0;

  const totalPages = Math.ceil(pagination.total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Request Logs"
        description="Monitor API requests and analyze performance"
      />

      {/* Stats Overview */}
      {analytics?.summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Requests (24h)"
            value={analytics.summary.totalRequests}
            description="Total API calls"
            icon="activity"
            variant="lavender"
          />
          <StatsCard
            title="Success Rate"
            value={`${successRate}%`}
            description={`${analytics.summary.successCount} successful`}
            icon="check-circle"
            variant="mint"
          />
          <StatsCard
            title="Errors (24h)"
            value={analytics.summary.errorCount}
            description="Failed requests"
            icon="x-circle"
            variant="pink"
          />
          <StatsCard
            title="Avg Latency"
            value={`${analytics.summary.avgResponseTime || 0}ms`}
            description={`P95: ${analytics.summary.p95ResponseTime || 0}ms`}
            icon="clock"
            variant="purple"
          />
        </div>
      )}

      {/* Top Entities */}
      {analytics?.topEntities && analytics.topEntities.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {analytics.topEntities.slice(0, 5).map((entity) => (
            <div
              key={entity.entity}
              className="flex items-center gap-2.5 rounded-xl border-0 bg-card p-3.5 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <div className="rounded-lg bg-primary/10 p-2">
                <Database className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{entity.entity}</p>
                <p className="text-[11px] text-muted-foreground">
                  {entity.count} requests &middot; {entity.successRate}% success
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <Suspense fallback={null}>
        <LogsFilters apiKeys={apiKeys} systems={systems} />
      </Suspense>

      {/* Logs Table */}
      <Suspense fallback={<TableSkeleton columns={8} />}>
        <LogsTable
          logs={logs}
          systems={systems}
          instances={instances}
          pagination={{ currentPage, totalPages, total: pagination.total }}
        />
      </Suspense>
    </div>
  );
}
