import { SystemsTable } from '@/components/systems/systems-table';
import { CreateSystemDialog } from '@/components/systems/create-system-dialog';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';

export default async function SystemsPage() {
  const systems = await withServerCookies(() => api.systems.list().catch(() => []));

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Systems"
        description="Manage your SAP systems and instances"
      >
        <CreateSystemDialog />
      </PageHeader>
      <SystemsTable systems={systems} />
    </div>
  );
}
