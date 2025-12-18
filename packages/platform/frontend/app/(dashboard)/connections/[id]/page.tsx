import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ConnectionDetails } from '@/components/connections/connection-details';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConnectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  try {
    const [connection, connectionServices, services] = await Promise.all([
      api.connections.get(id),
      api.connectionServices.listByConnection(id),
      api.services.list(),
    ]);

    return (
      <div className="p-8">
        <ConnectionDetails 
          connection={connection} 
          linkedServices={connectionServices}
          availableServices={services}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}

