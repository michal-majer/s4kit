import { notFound } from 'next/navigation';
import { api, System, SystemService } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { ServicePreview } from '@/components/systems/service-preview';

interface PageProps {
  params: Promise<{ id: string; serviceId: string }>;
}

export default async function ServicePreviewPage({ params }: PageProps) {
  const { id, serviceId } = await params;

  let system: System;
  let service: SystemService;

  try {
    [system, service] = await withServerCookies(() =>
      Promise.all([
        api.systems.get(id),
        api.systemServices.get(serviceId),
      ])
    );
  } catch {
    notFound();
  }

  // Verify the service belongs to this system
  if (service.systemId !== id) {
    notFound();
  }

  return (
    <div className="p-5 lg:p-6">
      <ServicePreview system={system} service={service} />
    </div>
  );
}
