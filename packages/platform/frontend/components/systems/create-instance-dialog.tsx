'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AuthConfigSelector } from '@/components/common/auth-config-selector';
import { api, InstanceEnvironment } from '@/lib/api';
import { toast } from 'sonner';

interface CreateInstanceDialogProps {
  systemId: string;
  existingEnvironments: InstanceEnvironment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (instance: Awaited<ReturnType<typeof api.instances.create>>) => void;
}

const environments: { value: InstanceEnvironment; label: string }[] = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'dev', label: 'Development' },
  { value: 'quality', label: 'Quality' },
  { value: 'preprod', label: 'Pre-Production' },
  { value: 'production', label: 'Production' },
];

export function CreateInstanceDialog({
  systemId,
  existingEnvironments,
  open,
  onOpenChange,
  onCreated,
}: CreateInstanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    environment: '' as InstanceEnvironment | '',
    baseUrl: '',
    authConfigId: null as string | null,
  });

  const availableEnvironments = environments.filter(
    (env) => !existingEnvironments.includes(env.value)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.environment || !formData.baseUrl) return;

    setLoading(true);
    try {
      const newInstance = await api.instances.create({
        systemId,
        environment: formData.environment as InstanceEnvironment,
        baseUrl: formData.baseUrl,
        authConfigId: formData.authConfigId,
      });
      toast.success('Instance created. Services are being verified...');
      onOpenChange(false);
      onCreated?.(newInstance);
    } catch {
      toast.error('Failed to create instance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Instance</DialogTitle>
            <DialogDescription>
              Configure connection details for an environment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="environment">
                Environment <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.environment}
                onValueChange={(value) =>
                  setFormData({ ...formData, environment: value as InstanceEnvironment })
                }
                required
              >
                <SelectTrigger className={!formData.environment ? 'border-muted-foreground/50' : ''}>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {availableEnvironments.map((env) => (
                    <SelectItem key={env.value} value={env.value}>
                      {env.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the environment type for this instance (e.g., Development, Production)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="baseUrl">
                Base URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="baseUrl"
                placeholder="https://my-system.s4hana.ondemand.com"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                The base URL of your SAP system API endpoint
              </p>
            </div>

            <AuthConfigSelector
              value={formData.authConfigId}
              onChange={(authConfigId) => setFormData({ ...formData, authConfigId })}
              description="Select or create an authentication configuration for this instance"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.environment || !formData.baseUrl}>
              {loading ? 'Creating...' : 'Create Instance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
