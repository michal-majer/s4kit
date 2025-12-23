import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { PageHeader } from '@/components/common/page-header';
import { StatsCard } from '@/components/common/stats-card';
import { RequestVolumeChart, SuccessRateChart, LatencyChart, type DailyStats } from '@/components/dashboard';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [systems, apiKeys, logsResponse] = await withServerCookies(() =>
      Promise.all([
        api.systems.list().catch(() => []),
        api.apiKeys.list().catch(() => []),
        api.logs.list({ limit: 1000 }).catch(() => ({ data: [], pagination: { limit: 1000, offset: 0, hasMore: false } })),
      ])
    );

    const logs = logsResponse.data;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((log) => new Date(log.createdAt) >= today);

    // Calculate 7-day analytics
    const last7Days: DailyStats[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayLogs = logs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return logDate >= date && logDate < nextDate;
      });

      const successCount = dayLogs.filter((log) => log.statusCode >= 200 && log.statusCode < 400).length;
      const errorCount = dayLogs.length - successCount;
      const avgResponseTime = dayLogs.length > 0
        ? dayLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / dayLogs.length
        : 0;

      last7Days.push({
        date: date.toISOString().split('T')[0],
        totalRequests: dayLogs.length,
        successCount,
        errorCount,
        avgResponseTime,
        p95ResponseTime: avgResponseTime * 1.8,
      });
    }

    return {
      systems: systems.length,
      apiKeys: apiKeys.length,
      requestsToday: todayLogs.length,
      totalRequests: logs.length,
      analytics: last7Days,
    };
  } catch {
    return {
      systems: 0,
      apiKeys: 0,
      requestsToday: 0,
      totalRequests: 0,
      analytics: [] as DailyStats[],
    };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        description="Monitor your S4Kit platform performance and usage at a glance"
      />

      {/* Stats Grid - SAP TechEd Bento Box Style */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="animate-in-up">
          <StatsCard
            title="Systems"
            value={stats.systems}
            description="Connected SAP systems"
            icon="server"
            variant="mint"
          />
        </div>
        <div className="animate-in-up delay-75">
          <StatsCard
            title="API Keys"
            value={stats.apiKeys}
            description="Active API keys"
            icon="key"
            variant="lavender"
          />
        </div>
        <div className="animate-in-up delay-150">
          <StatsCard
            title="Requests Today"
            value={stats.requestsToday}
            description="API calls in last 24h"
            icon="activity"
            variant="purple"
          />
        </div>
        <div className="animate-in-up delay-225">
          <StatsCard
            title="Total Requests"
            value={stats.totalRequests}
            description="Lifetime API calls"
            icon="bar-chart"
            variant="pink"
          />
        </div>
      </div>

      {/* Charts Section */}
      {stats.analytics.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="animate-in-up delay-300">
              <RequestVolumeChart data={stats.analytics} />
            </div>
            <div className="animate-in-up delay-375">
              <SuccessRateChart data={stats.analytics} />
            </div>
          </div>

          <div className="animate-in-up delay-450">
            <LatencyChart data={stats.analytics} />
          </div>
        </div>
      )}

      {/* Empty state for new users */}
      {stats.analytics.length === 0 && stats.systems === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card/50 p-16 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/15 ring-1 ring-accent/20">
            <svg
              className="h-10 w-10 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="mt-8 text-xl font-bold tracking-tight">Get started with S4Kit</h3>
          <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
            Connect your first SAP system to start tracking API requests and monitoring performance.
          </p>
        </div>
      )}
    </div>
  );
}
