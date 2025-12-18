'use client';

import { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { api, Service } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, RefreshCw, Trash2, Pencil, Layers } from 'lucide-react';
import { SyncEntitiesDialog } from './sync-entities-dialog';
import { EditServiceDialog } from './edit-service-dialog';
import { CreateServiceDialog } from './create-service-dialog';

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

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No services configured"
        description="Add your first OData service to start exposing entities through the API."
      >
        <CreateServiceDialog />
      </EmptyState>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10"></TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Alias</TableHead>
              <TableHead className="font-semibold">Service Path</TableHead>
              <TableHead className="font-semibold">Entities</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => {
              const isExpanded = expandedRows.has(service.id);
              const entities = service.entities || [];
              return (
                <Fragment key={service.id}>
                  <TableRow className="group">
                    <TableCell className="w-10">
                      {entities.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleRow(service.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-mono">
                        {service.alias}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono max-w-[200px] truncate block" title={service.servicePath}>
                        {service.servicePath}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {entities.length} {entities.length === 1 ? 'entity' : 'entities'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSyncDialogServiceId(service.id)}
                          className="gap-1.5"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span className="hidden sm:inline">Sync</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingService(service)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && entities.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 py-4">
                        <div className="pl-12">
                          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Available Entities
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {entities.map((entity) => (
                              <Badge key={entity} variant="outline" className="text-xs font-mono">
                                {entity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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

