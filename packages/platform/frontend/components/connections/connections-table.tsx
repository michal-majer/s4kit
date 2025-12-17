'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, Connection } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { EditConnectionDialog } from './edit-connection-dialog';
import { Pencil } from 'lucide-react';

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

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Base URL</TableHead>
          <TableHead>Environment</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {connections.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No connections found
            </TableCell>
          </TableRow>
        ) : (
          connections.map((conn) => (
            <TableRow key={conn.id}>
              <TableCell className="font-medium">
                <Link href={`/connections/${conn.id}`} className="hover:underline">
                  {conn.name}
                </Link>
              </TableCell>
              <TableCell>{conn.baseUrl}</TableCell>
              <TableCell>
                <Badge variant="outline">{conn.environment}</Badge>
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/connections/${conn.id}`}>View</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingConnection(conn)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(conn.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
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
