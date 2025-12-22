import { ApiKeyViewPage } from '@/components/api-keys/api-key-view-page';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { notFound } from 'next/navigation';

export default async function ViewApiKeyPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const apiKey = await withServerCookies(() => api.apiKeys.get(id));
    return <ApiKeyViewPage apiKey={apiKey} />;
  } catch (error) {
    notFound();
  }
}
