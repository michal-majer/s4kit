'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, ApiKey } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { EditApiKeyDialog } from './edit-api-key-dialog';

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

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No API keys found
            </TableCell>
          </TableRow>
        ) : (
          apiKeys.map((key) => (
            <TableRow key={key.id} className={key.revoked ? 'opacity-50' : ''}>
              <TableCell className="font-medium">{key.name}</TableCell>
              <TableCell className="font-mono text-sm">{key.displayKey}</TableCell>
              <TableCell>
                <Badge variant="outline">{key.environment}</Badge>
              </TableCell>
              <TableCell>{format(new Date(key.createdAt), 'PPp')}</TableCell>
              <TableCell className="text-right space-x-2">
                {!key.revoked && (
                  <Button variant="outline" size="sm" onClick={() => setEditingApiKey(key)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {key.revoked ? (
                  <Badge variant="destructive">Revoked</Badge>
                ) : (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(key.id)}>
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
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
