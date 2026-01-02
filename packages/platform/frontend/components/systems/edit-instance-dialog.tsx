'use client';

import { useState, useEffect } from 'react';
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
import { AuthConfigSelector } from '@/components/common/auth-config-selector';
import { api, Instance } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface EditInstanceDialogProps {
  instance: Instance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updatedInstance: Instance) => void;
}

export function EditInstanceDialog({ instance, open, onOpenChange, onUpdated }: EditInstanceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    baseUrl: instance.baseUrl,
    authConfigId: instance.authConfigId || null,
  });

  // Reset form data when dialog opens or instance changes
  useEffect(() => {
    if (open) {
      setFormData({
        baseUrl: instance.baseUrl,
        authConfigId: instance.authConfigId || null,
      });
    }
  }, [open, instance.id, instance.baseUrl, instance.authConfigId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.baseUrl) return;

    setLoading(true);
    try {
      const updatedInstance = await api.instances.update(instance.id, {
        baseUrl: formData.baseUrl,
        authConfigId: formData.authConfigId,
      });
      toast.success('Instance updated');
      onOpenChange(false);
      onUpdated?.(updatedInstance);
      router.refresh();
    } catch {
      toast.error('Failed to update instance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Instance</DialogTitle>
            <DialogDescription>
              Update connection details for this instance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
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
              description="Select an authentication configuration for this instance"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.baseUrl}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
