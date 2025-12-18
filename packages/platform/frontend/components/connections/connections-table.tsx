'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { api, Connection } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { EditConnectionDialog } from './edit-connection-dialog';
import { CreateConnectionDialog } from './create-connection-dialog';
import { Pencil, Plug, ExternalLink, Trash2 } from 'lucide-react';

export function ConnectionsTable({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await api.connections.delete(id);
      toast.success('Connection deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete connection');
    }
  };

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Plug}
        title="No connections yet"
        description="Connect to your first SAP system to start consuming OData services through the API."
      >
        <CreateConnectionDialog />
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
              <TableHead className="font-semibold">Base URL</TableHead>
              <TableHead className="font-semibold">Environment</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connections.map((conn) => (
              <TableRow key={conn.id} className="group">
                <TableCell className="font-medium">
                  <Link
                    href={`/connections/${conn.id}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {conn.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
                    {conn.baseUrl}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={conn.environment === 'production' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {conn.environment}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/connections/${conn.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingConnection(conn)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(conn.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {editingConnection && (
        <EditConnectionDialog
          connection={editingConnection}
          open={!!editingConnection}
          onOpenChange={(open) => !open && setEditingConnection(null)}
        />
      )}
    </>
  );
}

