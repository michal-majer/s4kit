'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthConfigSelector } from '@/components/common/auth-config-selector';
import { api, SystemService, InstanceService } from '@/lib/api';
import { envLabels } from '@/lib/environment';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface EditServiceDialogProps {
  systemService: SystemService;
  instanceService: InstanceService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditServiceDialog({
  systemService,
  instanceService,
  open,
  onOpenChange,
  onUpdated,
}: EditServiceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Service fields (SystemService)
  const [serviceData, setServiceData] = useState({
    name: systemService.name,
    alias: systemService.alias,
    servicePath: systemService.servicePath,
    description: systemService.description || '',
  });

  // Instance override fields (InstanceService)
  const [overrideData, setOverrideData] = useState({
    useServicePathOverride: !!instanceService.servicePathOverride,
    servicePathOverride: instanceService.servicePathOverride || '',
    useAuthOverride: instanceService.hasAuthOverride || false,
    authConfigId: instanceService.authConfigId || null,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setServiceData({
        name: systemService.name,
        alias: systemService.alias,
        servicePath: systemService.servicePath,
        description: systemService.description || '',
      });
      setOverrideData({
        useServicePathOverride: !!instanceService.servicePathOverride,
        servicePathOverride: instanceService.servicePathOverride || '',
        useAuthOverride: instanceService.hasAuthOverride || false,
        authConfigId: instanceService.authConfigId || null,
      });
    }
  }, [systemService, instanceService, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!serviceData.name.trim()) {
      toast.error('Name is required');
      setLoading(false);
      return;
    }

    if (!serviceData.alias.trim()) {
      toast.error('Alias is required');
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9-_]+$/i.test(serviceData.alias)) {
      toast.error('Alias can only contain letters, numbers, dashes and underscores');
      setLoading(false);
      return;
    }

    if (!serviceData.servicePath.trim()) {
      toast.error('Service path is required');
      setLoading(false);
      return;
    }

    try {
      // Check if service data changed
      const serviceChanged =
        serviceData.name !== systemService.name ||
        serviceData.alias !== systemService.alias ||
        serviceData.servicePath !== systemService.servicePath ||
        serviceData.description !== (systemService.description || '');

      // Check if override data changed
      const overrideChanged =
        overrideData.useServicePathOverride !== !!instanceService.servicePathOverride ||
        overrideData.servicePathOverride !== (instanceService.servicePathOverride || '') ||
        overrideData.useAuthOverride !== (instanceService.hasAuthOverride || false) ||
        overrideData.authConfigId !== (instanceService.authConfigId || null);

      // Update service if changed
      if (serviceChanged) {
        await api.systemServices.update(systemService.id, {
          name: serviceData.name,
          alias: serviceData.alias,
          servicePath: serviceData.servicePath,
          description: serviceData.description || undefined,
        });
      }

      // Update instance overrides if changed
      if (overrideChanged) {
        await api.instanceServices.update(instanceService.id, {
          servicePathOverride:
            overrideData.useServicePathOverride && overrideData.servicePathOverride
              ? overrideData.servicePathOverride
              : null,
          authConfigId: overrideData.useAuthOverride ? overrideData.authConfigId : null,
        });
      }

      toast.success('Service updated');
      onOpenChange(false);
      onUpdated?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  const environmentLabel = instanceService.instance?.environment
    ? envLabels[instanceService.instance.environment]
    : 'this instance';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>Update service settings and instance overrides</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 min-w-0 flex-1">
          <div className="space-y-2.5 overflow-y-auto min-h-0 flex-1 pr-1">
            {/* Service Settings Section */}
            <div className="grid gap-1">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="My Custom API"
                value={serviceData.name}
                onChange={(e) => setServiceData({ ...serviceData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="alias">Alias *</Label>
              <Input
                id="alias"
                placeholder="my_api"
                value={serviceData.alias}
                onChange={(e) => setServiceData({ ...serviceData, alias: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="servicePath">Service Path *</Label>
              <Input
                id="servicePath"
                placeholder="/sap/opu/odata/sap/MY_API"
                value={serviceData.servicePath}
                onChange={(e) => setServiceData({ ...serviceData, servicePath: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="What does this service do?"
                value={serviceData.description}
                onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
              />
            </div>

            {/* Instance Overrides Section */}
            <div className="border pt-2.5 mt-2.5 px-2.5 py-2.5 bg-muted/30 rounded-lg border-border/40">
              <h3 className="text-sm font-semibold mb-0.5">Instance Overrides</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Override settings for {environmentLabel} only
              </p>

              <div className="space-y-2">
                {/* Service Path Override */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useServicePathOverride"
                      checked={overrideData.useServicePathOverride}
                      onCheckedChange={(checked) =>
                        setOverrideData({ ...overrideData, useServicePathOverride: checked === true })
                      }
                    />
                    <Label htmlFor="useServicePathOverride" className="cursor-pointer">
                      Override Service Path
                    </Label>
                  </div>
                  {overrideData.useServicePathOverride && (
                    <div className="pl-6">
                      <Input
                        id="servicePathOverride"
                        placeholder={serviceData.servicePath}
                        value={overrideData.servicePathOverride}
                        onChange={(e) =>
                          setOverrideData({ ...overrideData, servicePathOverride: e.target.value })
                        }
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Default: {serviceData.servicePath}
                      </p>
                    </div>
                  )}
                </div>

                {/* Auth Override */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useAuthOverride"
                      checked={overrideData.useAuthOverride}
                      onCheckedChange={(checked) =>
                        setOverrideData({ ...overrideData, useAuthOverride: checked === true })
                      }
                    />
                    <Label htmlFor="useAuthOverride" className="cursor-pointer">
                      Override Authentication
                    </Label>
                  </div>
                  {overrideData.useAuthOverride && (
                    <div className="pl-6 border-l-2">
                      <AuthConfigSelector
                        value={overrideData.authConfigId}
                        onChange={(authConfigId) =>
                          setOverrideData({ ...overrideData, authConfigId })
                        }
                        allowNone={true}
                        description="Select an authentication configuration for this instance"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !serviceData.name || !serviceData.alias || !serviceData.servicePath}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
