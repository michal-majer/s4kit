'use client';

import { useState } from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { api, System, SystemType } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { EditSystemDialog } from './edit-system-dialog';
import { CreateSystemDialog } from './create-system-dialog';
import { Pencil, Server, ExternalLink, Trash2 } from 'lucide-react';

const systemTypeLabels: Record<SystemType, string> = {
  s4_public: 'S/4HANA Cloud Public',
  s4_private: 'S/4HANA Cloud Private',
  btp: 'SAP BTP',
  other: 'Other',
};

const systemTypeBadgeVariant: Record<SystemType, 'default' | 'secondary' | 'outline'> = {
  s4_public: 'default',
  s4_private: 'default',
  btp: 'secondary',
  other: 'outline',
};

export function SystemsTable({ systems }: { systems: System[] }) {
  const router = useRouter();
  const [editingSystem, setEditingSystem] = useState<System | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system? All instances and services will be deleted.')) return;
    try {
      await api.systems.delete(id);
      toast.success('System deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete system');
    }
  };

  if (systems.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="No systems yet"
        description="Add your first SAP system to start managing connections and services."
      >
        <CreateSystemDialog />
      </EmptyState>
    );
  }

  const columns: Column<System>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: (system) => (
        <Link
          href={`/systems/${system.id}`}
          className="text-primary hover:underline font-medium inline-flex items-center gap-1"
        >
          {system.name}
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'type',
      cell: (system) => (
        <Badge variant={systemTypeBadgeVariant[system.type]}>
          {systemTypeLabels[system.type]}
        </Badge>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      cell: (system) => (
        <span className="text-muted-foreground">
          {system.description || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (system) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/systems/${system.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditingSystem(system);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(system.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={systems}
        columns={columns}
        searchPlaceholder="Search systems..."
        searchableColumns={['name', 'description']}
        getRowId={(system) => system.id}
      />
      {editingSystem && (
        <EditSystemDialog
          system={editingSystem}
          open={!!editingSystem}
          onOpenChange={(open: boolean) => !open && setEditingSystem(null)}
        />
      )}
    </>
  );
}
