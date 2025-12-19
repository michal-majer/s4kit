'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, System, Instance, SystemService, InstanceService, SystemType, InstanceEnvironment } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Server, Database, Settings, RefreshCw, Eye, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { CreateInstanceDialog } from './create-instance-dialog';
import { EditInstanceDialog } from './edit-instance-dialog';
import { CreateServiceDialog } from './create-service-dialog';
import { EditServiceDialog } from '@/components/services/edit-service-dialog';
import { LinkServiceToInstanceDialog } from './link-service-to-instance-dialog';
import { InstanceServiceConfigDialog } from './instance-service-config-dialog';

const systemTypeLabels: Record<SystemType, string> = {
  s4_public: 'SAP S/4HANA Cloud Public Edition',
  s4_private: 'SAP S/4HANA Cloud Private Edition',
  btp: 'SAP BTP',
  other: 'Other',
};

const envLabels: Record<InstanceEnvironment, string> = {
  dev: 'Development',
  quality: 'Quality',
  production: 'Production',
};

const envBadgeVariant: Record<InstanceEnvironment, 'outline' | 'secondary' | 'default'> = {
  dev: 'outline',
  quality: 'secondary',
  production: 'default',
};

interface SystemDetailsProps {
  system: System;
  instances: Instance[];
  systemServices: SystemService[];
  instanceServices?: InstanceService[];
}

