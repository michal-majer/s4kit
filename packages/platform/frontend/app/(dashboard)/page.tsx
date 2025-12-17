import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

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
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.connections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Requests Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.requestsToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
