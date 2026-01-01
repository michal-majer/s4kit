import { ApiKeyFormPage } from '@/components/api-keys/api-key-form-page';
import { api, ApiKey } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { notFound, redirect } from 'next/navigation';

export default async function EditApiKeyPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let apiKey: ApiKey;
  try {
    apiKey = await withServerCookies(() => api.apiKeys.get(id));
  } catch {
    notFound();
  }

  // Cannot edit revoked keys
  if (apiKey.revoked) {
    redirect(`/api-keys/${id}`);
  }

  return <ApiKeyFormPage mode="edit" apiKey={apiKey} />;
}
