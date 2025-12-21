import { ApiKeyFormPage } from '@/components/api-keys/api-key-form-page';
import { api } from '@/lib/api';
import { notFound } from 'next/navigation';

export default async function EditApiKeyPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const apiKey = await api.apiKeys.get(id);
    return <ApiKeyFormPage mode="edit" apiKey={apiKey} />;
  } catch (error) {
    notFound();
  }
}
