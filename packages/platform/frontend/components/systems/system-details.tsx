'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { api, System, Instance, SystemService, InstanceService, SystemType } from '@/lib/api';
import { envLabels, envColors, envBgColors, envBorderAllColors, envOrder, TOTAL_ENVIRONMENTS } from '@/lib/environment';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Server, Database, RefreshCw, Globe, Key, Loader2, Settings, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { CreateInstanceDialog } from './create-instance-dialog';
import { EditInstanceDialog } from './edit-instance-dialog';
import { CreateServiceDialog } from './create-service-dialog';
import { EditServiceDialog } from './edit-service-dialog';
import { ServiceVerificationStatus } from './service-verification-status';
import { getErrorMessage } from '@/lib/error-utils';

const systemTypeLabels: Record<SystemType, string> = {
  s4_public: 'SAP S/4HANA Cloud Public Edition',
  s4_private: 'SAP S/4HANA Cloud Private Edition',
  s4_onprem: 'SAP S/4HANA On-Premise',
  btp: 'SAP BTP',
  other: 'Other',
};


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
  const [editingService, setEditingService] = useState<{
    systemService: SystemService;
    instanceService: InstanceService;
  } | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [deletingInstance, setDeletingInstance] = useState<Instance | null>(null);
  const [deletingInstanceLoading, setDeletingInstanceLoading] = useState(false);
  const [deletingService, setDeletingService] = useState<string | null>(null);
  const [deletingServiceLoading, setDeletingServiceLoading] = useState(false);

  // Sort instances by lifecycle order (sandbox first, production last)
  const sortedInstances = [...instances].sort((a, b) => envOrder[a.environment] - envOrder[b.environment]);

  // Get default instance (production is most important, fallback to highest priority available)
  const getDefaultInstance = (instanceList: Instance[]) => {
    if (instanceList.length === 0) return undefined;
    // Sort by priority descending (production=4 first, sandbox=0 last)
    const byPriority = [...instanceList].sort((a, b) => envOrder[b.environment] - envOrder[a.environment]);
    return byPriority[0];
  };

  // Get initial tab from URL or default to most important instance
  const getInitialTab = () => {
    const envParam = searchParams.get('env');
    const legacyInstanceParam = searchParams.get('instance');
    if (envParam) {
      const found = sortedInstances.find(i => i.environment === envParam);
      if (found) return found.environment;
    }
    if (legacyInstanceParam) {
      const found = sortedInstances.find(i => i.id === legacyInstanceParam);
      if (found) return found.environment;
    }
    return getDefaultInstance(sortedInstances)?.environment || 'empty';
  };

  // Use local state for instant tab switching
  const [activeTab, setActiveTabState] = useState(getInitialTab);

  const setActiveTab = useCallback((env: string) => {
    if (env === activeTab) return;
    // Update local state immediately for instant UI response
    setActiveTabState(env);
    // Sync URL in background (non-blocking)
    const params = new URLSearchParams(searchParams.toString());
    params.delete('instance');
    params.set('env', env);
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [searchParams, activeTab]);

  const handleInstanceCreated = useCallback(async (newInstance: Instance) => {
    // Add instance to local state immediately
    setInstances(prev => [...prev, newInstance]);
    // Switch to the new instance tab
    setActiveTab(newInstance.environment);

    // For S4HANA systems, services are auto-linked and verified automatically
    if (system.type === 's4_public' || system.type === 's4_private' || system.type === 's4_onprem') {
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
        } catch {
          // Retry on error
          setTimeout(() => pollForUpdates(attempts + 1), 1000);
        }
      };

      // Start polling after initial delay for backend to create instance services
      setTimeout(() => pollForUpdates(0), 1500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system.type]);

  const handleServiceCreated = useCallback(async () => {
    // Refresh system services to get the newly created service
    try {
      const updatedSystemServices = await api.systemServices.list(system.id);
      setSystemServices(updatedSystemServices);
    } catch {
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
      } catch {
        // Retry on error
        setTimeout(() => pollForUpdates(attempts + 1), 1000);
      }
    };

    // Start polling after initial delay
    setTimeout(() => pollForUpdates(0), 500);
  }, [system.id]);

  const handleDeleteInstance = async () => {
    if (!deletingInstance) return;
    setDeletingInstanceLoading(true);
    try {
      await api.instances.delete(deletingInstance.id);
      const remainingInstances = instances.filter(i => i.id !== deletingInstance.id);
      setInstances(remainingInstances);
      setInstanceServices(prev => prev.filter(is => is.instanceId !== deletingInstance.id));
      toast.success('Instance deleted');
      setDeletingInstance(null);

      // Navigate to default instance (most important one remaining)
      const defaultInstance = getDefaultInstance(remainingInstances);
      if (defaultInstance) {
        setActiveTab(defaultInstance.environment);
      } else {
        // No instances left, clear URL param
        router.replace(window.location.pathname, { scroll: false });
      }
    } catch {
      toast.error('Failed to delete instance');
    } finally {
      setDeletingInstanceLoading(false);
    }
  };

  const handleRefreshService = async (instanceServiceId: string) => {
    setRefreshingInstanceServiceId(instanceServiceId);
    try {
      const result = await api.instanceServices.refreshEntities(instanceServiceId);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      setInstanceServices(prev => prev.map(is =>
        is.id === instanceServiceId ? { ...is, entities: result.entities, verificationStatus: result.verificationStatus, lastVerifiedAt: result.lastVerifiedAt } : is
      ));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh service';
      toast.error(getErrorMessage(errorMessage));
      // Update state to reflect failed verification
      setInstanceServices(prev => prev.map(is =>
        is.id === instanceServiceId ? { ...is, verificationStatus: 'failed', verificationError: errorMessage, lastVerifiedAt: new Date().toISOString() } : is
      ));
    } finally {
      setRefreshingInstanceServiceId(null);
    }
  };

  const handleRefreshAllServices = async (instanceId: string) => {
    setRefreshingAllForInstanceId(instanceId);
    try {
      const result = await api.instances.refreshAllServices(instanceId);
      toast.success(`Verified ${result.verified} services, ${result.failed} failed`);

      // Update state directly from verification results for immediate UI update
      setInstanceServices(prev => prev.map(is => {
        const refreshResult = result.results.find(r => r.serviceId === is.id);
        if (refreshResult) {
          return {
            ...is,
            verificationStatus: refreshResult.status,
            verificationError: refreshResult.error || null,
            lastVerifiedAt: new Date().toISOString(),
          };
        }
        return is;
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify services';
      toast.error(getErrorMessage(errorMessage));
    } finally {
      setRefreshingAllForInstanceId(null);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;
    setDeletingServiceLoading(true);

    // Get the systemServiceId before deleting
    const deletedInstanceService = instanceServices.find(is => is.id === deletingService);
    const systemServiceId = deletedInstanceService?.systemServiceId;

    try {
      await api.instanceServices.delete(deletingService);
      toast.success('Service removed');

      // Update local instanceServices state
      const remainingInstanceServices = instanceServices.filter(is => is.id !== deletingService);
      setInstanceServices(remainingInstanceServices);

      // Check if this was the last link to the system service
      // If so, remove it from systemServices state as well (backend already deleted it)
      if (systemServiceId) {
        const hasOtherLinks = remainingInstanceServices.some(is => is.systemServiceId === systemServiceId);
        if (!hasOtherLinks) {
          setSystemServices(prev => prev.filter(ss => ss.id !== systemServiceId));
        }
      }

      setDeletingService(null);
    } catch (error) {
      // Handle 409 conflict (service is used by API keys)
      const rawMessage = error instanceof Error ? error.message : 'Failed to remove service';
      let errorMessage = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage);
        if (parsed.apiKeyCount) {
          errorMessage = `Cannot delete: service is used by ${parsed.apiKeyCount} API key access grant(s). Remove the API key access grants first.`;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        // Not JSON, use original message
      }
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setDeletingServiceLoading(false);
    }
  };

  // Always refresh instance services on mount to get fresh status
  React.useEffect(() => {
    api.instanceServices.list().then(setInstanceServices).catch(() => {});
  }, []);

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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-end border-b border-border">
                <TabsList className="h-auto p-0 bg-transparent border-0 gap-0">
                  {sortedInstances.map((instance) => {
                    const linkedServices = instanceServices.filter(is => is.instanceId === instance.id);
                    const isActive = activeTab === instance.environment;

                    return (
                      <TabsTrigger
                        key={instance.environment}
                        value={instance.environment}
                        unstyled
                        className={`relative flex flex-col items-center gap-0.5 px-4 sm:px-8 md:px-12 py-2 sm:py-3 rounded-t-lg cursor-pointer transition-all ${
                          isActive
                            ? `${envBgColors[instance.environment]} border border-b-0 ${envBorderAllColors[instance.environment]} -mb-px`
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${envColors[instance.environment]}`} />
                          <span className={isActive ? 'text-foreground font-medium' : ''}>{envLabels[instance.environment]}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {linkedServices.length} services
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {/* Add Instance button */}
                {instances.length < TOTAL_ENVIRONMENTS && (
                  <button
                    type="button"
                    onClick={() => setShowCreateInstance(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 ml-2 mb-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Instance</span>
                  </button>
                )}
              </div>

              {sortedInstances.map((instance) => {
                const linkedServices = instanceServices.filter(is => is.instanceId === instance.id);

                return (
                  <TabsContent key={instance.environment} value={instance.environment} className="-mt-[7px]">
                    {/* Instance Panel */}
                    <div className={`relative border border-t-0 rounded-b-lg shadow-sm overflow-hidden`}>
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
                                <span className="capitalize">{instance.authType === 'custom' ? 'Custom Header' : instance.authType}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingInstance(instance)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingInstance(instance)}
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
                                  className="h-8 w-full sm:w-[180px] pl-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowCreateService(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Service
                            </Button>
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
                                  Add services from the catalog or create custom ones
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowCreateService(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Service
                                </Button>
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
                                    // Use API-provided systemService data, fallback to local lookup
                                    const serviceName = is.systemService?.name || systemServices.find(ss => ss.id === is.systemServiceId)?.name;
                                    const serviceAlias = is.systemService?.alias || systemServices.find(ss => ss.id === is.systemServiceId)?.alias;
                                    const searchLower = serviceSearch.toLowerCase();
                                    return (
                                      serviceName?.toLowerCase().includes(searchLower) ||
                                      serviceAlias?.toLowerCase().includes(searchLower)
                                    );
                                  })
                                  .map((is) => {
                                  // Use API-provided systemService data, fallback to local lookup for full service data
                                  const fullService = systemServices.find(ss => ss.id === is.systemServiceId);
                                  // Prefer API data for display (always fresh), use fullService for editing
                                  const serviceName = is.systemService?.name || fullService?.name;
                                  const serviceAlias = is.systemService?.alias || fullService?.alias;
                                  const serviceOdataVersion = is.systemService?.odataVersion || fullService?.odataVersion;
                                  return (
                                    <TableRow
                                      key={is.id}
                                      className="cursor-pointer hover:bg-muted/30 transition-colors border-b last:border-0"
                                      onClick={() => router.push(`/systems/${system.id}/instance-services/${is.id}`)}
                                    >
                                      <TableCell className="py-1.5">
                                        <div className="font-medium text-sm">{serviceName || 'Unknown Service'}</div>
                                        <div className="flex items-center gap-1.5">
                                          <code className="text-xs text-muted-foreground font-mono">{serviceAlias || '-'}</code>
                                          {serviceOdataVersion && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                              {serviceOdataVersion.toUpperCase()}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-1.5 text-sm text-muted-foreground">
                                        {is.entities?.length ?? '-'}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        <ServiceVerificationStatus
                                          status={is.verificationStatus as 'pending' | 'verified' | 'failed' | null}
                                          lastVerifiedAt={is.lastVerifiedAt}
                                          entityCount={is.entities?.length}
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
                                              if (fullService) {
                                                setEditingService({ systemService: fullService, instanceService: is });
                                              }
                                            }}
                                            title="Edit service"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />
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
                                              setDeletingService(is.id);
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
          systemName={system.name}
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
          onUpdated={(updatedInstance) => {
            setInstances(prev => prev.map(inst =>
              inst.id === updatedInstance.id ? updatedInstance : inst
            ));
          }}
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

      {editingService && (
        <EditServiceDialog
          systemService={editingService.systemService}
          instanceService={editingService.instanceService}
          open={!!editingService}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingService(null);
            }
          }}
          onUpdated={() => {
            // Refresh system services and instance services to get updated data
            api.systemServices.list(system.id).then(setSystemServices).catch(() => {});
            api.instanceServices.list().then(setInstanceServices).catch(() => {});
          }}
        />
      )}

      {/* Delete Instance Confirmation Dialog */}
      <AlertDialog open={!!deletingInstance} onOpenChange={(open) => !open && setDeletingInstance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instance</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {deletingInstance && envLabels[deletingInstance.environment]} instance? All linked services will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInstanceLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInstance}
              disabled={deletingInstanceLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingInstanceLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Service Confirmation Dialog */}
      <AlertDialog open={!!deletingService} onOpenChange={(open) => !open && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this service from the instance? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingServiceLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              disabled={deletingServiceLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingServiceLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
