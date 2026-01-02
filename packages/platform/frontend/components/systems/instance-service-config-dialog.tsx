'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthConfigSelector } from '@/components/common/auth-config-selector';
import { api, InstanceService, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface InstanceServiceConfigDialogProps {
  instanceService: InstanceService;
  systemService: SystemService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstanceServiceConfigDialog({
  instanceService,
  systemService,
  open,
  onOpenChange,
}: InstanceServiceConfigDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    servicePathOverride: instanceService.servicePathOverride || '',
    useServicePathOverride: !!instanceService.servicePathOverride,
    useAuthOverride: instanceService.hasAuthOverride || false,
    authConfigId: instanceService.authConfigId || null,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        servicePathOverride: instanceService.servicePathOverride || '',
        useServicePathOverride: !!instanceService.servicePathOverride,
        useAuthOverride: instanceService.hasAuthOverride || false,
        authConfigId: instanceService.authConfigId || null,
      });
    }
  }, [instanceService, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.instanceServices.update(instanceService.id, {
        servicePathOverride: formData.useServicePathOverride && formData.servicePathOverride
          ? formData.servicePathOverride
          : null,
        authConfigId: formData.useAuthOverride ? formData.authConfigId : null,
      });
      toast.success('Instance service configuration updated');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update configuration';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure Instance Service</DialogTitle>
          <DialogDescription>
            Configure {systemService.name} for {instanceService.instance?.environment || 'this instance'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Path Override */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useServicePathOverride"
                checked={formData.useServicePathOverride}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, useServicePathOverride: checked === true })
                }
              />
              <Label htmlFor="useServicePathOverride" className="cursor-pointer">
                Override Service Path
              </Label>
            </div>
            {formData.useServicePathOverride && (
              <div>
                <Label htmlFor="servicePathOverride">Service Path</Label>
                <Input
                  id="servicePathOverride"
                  placeholder={systemService.servicePath}
                  value={formData.servicePathOverride}
                  onChange={(e) =>
                    setFormData({ ...formData, servicePathOverride: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default: {systemService.servicePath}
                </p>
              </div>
            )}
          </div>

          {/* Auth Override */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useAuthOverride"
                checked={formData.useAuthOverride}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, useAuthOverride: checked === true })
                }
              />
              <Label htmlFor="useAuthOverride" className="cursor-pointer">
                Override Authentication
              </Label>
            </div>
            {formData.useAuthOverride && (
              <div className="pl-6 border-l-2">
                <AuthConfigSelector
                  value={formData.authConfigId}
                  onChange={(authConfigId) => setFormData({ ...formData, authConfigId })}
                  allowNone={true}
                  description="Select an authentication configuration for this instance service"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
