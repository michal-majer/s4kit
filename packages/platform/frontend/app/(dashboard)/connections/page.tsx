import { ConnectionsTable } from '@/components/connections/connections-table';
import { CreateConnectionDialog } from '@/components/connections/create-connection-dialog';
import { api } from '@/lib/api';

export default async function ConnectionsPage() {
  const connections = await api.connections.list().catch(() => []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Connections</h1>
        <CreateConnectionDialog />
      </div>
      <ConnectionsTable connections={connections} />
    </div>
  );
}
