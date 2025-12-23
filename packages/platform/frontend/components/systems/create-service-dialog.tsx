'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, SystemService, Instance, InstanceEnvironment } from '@/lib/api';
import { toast } from 'sonner';
import { Search, Package } from 'lucide-react';

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

interface InstanceServiceLink {
  instanceId: string;
  systemServiceId: string;
}

interface CreateServiceDialogProps {
  systemId: string;
  instanceId?: string; // Optional - if not provided, show multi-select
  instances?: Instance[]; // All instances for multi-select mode
  existingServices: SystemService[];
  instanceServices?: InstanceServiceLink[]; // Existing links to detect duplicates
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateServiceDialog({
  systemId,
  instanceId,
  instances = [],
  existingServices,
  instanceServices = [],
  open,
  onOpenChange,
  onCreated,
}: CreateServiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>(
    instanceId ? [instanceId] : []
  );
  const [customService, setCustomService] = useState({
    name: '',
    alias: '',
    servicePath: '',
    description: '',
  });

  // Filter services by search query
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return existingServices;
    const query = serviceSearch.toLowerCase();
    return existingServices.filter(
      (s) =>
        s.name?.toLowerCase().includes(query) ||
        s.alias?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
  }, [existingServices, serviceSearch]);

  // Toggle service selection
  const toggleServiceSelection = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServiceIds((prev) => [...prev, serviceId]);
    } else {
      setSelectedServiceIds((prev) => prev.filter((id) => id !== serviceId));
    }
  };

  // Check if service is already linked to all selected instances
  const isServiceFullyLinked = (serviceId: string) => {
    if (targetInstanceIds.length === 0) return false;
    return targetInstanceIds.every((instId) =>
      instanceServices.some(
        (is) => is.instanceId === instId && is.systemServiceId === serviceId
      )
    );
  };

  // Show multi-select only when instanceId is not provided and we have instances
  const showMultiSelect = !instanceId && instances.length > 0;

  const toggleInstance = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInstanceIds(prev => [...prev, id]);
    } else {
      setSelectedInstanceIds(prev => prev.filter(i => i !== id));
    }
  };

  const targetInstanceIds = instanceId ? [instanceId] : selectedInstanceIds;

  const handleAddExisting = async () => {
    if (selectedServiceIds.length === 0 || targetInstanceIds.length === 0) return;

    setLoading(true);
    try {
      // Create instance services for all selected services x instances
      const creations = selectedServiceIds.flatMap((serviceId) =>
        targetInstanceIds
          .filter((instId) => !instanceServices.some(
            (is) => is.instanceId === instId && is.systemServiceId === serviceId
          ))
          .map((instId) =>
            api.instanceServices.create({
              instanceId: instId,
              systemServiceId: serviceId,
            })
          )
      );

      await Promise.all(creations);

      const serviceCount = selectedServiceIds.length;
      const instanceCount = targetInstanceIds.length;
      toast.success(
        `Added ${serviceCount} service${serviceCount > 1 ? 's' : ''} to ${instanceCount} instance${instanceCount > 1 ? 's' : ''}`
      );
      onOpenChange(false);
      setSelectedServiceIds([]);
      setServiceSearch('');
      setSelectedInstanceIds(instanceId ? [instanceId] : []);
      onCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add services');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customService.name || !customService.alias || !customService.servicePath) return;
    if (targetInstanceIds.length === 0) {
      toast.error('Please select at least one instance');
      return;
    }

    setLoading(true);
    try {
      // First create the system service
      const newService = await api.systemServices.create({
        systemId,
        name: customService.name,
        alias: customService.alias.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        servicePath: customService.servicePath,
        description: customService.description || undefined,
      });

      // Then link it to all selected instances
      await Promise.all(
        targetInstanceIds.map(instId =>
          api.instanceServices.create({
            instanceId: instId,
            systemServiceId: newService.id,
          })
        )
      );

      toast.success(`Custom service created and added to ${targetInstanceIds.length} instance(s)`);
      onOpenChange(false);
      setCustomService({ name: '', alias: '', servicePath: '', description: '' });
      setSelectedInstanceIds([]);
      onCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>
            Add an existing service or create a custom one
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={existingServices.length > 0 ? 'existing' : 'custom'}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" disabled={existingServices.length === 0}>
              Existing ({existingServices.length})
            </TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 pt-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search APIs by name, alias, or description..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Service count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredServices.length === existingServices.length
                  ? `${existingServices.length} APIs available`
                  : `${filteredServices.length} of ${existingServices.length} APIs`}
              </span>
              {selectedServiceIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedServiceIds.length} selected
                </Badge>
              )}
            </div>

            {/* Scrollable service list */}
            <ScrollArea className="h-[280px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mb-2" />
                    <p className="text-sm">No APIs match your search</p>
                  </div>
                ) : (
                  filteredServices.map((service) => {
                    const isLinked = isServiceFullyLinked(service.id);
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                      <div
                        key={service.id}
                        className={`flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors ${
                          isLinked ? 'opacity-50' : ''
                        }`}
                      >
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            toggleServiceSelection(service.id, checked === true)
                          }
                          disabled={isLinked}
                          className="mt-1"
                        />
                        <label
                          htmlFor={`service-${service.id}`}
                          className={`flex-1 space-y-1 ${isLinked ? '' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{service.name}</span>
                            {service.odataVersion && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {service.odataVersion}
                              </Badge>
                            )}
                            {isLinked && (
                              <Badge variant="secondary" className="text-[10px]">
                                linked
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {service.alias}
                          </div>
                          {service.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {service.description}
                            </div>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Instance selection (multi-select mode) */}
            {showMultiSelect && (
              <div className="grid gap-2">
                <Label>Link to Instances</Label>
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  {instances.map((inst) => (
                    <div key={inst.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`existing-inst-${inst.id}`}
                        checked={selectedInstanceIds.includes(inst.id)}
                        onCheckedChange={(checked) =>
                          toggleInstance(inst.id, checked === true)
                        }
                      />
                      <label
                        htmlFor={`existing-inst-${inst.id}`}
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${envColors[inst.environment]}`}
                        />
                        <span className="text-sm font-medium">
                          {envLabels[inst.environment]}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {inst.baseUrl}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
                {selectedInstanceIds.length === 0 && (
                  <p className="text-xs text-destructive">
                    Select at least one instance
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExisting}
                disabled={
                  loading ||
                  selectedServiceIds.length === 0 ||
                  targetInstanceIds.length === 0
                }
              >
                {loading
                  ? 'Adding...'
                  : `Add ${selectedServiceIds.length || ''} Service${selectedServiceIds.length !== 1 ? 's' : ''}${
                      targetInstanceIds.length > 1
                        ? ` to ${targetInstanceIds.length} instances`
                        : ''
                    }`}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="custom" className="pt-4">
            <form onSubmit={handleCreateCustom} className="space-y-4">
              {showMultiSelect && (
                <div className="grid gap-2">
                  <Label>Link to Instances</Label>
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    {instances.map(inst => (
                      <div key={inst.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`custom-inst-${inst.id}`}
                          checked={selectedInstanceIds.includes(inst.id)}
                          onCheckedChange={(checked) => toggleInstance(inst.id, checked === true)}
                        />
                        <label htmlFor={`custom-inst-${inst.id}`} className="flex items-center gap-2 cursor-pointer flex-1">
                          <span className={`w-2 h-2 rounded-full ${envColors[inst.environment]}`} />
                          <span className="text-sm font-medium">{envLabels[inst.environment]}</span>
                          <span className="text-xs text-muted-foreground truncate">{inst.baseUrl}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedInstanceIds.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one instance</p>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  placeholder="My Custom API"
                  value={customService.name}
                  onChange={(e) => setCustomService({ ...customService, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="alias">Alias *</Label>
                <Input
                  id="alias"
                  placeholder="my_api"
                  value={customService.alias}
                  onChange={(e) => setCustomService({ ...customService, alias: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Used in SDK to reference this service
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="servicePath">Service Path *</Label>
                <Input
                  id="servicePath"
                  placeholder="/sap/opu/odata/sap/MY_API"
                  value={customService.servicePath}
                  onChange={(e) => setCustomService({ ...customService, servicePath: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What does this service do?"
                  value={customService.description}
                  onChange={(e) => setCustomService({ ...customService, description: e.target.value })}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Entities will be automatically detected after the service is added.
              </p>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !customService.name || !customService.alias || !customService.servicePath || targetInstanceIds.length === 0}
                >
                  {loading ? 'Creating...' : `Create Service${targetInstanceIds.length > 1 ? ` for ${targetInstanceIds.length} instances` : ''}`}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
