import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ServicePreview } from '@/components/systems/service-preview';

interface PageProps {
  params: Promise<{ id: string; serviceId: string }>;
}

export default async function ServicePreviewPage({ params }: PageProps) {
  const { id, serviceId } = await params;
  
  try {
    const [system, service] = await Promise.all([
      api.systems.get(id),
      api.systemServices.get(serviceId),
    ]);

    // Verify the service belongs to this system
    if (service.systemId !== id) {
      notFound();
    }

    return (
      <div className="p-8">
        <ServicePreview system={system} service={service} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
