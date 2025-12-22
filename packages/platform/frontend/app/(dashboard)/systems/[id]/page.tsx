import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { SystemDetails } from '@/components/systems/system-details';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SystemDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const [system, instances, systemServices, instanceServices] = await withServerCookies(() =>
      Promise.all([
        api.systems.get(id),
        api.instances.list(id),
        api.systemServices.list(id),
        api.instanceServices.list().catch(() => []), // Fetch all, will be filtered by instanceId in component
      ])
    );

    return (
      <div className="p-8">
        <SystemDetails 
          system={system} 
          instances={instances}
          systemServices={systemServices}
          instanceServices={instanceServices}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
