import { notFound } from 'next/navigation';
import { api, System, Instance, SystemService, InstanceService } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { InstanceServiceDetails } from '@/components/systems/instance-service-details';

interface PageProps {
  params: Promise<{ id: string; instanceServiceId: string }>;
}

export default async function InstanceServicePage({ params }: PageProps) {
  const { id: systemId, instanceServiceId } = await params;

  let system: System;
  let instanceService: InstanceService;
  let instance: Instance;
  let systemService: SystemService;
  let siblingServices: InstanceService[];

  try {
    [system, instanceService] = await withServerCookies(() =>
      Promise.all([
        api.systems.get(systemId),
        api.instanceServices.get(instanceServiceId),
      ])
    );

    // Get related data and sibling services (same system service across environments)
    [instance, systemService, siblingServices] = await withServerCookies(() =>
      Promise.all([
        api.instances.get(instanceService.instanceId),
        api.systemServices.get(instanceService.systemServiceId),
        api.instanceServices.list({ systemServiceId: instanceService.systemServiceId }),
      ])
    );
  } catch {
    notFound();
  }

  // Verify the service belongs to this system
  if (systemService.systemId !== systemId || instance.systemId !== systemId) {
    notFound();
  }

  return (
    <div className="p-5 lg:p-6">
      <InstanceServiceDetails
        instanceService={instanceService}
        systemService={systemService}
        instance={instance}
        system={system}
        siblingServices={siblingServices}
      />
    </div>
  );
}
