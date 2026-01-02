'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AuthConfigSelector } from '@/components/common/auth-config-selector';
import { api, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface EditServiceDialogProps {
  service: SystemService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServiceDialog({ service, open, onOpenChange }: EditServiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: service.name,
    alias: service.alias,
    servicePath: service.servicePath,
    description: service.description || '',
    entities: service.entities?.join(', ') || '',
    authConfigId: service.authConfigId || null,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: service.name,
        alias: service.alias,
        servicePath: service.servicePath,
        description: service.description || '',
        entities: service.entities?.join(', ') || '',
        authConfigId: service.authConfigId || null,
      });
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.alias.trim()) {
      toast.error('Alias is required');
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9-_]+$/i.test(formData.alias)) {
      toast.error('Alias can only contain letters, numbers, dashes and underscores');
      setLoading(false);
      return;
    }

    if (!formData.servicePath.trim()) {
      toast.error('Service path is required');
      setLoading(false);
      return;
    }

    try {
      await api.systemServices.update(service.id, {
        name: formData.name,
        alias: formData.alias,
        servicePath: formData.servicePath,
        description: formData.description || undefined,
        entities: formData.entities
          ? formData.entities.split(',').map((e) => e.trim()).filter(Boolean)
          : [],
        authConfigId: formData.authConfigId,
      });
      toast.success('Service updated');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>Update service settings and authentication</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="alias">Alias (for SDK) *</Label>
            <Input
              id="alias"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used in SDK: <code>client.sap.{'<alias>'}.list()</code>
            </p>
          </div>
          <div>
            <Label htmlFor="servicePath">Service Path *</Label>
            <Input
              id="servicePath"
              value={formData.servicePath}
              onChange={(e) => setFormData({ ...formData, servicePath: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">OData service endpoint path</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="entities">Entities (comma-separated)</Label>
            <Input
              id="entities"
              value={formData.entities}
              onChange={(e) => setFormData({ ...formData, entities: e.target.value })}
              placeholder="Entity1, Entity2, Entity3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              List of OData entity names this service exposes
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Service Authentication</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Configure dedicated authentication for this service. Select &quot;No Authentication&quot; to inherit from the instance.
            </p>

            <AuthConfigSelector
              value={formData.authConfigId}
              onChange={(authConfigId) => setFormData({ ...formData, authConfigId })}
              allowNone={true}
              description="Leave empty to inherit authentication from the instance"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
