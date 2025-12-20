'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, SystemService, Instance, InstanceEnvironment } from '@/lib/api';
import { toast } from 'sonner';

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
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>(
    instanceId ? [instanceId] : []
  );
  const [customService, setCustomService] = useState({
    name: '',
    alias: '',
    servicePath: '',
    description: '',
  });

  // Show multi-select only when instanceId is not provided and we have instances
  const showMultiSelect = !instanceId && instances.length > 0;

  // Check if an instance already has a specific service linked
  const isServiceLinkedToInstance = (instId: string, serviceId: string) => {
    return instanceServices.some(
      is => is.instanceId === instId && is.systemServiceId === serviceId
    );
  };

  const toggleInstance = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedInstanceIds(prev => [...prev, id]);
    } else {
      setSelectedInstanceIds(prev => prev.filter(i => i !== id));
    }
  };

  const targetInstanceIds = instanceId ? [instanceId] : selectedInstanceIds;

  const handleAddExisting = async () => {
    if (!selectedServiceId || targetInstanceIds.length === 0) return;

    setLoading(true);
    try {
      // Create instance services for all selected instances
      await Promise.all(
        targetInstanceIds.map(instId =>
          api.instanceServices.create({
            instanceId: instId,
            systemServiceId: selectedServiceId,
          })
        )
      );
      toast.success(`Service added to ${targetInstanceIds.length} instance(s)`);
      onOpenChange(false);
      setSelectedServiceId('');
      setSelectedInstanceIds([]);
      onCreated?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add service');
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
      <DialogContent className="sm:max-w-[500px]">
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
            <div className="grid gap-2">
              <Label>Select Service</Label>
              <Select
                value={selectedServiceId}
                onValueChange={(value) => {
                  setSelectedServiceId(value);
                  // Clear selections that are already linked to the new service
                  setSelectedInstanceIds(prev =>
                    prev.filter(instId => !isServiceLinkedToInstance(instId, value))
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service..." />
                </SelectTrigger>
                <SelectContent>
                  {existingServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex flex-col">
                        <span>{service.name}</span>
                        <span className="text-xs text-muted-foreground">{service.alias}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showMultiSelect && (
              <div className="grid gap-2">
                <Label>Link to Instances</Label>
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  {instances.map(inst => {
                    const alreadyLinked = !!selectedServiceId && isServiceLinkedToInstance(inst.id, selectedServiceId);
                    return (
                      <div key={inst.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`existing-inst-${inst.id}`}
                          checked={selectedInstanceIds.includes(inst.id)}
                          onCheckedChange={(checked) => toggleInstance(inst.id, checked === true)}
                          disabled={alreadyLinked}
                        />
                        <label
                          htmlFor={`existing-inst-${inst.id}`}
                          className={`flex items-center gap-2 flex-1 ${alreadyLinked ? 'opacity-50' : 'cursor-pointer'}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${envColors[inst.environment]}`} />
                          <span className="text-sm font-medium">{envLabels[inst.environment]}</span>
                          {alreadyLinked ? (
                            <span className="text-xs text-muted-foreground">(already linked)</span>
                          ) : (
                            <span className="text-xs text-muted-foreground truncate">{inst.baseUrl}</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {selectedInstanceIds.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one instance</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExisting} disabled={loading || !selectedServiceId || targetInstanceIds.length === 0}>
                {loading ? 'Adding...' : `Add Service${targetInstanceIds.length > 1 ? ` to ${targetInstanceIds.length} instances` : ''}`}
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
