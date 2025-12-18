import { ConnectionsTable } from '@/components/connections/connections-table';
import { CreateConnectionDialog } from '@/components/connections/create-connection-dialog';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';

export default async function ConnectionsPage() {
  const connections = await api.connections.list().catch(() => []);

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Connections"
        description="Manage your SAP system connections"
      >
        <CreateConnectionDialog />
      </PageHeader>
      <ConnectionsTable connections={connections} />
    </div>
  );
}
