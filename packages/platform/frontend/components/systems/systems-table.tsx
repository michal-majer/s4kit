'use client';

import { useState } from 'react';
import { ConfigurableTable, ConfigurableTableConfig } from '@/components/ui/configurable-table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api, SystemWithInstances, SystemType } from '@/lib/api';
import { envShortLabels, envColors, envOrder } from '@/lib/environment';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { EditSystemDialog } from './edit-system-dialog';
import { CreateSystemDialog } from './create-system-dialog';
import { Pencil, Server, ExternalLink, Trash2 } from 'lucide-react';

const systemTypeLabels: Record<SystemType, string> = {
  s4_public: 'S/4HANA Cloud Public',
  s4_private: 'S/4HANA Cloud Private',
  s4_onprem: 'S/4HANA On-Premise',
  btp: 'SAP BTP',
  other: 'Other',
};

const systemTypeBadgeVariant: Record<SystemType, 'default' | 'secondary' | 'outline'> = {
  s4_public: 'default',
  s4_private: 'default',
  s4_onprem: 'default',
  btp: 'secondary',
  other: 'outline',
};

export function SystemsTable({ systems }: { systems: SystemWithInstances[] }) {
  const router = useRouter();
  const [editingSystem, setEditingSystem] = useState<SystemWithInstances | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<SystemWithInstances | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deletingSystem) return;
    setDeleteLoading(true);
    try {
      await api.systems.delete(deletingSystem.id);
      toast.success('System deleted');
      setDeletingSystem(null);
      router.refresh();
    } catch {
      toast.error('Failed to delete system');
    } finally {
      setDeleteLoading(false);
    }
  };

  const config: ConfigurableTableConfig<SystemWithInstances> = {
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
        id: 'instances',
        header: 'Instances',
        accessorKey: 'instances',
        cell: (system) => (
          <div className="flex flex-wrap gap-1.5">
            {!system.instances || system.instances.length === 0 ? (
              <span className="text-muted-foreground text-sm">No instances</span>
            ) : (
              [...system.instances]
                .sort((a, b) => envOrder[a.environment] - envOrder[b.environment])
                .map((inst) => (
                  <Link
                    key={inst.id}
                    href={`/systems/${system.id}?env=${inst.environment}`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted border hover:bg-accent transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full ${envColors[inst.environment]}`} />
                    {envShortLabels[inst.environment]}
                  </Link>
                ))
            )}
          </div>
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
      showOnHover: false,
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
          onClick: (system) => setDeletingSystem(system),
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
      <AlertDialog open={!!deletingSystem} onOpenChange={(open) => !open && setDeletingSystem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingSystem?.name}&quot;? All instances and services will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
