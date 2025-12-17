import { ServicesTable } from '@/components/services/services-table';
import { CreateServiceDialog } from '@/components/services/create-service-dialog';
import { api } from '@/lib/api';

export default async function ServicesPage() {
  const services = await api.services.list().catch(() => []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">Manage OData services and their entities</p>
        </div>
        <CreateServiceDialog />
      </div>
      <ServicesTable services={services} />
    </div>
  );
}