export function SystemDetails({ system, instances, systemServices, instanceServices: initialInstanceServices }: SystemDetailsProps) {
  const router = useRouter();
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [editingService, setEditingService] = useState<SystemService | null>(null);
  const [refreshingServiceId, setRefreshingServiceId] = useState<string | null>(null);
  const [refreshingInstanceServiceId, setRefreshingInstanceServiceId] = useState<string | null>(null);
  const [showCreateInstance, setShowCreateInstance] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [instanceServices, setInstanceServices] = useState<InstanceService[]>(initialInstanceServices || []);
  const [linkingInstance, setLinkingInstance] = useState<Instance | null>(null);
  const [configuringInstanceService, setConfiguringInstanceService] = useState<InstanceService | null>(null);

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instance?')) return;
    try {
      await api.instances.delete(id);
      toast.success('Instance deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete instance');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.systemServices.delete(id);
      toast.success('Service deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleRefreshEntities = async (serviceId: string) => {
    setRefreshingServiceId(serviceId);
    try {
      const result = await api.systemServices.refreshEntities(serviceId);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh entities');
    } finally {
      setRefreshingServiceId(null);
    }
  };

  const handleRefreshInstanceServiceEntities = async (instanceServiceId: string) => {
    setRefreshingInstanceServiceId(instanceServiceId);
    try {
      const result = await api.instanceServices.refreshEntities(instanceServiceId);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      // Update local state
      setInstanceServices(prev => prev.map(is => 
        is.id === instanceServiceId ? { ...is, entities: result.entities, hasEntityOverride: result.hasEntityOverride } : is
      ));
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh entities');
    } finally {
      setRefreshingInstanceServiceId(null);
    }
  };

  // Load instance services if not provided
  React.useEffect(() => {
    if (!initialInstanceServices) {
      api.instanceServices.list().then(setInstanceServices).catch(() => {});
    }
  }, [initialInstanceServices]);

  const canAddServices = system.type === 'btp' || system.type === 'other';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/systems">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Systems
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{system.name}</CardTitle>
              <CardDescription className="mt-1">
                <Badge variant="secondary" className="mr-2">
                  {systemTypeLabels[system.type]}
                </Badge>
                {system.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="instances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="instances" className="gap-2">
            <Server className="h-4 w-4" />
            Instances ({instances.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Database className="h-4 w-4" />
            Services ({systemServices.length})
          </TabsTrigger>
          <TabsTrigger value="instance-services" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Instance Services ({instanceServices.filter(is => instances.some(i => i.id === is.instanceId)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instances">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Instances</CardTitle>
                  <CardDescription>
                    Configure connection details for each environment
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateInstance(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {instances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No instances configured yet</p>
                  <p className="text-sm">Add an instance to connect to your SAP system</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Environment</TableHead>
                      <TableHead>Base URL</TableHead>
                      <TableHead>Auth Type</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instances.map((instance) => (
                      <TableRow key={instance.id}>
                        <TableCell>
                          <Badge variant={envBadgeVariant[instance.environment]}>
                            {envLabels[instance.environment]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {instance.baseUrl}
                          </code>
                        </TableCell>
                        <TableCell className="capitalize">{instance.authType}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingInstance(instance)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteInstance(instance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>
                    {system.type === 's4_public' || system.type === 's4_private'
                      ? 'Predefined OData services for this S/4HANA system'
                      : 'Custom OData services for this system'}
                  </CardDescription>
                </div>
                {canAddServices && (
                  <Button onClick={() => setShowCreateService(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {systemServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No services configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Alias</TableHead>
                      <TableHead>Service Path</TableHead>
                      <TableHead>Entities</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {service.alias}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {service.servicePath}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{service.entities?.length || 0} entities</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefreshEntities(service.id)}
                              disabled={refreshingServiceId === service.id}
                              title="Refresh entities"
                            >
                              <RefreshCw className={`h-4 w-4 ${refreshingServiceId === service.id ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              title="Preview service"
                            >
                              <Link href={`/systems/${system.id}/services/${service.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingService(service)}
                              title="Edit service"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canAddServices && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteService(service.id)}
                                title="Delete service"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instance-services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Instance Services</CardTitle>
                  <CardDescription>
                    Configure services per instance with instance-specific credentials and entities
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {instances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No instances configured yet</p>
                  <p className="text-sm">Add an instance first to link services</p>
                </div>
              ) : systemServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No services configured yet</p>
                  <p className="text-sm">Add services first to link them to instances</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {instances.map((instance) => {
                    const linkedServices = instanceServices.filter(is => is.instanceId === instance.id);
                    const availableServices = systemServices.filter(ss => 
                      !linkedServices.some(ls => ls.systemServiceId === ss.id)
                    );
                    
                    return (
                      <Card key={instance.id} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Badge variant={envBadgeVariant[instance.environment]}>
                                  {envLabels[instance.environment]}
                                </Badge>
                                {instance.baseUrl}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {linkedServices.length} service{linkedServices.length !== 1 ? 's' : ''} linked
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLinkingInstance(instance)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Link Service
                            </Button>
                          </div>
                          {linkedServices.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No services linked to this instance
                            </div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Service</TableHead>
                                  <TableHead>Service Path</TableHead>
                                  <TableHead>Entities</TableHead>
                                  <TableHead>Auth Override</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {linkedServices.map((is) => {
                                  const service = systemServices.find(ss => ss.id === is.systemServiceId);
                                  return (
                                    <TableRow key={is.id}>
                                      <TableCell className="font-medium">
                                        {service?.name || 'Unknown Service'}
                                      </TableCell>
                                      <TableCell>
                                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                          {is.servicePathOverride || service?.servicePath || '-'}
                                        </code>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline">
                                            {is.entities?.length || 0} entities
                                          </Badge>
                                          {is.hasEntityOverride && (
                                            <Badge variant="secondary" className="text-xs">
                                              Override
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {is.hasAuthOverride ? (
                                          <Badge variant="secondary">Yes</Badge>
                                        ) : (
                                          <span className="text-muted-foreground text-sm">Inherited</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRefreshInstanceServiceEntities(is.id)}
                                            disabled={refreshingInstanceServiceId === is.id}
                                            title="Refresh entities from instance"
                                          >
                                            <RefreshCw className={`h-4 w-4 ${refreshingInstanceServiceId === is.id ? 'animate-spin' : ''}`} />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setConfiguringInstanceService(is)}
                                            title="Configure"
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            onClick={async () => {
                                              if (!confirm('Unlink this service from the instance?')) return;
                                              try {
                                                await api.instanceServices.delete(is.id);
                                                toast.success('Service unlinked');
                                                setInstanceServices(prev => prev.filter(prevIs => prevIs.id !== is.id));
                                                router.refresh();
                                              } catch (error: any) {
                                                toast.error(error.message || 'Failed to unlink service');
                                              }
                                            }}
                                            title="Unlink service"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showCreateInstance && (
        <CreateInstanceDialog
          systemId={system.id}
          existingEnvironments={instances.map(i => i.environment)}
          open={showCreateInstance}
          onOpenChange={setShowCreateInstance}
        />
      )}

      {editingInstance && (
        <EditInstanceDialog
          instance={editingInstance}
          open={!!editingInstance}
          onOpenChange={(open) => !open && setEditingInstance(null)}
        />
      )}

      {showCreateService && (
        <CreateServiceDialog
          systemId={system.id}
          open={showCreateService}
          onOpenChange={setShowCreateService}
        />
      )}

      {editingService && (
        <EditServiceDialog
          service={editingService}
          open={!!editingService}
          onOpenChange={(open) => !open && setEditingService(null)}
        />
      )}

      {linkingInstance && (
        <LinkServiceToInstanceDialog
          instance={linkingInstance}
          availableServices={systemServices.filter(ss => 
            !instanceServices.some(is => is.instanceId === linkingInstance.id && is.systemServiceId === ss.id)
          )}
          open={!!linkingInstance}
          onOpenChange={(open) => !open && setLinkingInstance(null)}
          onLinked={() => {
            // Refresh instance services
            api.instanceServices.list().then(setInstanceServices).catch(() => {});
          }}
        />
      )}

      {configuringInstanceService && (
        <InstanceServiceConfigDialog
          instanceService={configuringInstanceService}
          systemService={systemServices.find(ss => ss.id === configuringInstanceService.systemServiceId)!}
          open={!!configuringInstanceService}
          onOpenChange={(open) => {
            if (!open) setConfiguringInstanceService(null);
          }}
        />
      )}
    </div>
  );
}
