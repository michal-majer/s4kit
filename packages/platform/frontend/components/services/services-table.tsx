'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, Service } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { SyncEntitiesDialog } from './sync-entities-dialog';
import { EditServiceDialog } from './edit-service-dialog';

export function ServicesTable({ services }: { services: Service[] }) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [syncDialogServiceId, setSyncDialogServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.services.delete(id);
      toast.success('Service deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Alias</TableHead>
            <TableHead>Service Path</TableHead>
            <TableHead>Entities</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No services found
              </TableCell>
            </TableRow>
          ) : (
            services.map((service) => {
              const isExpanded = expandedRows.has(service.id);
              const entities = service.entities || [];
              return (
                <>
                  <TableRow key={service.id}>
                    <TableCell>
                      {entities.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleRow(service.id)}>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{service.alias}</code>
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-xs truncate" title={service.servicePath}>
                      {service.servicePath}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entities.length} entities</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSyncDialogServiceId(service.id)}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingService(service)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && entities.length > 0 && (
                    <TableRow key={`${service.id}-entities`}>
                      <TableCell colSpan={6} className="bg-muted/50 py-3">
                        <div className="pl-8">
                          <span className="text-sm font-medium text-muted-foreground mr-2">Entities:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entities.map((entity) => (
                              <Badge key={entity} variant="outline" className="text-xs">
                                {entity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })
          )}
        </TableBody>
      </Table>

      {syncDialogServiceId && (
        <SyncEntitiesDialog
          serviceId={syncDialogServiceId}
          open={!!syncDialogServiceId}
          onOpenChange={(open) => !open && setSyncDialogServiceId(null)}
        />
      )}
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
