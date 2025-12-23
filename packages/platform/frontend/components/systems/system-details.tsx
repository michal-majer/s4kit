'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, System, Instance, SystemService, InstanceService, SystemType, InstanceEnvironment } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Server, Database, RefreshCw, Globe, Key, CheckCircle2, AlertCircle, Clock, Loader2, Settings, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { CreateInstanceDialog } from './create-instance-dialog';
import { EditInstanceDialog } from './edit-instance-dialog';
import { CreateServiceDialog } from './create-service-dialog';
import { ServiceVerificationStatus } from './service-verification-status';
import { InstanceServiceConfigDialog } from './instance-service-config-dialog';

const systemTypeLabels: Record<SystemType, string> = {
  s4_public: 'SAP S/4HANA Cloud Public Edition',
  s4_private: 'SAP S/4HANA Cloud Private Edition',
  btp: 'SAP BTP',
  other: 'Other',
};

const envLabels: Record<InstanceEnvironment, string> = {
  sandbox: 'Sandbox',
  dev: 'Development',
  quality: 'Quality',
  preprod: 'Pre-Production',
  production: 'Production',
};

const envColors: Record<InstanceEnvironment, string> = {
  sandbox: 'bg-purple-500',
  dev: 'bg-blue-500',
  quality: 'bg-amber-500',
  preprod: 'bg-orange-500',
  production: 'bg-green-500',
};

const envBorderColors: Record<InstanceEnvironment, string> = {
  sandbox: 'border-t-purple-500',
  dev: 'border-t-blue-500',
  quality: 'border-t-amber-500',
  preprod: 'border-t-orange-500',
  production: 'border-t-green-500',
};

const envBgColors: Record<InstanceEnvironment, string> = {
  sandbox: 'bg-purple-50 dark:bg-purple-950/30',
  dev: 'bg-blue-50 dark:bg-blue-950/30',
  quality: 'bg-amber-50 dark:bg-amber-950/30',
  preprod: 'bg-orange-50 dark:bg-orange-950/30',
  production: 'bg-green-50 dark:bg-green-950/30',
};

const envBadgeVariant: Record<InstanceEnvironment, 'outline' | 'secondary' | 'default'> = {
  sandbox: 'outline',
  dev: 'outline',
  quality: 'secondary',
  preprod: 'secondary',
  production: 'default',
};

// Lifecycle order for sorting instances
const envOrder: Record<InstanceEnvironment, number> = {
  sandbox: 0,
  dev: 1,
  quality: 2,
  preprod: 3,
  production: 4,
};

// Total number of available environments
const TOTAL_ENVIRONMENTS = Object.keys(envOrder).length;

interface SystemDetailsProps {
  system: System;
  instances: Instance[];
  systemServices: SystemService[];
  instanceServices?: InstanceService[];
}

