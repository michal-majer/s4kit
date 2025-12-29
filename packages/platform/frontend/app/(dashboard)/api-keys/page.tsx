import { ApiKeysTable } from '@/components/api-keys/api-keys-table';
import { PageHeader } from '@/components/common/page-header';
import { api } from '@/lib/api';
import { withServerCookies } from '@/lib/server-api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function ApiKeysPage() {
  const apiKeys = await withServerCookies(() => api.apiKeys.list().catch(() => []));

  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <PageHeader
        title="API Keys"
        description="Manage access credentials for your API"
      >
        <Link href="/api-keys/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
          </Button>
        </Link>
      </PageHeader>
      <ApiKeysTable apiKeys={apiKeys} />
    </div>
  );
}
