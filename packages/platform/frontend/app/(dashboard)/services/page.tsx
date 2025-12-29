import { ServicesTable } from '@/components/services/services-table';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';

export default async function ServicesPage() {
  const [systemServices, systems, instanceServices] = await withServerCookies(() =>
    Promise.all([
      api.systemServices.list().catch(() => []),
      api.systems.list().catch(() => []),
      api.instanceServices.list().catch(() => []),
    ])
  );

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="Services"
        description="View OData services across all systems"
      />
      <ServicesTable
        services={systemServices}
        systems={systems}
        instanceServices={instanceServices}
      />
    </div>
  );
}
