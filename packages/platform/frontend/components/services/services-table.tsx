'use client';

import { useState } from 'react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { SystemService, System } from '@/lib/api';
import { Database, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CreateServiceDialog } from './create-service-dialog';
import { EditServiceDialog } from './edit-service-dialog';

interface ServicesTableProps {
  services: SystemService[];
  systems: System[];
}

export function ServicesTable({ services, systems }: ServicesTableProps) {
  const router = useRouter();
  const [editingService, setEditingService] = useState<SystemService | null>(null);
  const systemMap = new Map(systems.map(s => [s.id, s]));

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) return;
    try {
      await api.systemServices.delete(id);
      toast.success('Service deleted');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete service');
    }
  };

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No services yet"
        description="Services are created when you add a system. S/4HANA systems come with predefined services."
      >
        {systems.length > 0 && <CreateServiceDialog systems={systems} />}
      </EmptyState>
    );
  }

  const columns: Column<SystemService>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: (service) => <span className="font-medium">{service.name}</span>,
    },
    {
      id: 'alias',
      header: 'Alias',
      accessorKey: 'alias',
      cell: (service) => (
        <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
          {service.alias}
        </code>
      ),
    },
    {
      id: 'system',
      header: 'System',
      accessorFn: (service) => systemMap.get(service.systemId)?.name || '',
      cell: (service) => {
        const system = systemMap.get(service.systemId);
        return system ? (
          <Link
            href={`/systems/${system.id}`}
            className="text-primary hover:underline"
          >
            {system.name}
          </Link>
        ) : (
          '-'
        );
      },
    },
    {
      id: 'servicePath',
      header: 'Service Path',
      accessorKey: 'servicePath',
      cell: (service) => (
        <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
          {service.servicePath}
        </code>
      ),
    },
    {
      id: 'entities',
      header: 'Entities',
      accessorFn: (service) => service.entities?.length || 0,
      cell: (service) => (
        <Badge variant="outline">{service.entities?.length || 0} entities</Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (service) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditingService(service);
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
              handleDelete(service.id);
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
        data={services}
        columns={columns}
        searchPlaceholder="Search services..."
        searchableColumns={['name', 'alias', 'servicePath']}
        getRowId={(service) => service.id}
      />
      {editingService && (
        <EditServiceDialog
          service={editingService}
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
        />
      )}
    </>
  );
}
