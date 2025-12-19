'use client';

import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { api, ApiKey } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Key, ShieldOff, Calendar } from 'lucide-react';
import Link from 'next/link';

export function ApiKeysTable({
  apiKeys,
}: {
  apiKeys: ApiKey[];
}) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await api.apiKeys.delete(id);
      toast.success('API key revoked');
      router.refresh();
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  if (apiKeys.length === 0) {
    return (
      <EmptyState
        icon={Key}
        title="No API keys created"
        description="Generate your first API key to authenticate requests to your OData services."
      >
        <Link href="/api-keys/new">
          <Button>Create API Key</Button>
        </Link>
      </EmptyState>
    );
  }

  const columns: Column<ApiKey>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: (key) => <span className="font-medium">{key.name}</span>,
    },
    {
      id: 'displayKey',
      header: 'Key',
      accessorKey: 'displayKey',
      cell: (key) => (
        <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
          {key.displayKey}
        </code>
      ),
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (key) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {format(new Date(key.createdAt), 'MMM d, yyyy')}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (key) => (key.revoked ? 'revoked' : 'active'),
      cell: (key) =>
        key.revoked ? (
          <Badge variant="destructive" className="gap-1">
            <ShieldOff className="h-3 w-3" />
            Revoked
          </Badge>
        ) : (
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            Active
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: 'Actions',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (key) =>
        !key.revoked ? (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/api-keys/${key.id}`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(key.id);
              }}
            >
              Revoke
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <DataTable
      data={apiKeys}
      columns={columns}
      searchPlaceholder="Search API keys..."
      searchableColumns={['name', 'displayKey']}
      getRowId={(key) => key.id}
      rowClassName={(key) =>
        key.revoked ? 'opacity-60 bg-muted/20' : ''
      }
    />
  );
}
