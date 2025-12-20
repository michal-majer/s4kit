import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { InstanceServiceDetails } from '@/components/systems/instance-service-details';

interface PageProps {
  params: Promise<{ id: string; instanceServiceId: string }>;
  searchParams: Promise<{ instance?: string }>;
}

export default async function InstanceServicePage({ params, searchParams }: PageProps) {
  const { id: systemId, instanceServiceId } = await params;
  const { instance: instanceParam } = await searchParams;

  try {
    const [system, instanceService] = await Promise.all([
      api.systems.get(systemId),
      api.instanceServices.get(instanceServiceId),
    ]);

    // Get related data and sibling services (same system service across environments)
    const [instance, systemService, siblingServices] = await Promise.all([
      api.instances.get(instanceService.instanceId),
      api.systemServices.get(instanceService.systemServiceId),
      api.instanceServices.list({ systemServiceId: instanceService.systemServiceId }),
    ]);

    // Verify the service belongs to this system
    if (systemService.systemId !== systemId || instance.systemId !== systemId) {
      notFound();
    }

    return (
      <div className="p-8">
        <InstanceServiceDetails
          instanceService={instanceService}
          systemService={systemService}
          instance={instance}
          system={system}
          siblingServices={siblingServices}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
