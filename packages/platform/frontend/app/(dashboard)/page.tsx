import { api } from '@/lib/api';
import { PageHeader } from '@/components/common/page-header';
import { StatsCard } from '@/components/common/stats-card';
import { Plug, Key, Activity, BarChart3 } from 'lucide-react';

async function getStats() {
  try {
    const [connections, apiKeys, logs] = await Promise.all([
      api.connections.list().catch(() => []),
      api.apiKeys.list().catch(() => []),
      api.logs.list({ limit: 100 }).catch(() => []),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((log) => new Date(log.createdAt) >= today);

    return {
      connections: connections.length,
      apiKeys: apiKeys.length,
      requestsToday: todayLogs.length,
      totalRequests: logs.length,
    };
  } catch {
    return { connections: 0, apiKeys: 0, requestsToday: 0, totalRequests: 0 };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your S4Kit platform"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Connections"
          value={stats.connections}
          description="Active SAP connections"
          icon={Plug}
        />
        <StatsCard
          title="API Keys"
          value={stats.apiKeys}
          description="Generated API keys"
          icon={Key}
        />
        <StatsCard
          title="Requests Today"
          value={stats.requestsToday}
          description="API calls in last 24h"
          icon={Activity}
        />
        <StatsCard
          title="Total Requests"
          value={stats.totalRequests}
          description="Lifetime API calls"
          icon={BarChart3}
        />
      </div>
    </div>
  );
}

