import { ApiKeyViewPage } from '@/components/api-keys/api-key-view-page';
import { api, ApiKey } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { notFound } from 'next/navigation';

export default async function ViewApiKeyPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let apiKey: ApiKey;
  try {
    apiKey = await withServerCookies(() => api.apiKeys.get(id));
  } catch {
    notFound();
  }

  return <ApiKeyViewPage apiKey={apiKey} />;
}
