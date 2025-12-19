import { ApiKeysTable } from '@/components/api-keys/api-keys-table';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function ApiKeysPage() {
  const apiKeys = await api.apiKeys.list().catch(() => []);

  return (
    <div className="flex flex-col gap-8 p-8">
      <PageHeader
        title="API Keys"
        description="Manage access credentials for your API"
      >
        <Link href="/api-keys/new">
          <Button>Create API Key</Button>
        </Link>
      </PageHeader>
      <ApiKeysTable apiKeys={apiKeys} />
    </div>
  );
}
