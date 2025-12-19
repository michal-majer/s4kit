import { ServicesTable } from '@/components/services/services-table';
import { CreateServiceDialog } from '@/components/services/create-service-dialog';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';

export default async function ServicesPage() {
  const [systemServices, systems] = await Promise.all([
    api.systemServices.list().catch(() => []),
    api.systems.list().catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Services"
        description="View OData services across all systems"
      >
        {systems.length > 0 && <CreateServiceDialog systems={systems} />}
      </PageHeader>
      <ServicesTable services={systemServices} systems={systems} />
    </div>
  );
}
