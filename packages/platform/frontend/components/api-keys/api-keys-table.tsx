'use client';

import { useState } from 'react';
import { ConfigurableTable, ConfigurableTableConfig } from '@/components/ui/configurable-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiKey } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Key, ShieldOff, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RotateKeyDialog } from './rotate-key-dialog';
import { RevokeKeyDialog } from './revoke-key-dialog';

type KeyStatus = 'active' | 'revoked' | 'expired';

function getKeyStatus(key: ApiKey): KeyStatus {
  if (key.revoked) return 'revoked';
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return 'expired';
  return 'active';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const futureMins = Math.abs(diffMins);
    const futureHours = Math.abs(diffHours);
    const futureDays = Math.abs(diffDays);

    if (futureMins < 60) return `in ${futureMins}m`;
    if (futureHours < 24) return `in ${futureHours}h`;
    if (futureDays === 1) return 'Tomorrow';
    if (futureDays < 7) return `in ${futureDays}d`;
    if (futureDays < 30) return `in ${Math.floor(futureDays / 7)}w`;
    return date.toLocaleDateString();
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const router = useRouter();
  const [rotatingKey, setRotatingKey] = useState<ApiKey | null>(null);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);

  const config: ConfigurableTableConfig<ApiKey> = {
    columns: [
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
        id: 'lastUsedAt',
        header: 'Last Used',
        accessorKey: 'lastUsedAt',
        cell: (key) =>
          key.lastUsedAt ? (
            <span className="text-sm">{formatRelativeTime(key.lastUsedAt)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Never</span>
          ),
      },
      {
        id: 'expiresAt',
        header: 'Expires',
        accessorKey: 'expiresAt',
        cell: (key) => {
          if (!key.expiresAt) {
            return <span className="text-sm text-muted-foreground">Never</span>;
          }
          const date = new Date(key.expiresAt);
          const now = new Date();
          const isExpired = date < now;
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const isSoon = !isExpired && date < weekFromNow;
          return (
            <span
              className={cn(
                'text-sm',
                isExpired && 'text-red-600',
                isSoon && 'text-amber-600'
              )}
            >
              {formatRelativeTime(key.expiresAt)}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (key) => getKeyStatus(key),
        cell: (key) => {
          const status = getKeyStatus(key);
          if (status === 'revoked') {
            return (
              <Badge variant="destructive" className="gap-1">
                <ShieldOff className="h-3 w-3" />
                Revoked
              </Badge>
            );
          }
          if (status === 'expired') {
            return (
              <Badge variant="secondary" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
                <Clock className="h-3 w-3" />
                Expired
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              Active
            </Badge>
          );
        },
      },
    ],
    filters: [
      {
        type: 'tabs',
        id: 'status',
        showAllOption: true,
        allLabel: 'All',
        defaultValue: 'active',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'revoked', label: 'Revoked' },
          { value: 'expired', label: 'Expired' },
        ],
        getItemValue: getKeyStatus,
      },
    ],
    actions: {
      type: 'dropdown',
      items: [
        {
          label: 'View',
          icon: Eye,
          href: (key) => `/api-keys/${key.id}`,
          onClick: () => {},
        },
        {
          label: 'Edit',
          icon: Pencil,
          href: (key) => `/api-keys/${key.id}/edit`,
          onClick: () => {},
        },
        {
          label: 'Rotate Key',
          icon: RefreshCw,
          show: (key) => getKeyStatus(key) === 'active',
          onClick: (key) => setRotatingKey(key),
        },
        {
          label: 'Revoke',
          icon: ShieldOff,
          variant: 'destructive',
          separator: true,
          show: (key) => getKeyStatus(key) === 'active',
          onClick: (key) => setRevokingKey(key),
        },
      ],
    },
    rowClassName: (key) => {
      const status = getKeyStatus(key);
      if (status === 'revoked' || status === 'expired') {
        return 'opacity-60 bg-muted/20';
      }
      return '';
    },
    onRowClick: (key) => router.push(`/api-keys/${key.id}`),
    emptyState: {
      icon: Key,
      title: 'No API keys created',
      description: 'Generate your first API key to authenticate requests to your OData services.',
      action: (
        <Link href="/api-keys/new">
          <Button>Create API Key</Button>
        </Link>
      ),
    },
    filteredEmptyMessage: 'No matching API keys found.',
    searchPlaceholder: 'Search API keys...',
    searchableColumns: ['name', 'displayKey'],
    getRowId: (key) => key.id,
  };

  return (
    <>
      <ConfigurableTable data={apiKeys} config={config} />

      {rotatingKey && (
        <RotateKeyDialog
          apiKey={rotatingKey}
          open={!!rotatingKey}
          onOpenChange={(open) => !open && setRotatingKey(null)}
          onSuccess={() => {
            setRotatingKey(null);
            router.refresh();
          }}
        />
      )}

      {revokingKey && (
        <RevokeKeyDialog
          apiKey={revokingKey}
          open={!!revokingKey}
          onOpenChange={(open) => !open && setRevokingKey(null)}
          onSuccess={() => {
            setRevokingKey(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