export function SystemDetails({ system, instances: initialInstances, systemServices: initialSystemServices, instanceServices: initialInstanceServices }: SystemDetailsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [instances, setInstances] = useState<Instance[]>(initialInstances);
  const [systemServices, setSystemServices] = useState<SystemService[]>(initialSystemServices);
  const [instanceServices, setInstanceServices] = useState<InstanceService[]>(initialInstanceServices || []);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [refreshingInstanceServiceId, setRefreshingInstanceServiceId] = useState<string | null>(null);
  const [refreshingAllForInstanceId, setRefreshingAllForInstanceId] = useState<string | null>(null);
  const [showCreateInstance, setShowCreateInstance] = useState(false);
  const [showCreateService, setShowCreateService] = useState(false);
  const [verifyingInstanceId, setVerifyingInstanceId] = useState<string | null>(null);
  const [configuringService, setConfiguringService] = useState<{
    instanceService: InstanceService;
    systemService: SystemService;
  } | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');

  // Sort instances by lifecycle order (sandbox first, production last)
  const sortedInstances = [...instances].sort((a, b) => envOrder[a.environment] - envOrder[b.environment]);

  // Get default instance (production is most important, fallback to highest priority available)
  const getDefaultInstance = (instanceList: Instance[]) => {
    if (instanceList.length === 0) return undefined;
    // Sort by priority descending (production=4 first, sandbox=0 last)
    const byPriority = [...instanceList].sort((a, b) => envOrder[b.environment] - envOrder[a.environment]);
    return byPriority[0];
  };

  // Get active tab from URL or default to most important instance
  // Support legacy ?instance=<id> param for backwards compatibility
  const envParam = searchParams.get('env');
  const legacyInstanceParam = searchParams.get('instance');
  const activeInstance = envParam
    ? sortedInstances.find(i => i.environment === envParam)
    : legacyInstanceParam
      ? sortedInstances.find(i => i.id === legacyInstanceParam)
      : getDefaultInstance(sortedInstances);
  const activeTab = activeInstance?.environment || 'empty';

  const setActiveTab = useCallback((env: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('instance'); // Remove old param if present
    params.set('env', env);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleInstanceCreated = useCallback(async (newInstance: Instance) => {
    // Add instance to local state immediately
    setInstances(prev => [...prev, newInstance]);
    // Switch to the new instance tab
    setActiveTab(newInstance.environment);

    // For S4HANA systems, services are auto-linked and verified automatically
    if (system.type === 's4_public' || system.type === 's4_private') {
      setVerifyingInstanceId(newInstance.id);

      // Poll for updates until all services are verified or failed
      const pollForUpdates = async (attempts = 0) => {
        if (attempts > 30) {
          // Stop polling after ~30 seconds
          setVerifyingInstanceId(null);
          return;
        }

        try {
          const updated = await api.instanceServices.list();
          setInstanceServices(updated);

          // Check if any services for this instance are still pending
          const instanceServices = updated.filter(is => is.instanceId === newInstance.id);
          const hasPending = instanceServices.some(is =>
            is.verificationStatus === 'pending' || !is.verificationStatus
          );

          if (hasPending && instanceServices.length > 0) {
            // Continue polling
            setTimeout(() => pollForUpdates(attempts + 1), 1000);
          } else {
            // All done
            setVerifyingInstanceId(null);
          }
        } catch (e) {
          // Retry on error
          setTimeout(() => pollForUpdates(attempts + 1), 1000);
        }
      };

      // Start polling after initial delay for backend to create instance services
      setTimeout(() => pollForUpdates(0), 1500);
    }
  }, [system.type]);

  const handleServiceCreated = useCallback(async () => {
    // Refresh system services to get the newly created service
    try {
      const updatedSystemServices = await api.systemServices.list(system.id);
      setSystemServices(updatedSystemServices);
    } catch (e) {
      // Continue with polling even if system services refresh fails
    }

    // Poll for updates until newly added services are verified
    const pollForUpdates = async (attempts = 0) => {
      if (attempts > 20) {
        // Stop polling after ~20 seconds
        return;
      }

      try {
        const updated = await api.instanceServices.list();
        setInstanceServices(updated);

        // Check if any services are still pending
        const hasPending = updated.some(is =>
          is.verificationStatus === 'pending'
        );

        if (hasPending) {
          // Continue polling
          setTimeout(() => pollForUpdates(attempts + 1), 1000);
        }
      } catch (e) {
        // Retry on error
        setTimeout(() => pollForUpdates(attempts + 1), 1000);
      }
    };

    // Start polling after initial delay
    setTimeout(() => pollForUpdates(0), 500);
  }, [system.id]);

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instance? All linked services will be removed.')) return;
    try {
      await api.instances.delete(id);
      const remainingInstances = instances.filter(i => i.id !== id);
      setInstances(remainingInstances);
      setInstanceServices(prev => prev.filter(is => is.instanceId !== id));
      toast.success('Instance deleted');

      // Navigate to default instance (most important one remaining)
      const defaultInstance = getDefaultInstance(remainingInstances);
      if (defaultInstance) {
        setActiveTab(defaultInstance.environment);
      } else {
        // No instances left, clear URL param
        router.replace(window.location.pathname, { scroll: false });
      }
    } catch (error) {
      toast.error('Failed to delete instance');
    }
  };

  const handleRefreshService = async (instanceServiceId: string) => {
    setRefreshingInstanceServiceId(instanceServiceId);
    try {
      const result = await api.instanceServices.refreshEntities(instanceServiceId);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      setInstanceServices(prev => prev.map(is =>
        is.id === instanceServiceId ? { ...is, entities: result.entities, verificationStatus: result.verificationStatus, lastVerifiedAt: result.lastVerifiedAt, entityCount: result.entityCount } : is
      ));
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh service');
    } finally {
      setRefreshingInstanceServiceId(null);
    }
  };

  const handleRefreshAllServices = async (instanceId: string) => {
    setRefreshingAllForInstanceId(instanceId);
    try {
      const result = await api.instances.refreshAllServices(instanceId);
      toast.success(`Verified ${result.verified} services, ${result.failed} failed`);
      const updated = await api.instanceServices.list();
      setInstanceServices(updated);
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify services');
    } finally {
      setRefreshingAllForInstanceId(null);
    }
  };

  const handleDeleteService = async (instanceServiceId: string) => {
    if (!confirm('Remove this service from the instance?')) return;
    try {
      await api.instanceServices.delete(instanceServiceId);
      toast.success('Service removed');
      setInstanceServices(prev => prev.filter(is => is.id !== instanceServiceId));
    } catch (error: any) {
      // Handle 409 conflict (service is used by API keys)
      let errorMessage = error.message || 'Failed to remove service';
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.apiKeyCount) {
          errorMessage = `Cannot delete: service is used by ${parsed.apiKeyCount} API key access grant(s). Remove the API key access grants first.`;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        // Not JSON, use original message
      }
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  // Load instance services if not provided
  React.useEffect(() => {
    if (!initialInstanceServices) {
      api.instanceServices.list().then(setInstanceServices).catch(() => {});
    }
  }, [initialInstanceServices]);

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/systems">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Systems
          </Link>
        </Button>
      </div>

      {/* System & Instances Card */}
      <Card>
        <CardHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-semibold tracking-tight">{system.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {systemTypeLabels[system.type]}
                {system.description && <span> · {system.description}</span>}
              </p>
            </div>
            <div className="flex gap-2">
              {instances.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowCreateService(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              )}
              {instances.length < TOTAL_ENVIRONMENTS && (
                <Button size="sm" onClick={() => setShowCreateInstance(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instance
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {instances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No instances configured</p>
              <p className="text-sm mt-1 mb-4">Add an instance to connect to your SAP system</p>
              <Button variant="outline" onClick={() => setShowCreateInstance(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Instance
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
              <TabsList className="w-full h-auto p-0 bg-transparent border-0">
                {sortedInstances.map((instance) => {
                  const linkedServices = instanceServices.filter(is => is.instanceId === instance.id);
                  const isActive = activeTab === instance.environment;

                  return (
                    <TabsTrigger
                      key={instance.environment}
                      value={instance.environment}
                      unstyled
                      className={`flex-1 relative flex flex-col items-center gap-0.5 px-6 py-3 cursor-pointer border-t-2 transition-all rounded-t-lg ${
                        isActive
                          ? `${envBgColors[instance.environment]} ${envBorderColors[instance.environment]} border-x border-x-border`
                          : 'border-t-transparent border-b border-b-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${envColors[instance.environment]}`} />
                        <span className={isActive ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}>{envLabels[instance.environment]}</span>
                      </div>
                      <span className={`text-xs ${isActive ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                        {linkedServices.length} services
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {sortedInstances.map((instance) => {
                const linkedServices = instanceServices.filter(is => is.instanceId === instance.id);

                return (
                  <TabsContent key={instance.environment} value={instance.environment} className="mt-0">
                    {/* Instance Panel - connects with active tab */}
                    <div className={`rounded-b-lg rounded-tr-lg border border-t-4 shadow-sm overflow-hidden ${envBorderColors[instance.environment]}`}>
                      {/* Instance Header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-medium">
                              {envLabels[instance.environment]}
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Globe className="h-3.5 w-3.5" />
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{instance.baseUrl}</code>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Key className="h-3.5 w-3.5" />
                                <span className="capitalize">{instance.authType === 'api_key' ? 'API Key' : instance.authType}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingInstance(instance)}
                              title="Edit instance"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteInstance(instance.id)}
                              title="Delete instance"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Verification Progress Banner */}
                      {verifyingInstanceId === instance.id && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              Verifying services...
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              Connecting to your SAP system and detecting available entities. This may take a moment.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Services Section */}
                      <div className="border-t">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">
                              {linkedServices.length} Service{linkedServices.length !== 1 ? 's' : ''}
                              {systemServices.length > linkedServices.length && (
                                <span className="text-muted-foreground font-normal">
                                  {' '}· {systemServices.length - linkedServices.length} more available
                                </span>
                              )}
                            </span>
                            {linkedServices.length > 3 && (
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  placeholder="Search..."
                                  value={serviceSearch}
                                  onChange={(e) => setServiceSearch(e.target.value)}
                                  className="h-8 w-[180px] pl-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {systemServices.length > linkedServices.length && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowCreateService(true)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Browse Catalog
                              </Button>
                            )}
                            {linkedServices.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRefreshAllServices(instance.id)}
                                disabled={refreshingAllForInstanceId === instance.id}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${refreshingAllForInstanceId === instance.id ? 'animate-spin' : ''}`} />
                                {refreshingAllForInstanceId === instance.id ? 'Verifying...' : 'Verify All'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {linkedServices.length === 0 ? (
                          <div className="text-center py-12 mx-5 mb-5 text-muted-foreground rounded-lg border border-dashed">
                            {verifyingInstanceId === instance.id ? (
                              <>
                                <Loader2 className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                                <p className="text-sm font-medium">Loading services...</p>
                                <p className="text-xs mt-1">Please wait while we set up your services</p>
                              </>
                            ) : (
                              <>
                                <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">No services linked yet</p>
                                <p className="text-xs mt-1 mb-3">
                                  {systemServices.length > 0
                                    ? `Browse ${systemServices.length} available APIs to add services to this instance`
                                    : 'Add services to this instance'}
                                </p>
                                {systemServices.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowCreateService(true)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Browse API Catalog
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 pb-4">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent border-b">
                                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground h-8">Service</TableHead>
                                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground h-8">Entities</TableHead>
                                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground h-8">Status</TableHead>
                                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-right w-[100px] h-8">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {linkedServices
                                  .filter((is) => {
                                    if (!serviceSearch) return true;
                                    const service = systemServices.find(ss => ss.id === is.systemServiceId);
                                    const searchLower = serviceSearch.toLowerCase();
                                    return (
                                      service?.name?.toLowerCase().includes(searchLower) ||
                                      service?.alias?.toLowerCase().includes(searchLower)
                                    );
                                  })
                                  .map((is) => {
                                  const service = systemServices.find(ss => ss.id === is.systemServiceId);
                                  return (
                                    <TableRow
                                      key={is.id}
                                      className="cursor-pointer hover:bg-muted/30 transition-colors border-b last:border-0"
                                      onClick={() => router.push(`/systems/${system.id}/instance-services/${is.id}`)}
                                    >
                                      <TableCell className="py-1.5">
                                        <div className="font-medium text-sm">{service?.name || 'Unknown Service'}</div>
                                        <div className="flex items-center gap-1.5">
                                          <code className="text-xs text-muted-foreground font-mono">{service?.alias || '-'}</code>
                                          {service?.odataVersion && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                              {service.odataVersion.toUpperCase()}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-1.5 text-sm text-muted-foreground">
                                        {is.entityCount ?? '-'}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        <ServiceVerificationStatus
                                          status={is.verificationStatus as 'pending' | 'verified' | 'failed' | null}
                                          lastVerifiedAt={is.lastVerifiedAt}
                                          entityCount={is.entityCount}
                                          error={is.verificationError}
                                        />
                                      </TableCell>
                                      <TableCell className="text-right py-1.5">
                                        <div className="flex items-center justify-end gap-0.5">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (service) {
                                                setConfiguringService({ instanceService: is, systemService: service });
                                              }
                                            }}
                                            title="Configure service"
                                          >
                                            <Settings className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRefreshService(is.id);
                                            }}
                                            disabled={refreshingInstanceServiceId === is.id}
                                            title="Verify service"
                                          >
                                            <RefreshCw className={`h-3.5 w-3.5 ${refreshingInstanceServiceId === is.id ? 'animate-spin' : ''}`} />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteService(is.id);
                                            }}
                                            title="Remove service"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {showCreateInstance && (
        <CreateInstanceDialog
          systemId={system.id}
          existingEnvironments={instances.map(i => i.environment)}
          open={showCreateInstance}
          onOpenChange={setShowCreateInstance}
          onCreated={handleInstanceCreated}
        />
      )}

      {editingInstance && (
        <EditInstanceDialog
          instance={editingInstance}
          open={!!editingInstance}
          onOpenChange={(open: boolean) => !open && setEditingInstance(null)}
        />
      )}

      {showCreateService && (
        <CreateServiceDialog
          systemId={system.id}
          instances={instances}
          existingServices={systemServices}
          instanceServices={instanceServices}
          open={showCreateService}
          onOpenChange={setShowCreateService}
          onCreated={handleServiceCreated}
        />
      )}

      {configuringService && (
        <InstanceServiceConfigDialog
          instanceService={configuringService.instanceService}
          systemService={configuringService.systemService}
          open={!!configuringService}
          onOpenChange={(open) => !open && setConfiguringService(null)}
        />
      )}
    </div>
  );
}
