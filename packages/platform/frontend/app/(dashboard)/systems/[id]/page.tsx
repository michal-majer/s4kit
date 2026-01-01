import { notFound } from 'next/navigation';
import { api, System, Instance, SystemService, InstanceService } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { SystemDetails } from '@/components/systems/system-details';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SystemDetailPage({ params }: PageProps) {
  const { id } = await params;

  let system: System;
  let instances: Instance[];
  let systemServices: SystemService[];
  let instanceServices: InstanceService[];

  try {
    [system, instances, systemServices, instanceServices] = await withServerCookies(() =>
      Promise.all([
        api.systems.get(id),
        api.instances.list(id),
        api.systemServices.list(id),
        api.instanceServices.list().catch(() => []), // Fetch all, will be filtered by instanceId in component
      ])
    );
  } catch {
    notFound();
  }

  return (
    <div className="p-5 lg:p-6">
      <SystemDetails
        system={system}
        instances={instances}
        systemServices={systemServices}
        instanceServices={instanceServices}
      />
    </div>
  );
}
