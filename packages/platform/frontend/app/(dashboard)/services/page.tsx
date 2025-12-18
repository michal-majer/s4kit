import { ServicesTable } from '@/components/services/services-table';
import { CreateServiceDialog } from '@/components/services/create-service-dialog';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';

export default async function ServicesPage() {
  const services = await api.services.list().catch(() => []);

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="Services"
        description="Manage OData services and their entities"
      >
        <CreateServiceDialog />
      </PageHeader>
      <ServicesTable services={services} />
    </div>
  );
}

