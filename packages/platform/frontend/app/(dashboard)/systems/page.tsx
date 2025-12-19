import { SystemsTable } from '@/components/systems/systems-table';
import { CreateSystemDialog } from '@/components/systems/create-system-dialog';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';

export default async function SystemsPage() {
  const systems = await api.systems.list().catch(() => []);

  return (
    <div className="flex flex-col gap-8 p-8">
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
