import { ApiKeysTable } from '@/components/api-keys/api-keys-table';
import { CreateApiKeyDialog } from '@/components/api-keys/create-api-key-dialog';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';

export default async function ApiKeysPage() {
  const apiKeys = await api.apiKeys.list().catch(() => []);

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="API Keys"
        description="Manage access credentials for your API"
      >
        <CreateApiKeyDialog />
      </PageHeader>
      <ApiKeysTable apiKeys={apiKeys} />
    </div>
  );
}

