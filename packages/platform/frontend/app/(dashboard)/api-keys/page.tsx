import { ApiKeysTable } from '@/components/api-keys/api-keys-table';
import { CreateApiKeyDialog } from '@/components/api-keys/create-api-key-dialog';
import { api } from '@/lib/api';

export default async function ApiKeysPage() {
  const apiKeys = await api.apiKeys.list().catch(() => []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <CreateApiKeyDialog />
      </div>
      <ApiKeysTable apiKeys={apiKeys} />
    </div>
  );
}
