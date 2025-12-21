'use client';

import { useState } from 'react';
import { ConfigurableTable, ConfigurableTableConfig } from '@/components/ui/configurable-table';
import { Badge } from '@/components/ui/badge';
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
    } catch {
      toast.error('Failed to delete system');
    }
  };

  const config: ConfigurableTableConfig<System> = {
    columns: [
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
    ],
    actions: {
      type: 'inline',
      showOnHover: true,
      items: [
        {
          label: 'View',
          icon: ExternalLink,
          href: (system) => `/systems/${system.id}`,
          onClick: () => {},
        },
        {
          label: 'Edit',
          icon: Pencil,
          onClick: (system) => setEditingSystem(system),
        },
        {
          label: 'Delete',
          icon: Trash2,
          variant: 'destructive',
          onClick: (system) => handleDelete(system.id),
        },
      ],
    },
    emptyState: {
      icon: Server,
      title: 'No systems yet',
      description: 'Add your first SAP system to start managing connections and services.',
      action: <CreateSystemDialog />,
    },
    searchPlaceholder: 'Search systems...',
    searchableColumns: ['name', 'description'],
    getRowId: (system) => system.id,
  };

  return (
    <>
      <ConfigurableTable data={systems} config={config} />
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
