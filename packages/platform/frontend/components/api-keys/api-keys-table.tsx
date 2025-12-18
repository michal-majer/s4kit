'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { api, ApiKey } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pencil, Key, ShieldOff, Calendar } from 'lucide-react';
import { EditApiKeyDialog } from './edit-api-key-dialog';
import { CreateApiKeyDialog } from './create-api-key-dialog';

export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const router = useRouter();
  const [editingApiKey, setEditingApiKey] = useState<ApiKey | null>(null);

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
        <CreateApiKeyDialog />
      </EmptyState>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Key</TableHead>
              <TableHead className="font-semibold">Environment</TableHead>
              <TableHead className="font-semibold">Created</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((key) => (
              <TableRow
                key={key.id}
                className={key.revoked ? 'opacity-60 bg-muted/20' : 'group'}
              >
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
                    {key.displayKey}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={key.environment === 'production' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {key.environment}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(key.createdAt), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  {key.revoked ? (
                    <Badge variant="destructive" className="gap-1">
                      <ShieldOff className="h-3 w-3" />
                      Revoked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!key.revoked && (
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => setEditingApiKey(key)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(key.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {editingApiKey && (
        <EditApiKeyDialog
          apiKey={editingApiKey}
          open={!!editingApiKey}
          onOpenChange={(open) => !open && setEditingApiKey(null)}
        />
      )}
    </>
  );
}
