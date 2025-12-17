'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, Service } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface EditServiceDialogProps {
  service: Service;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServiceDialog({ service, open, onOpenChange }: EditServiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const name = formData.get('name') as string;
    const alias = formData.get('alias') as string;
    const servicePath = formData.get('servicePath') as string;
    const description = formData.get('description') as string;

    // Validation
    if (!name.trim()) {
      toast.error('Name is required');
      setLoading(false);
      return;
    }

    if (!alias.trim()) {
      toast.error('Alias is required');
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9-_]+$/i.test(alias)) {
      toast.error('Alias can only contain letters, numbers, dashes and underscores');
      setLoading(false);
      return;
    }

    if (!servicePath.trim()) {
      toast.error('Service path is required');
      setLoading(false);
      return;
    }

    try {
      await api.services.update(service.id, {
        name,
        alias,
        servicePath,
        description: description || undefined,
      });
      toast.success('Service updated');
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>Update service settings</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name *</Label>
            <Input id="name" name="name" defaultValue={service.name} required />
          </div>
          <div>
            <Label htmlFor="alias">Alias (for SDK) *</Label>
            <Input id="alias" name="alias" defaultValue={service.alias} required />
            <p className="text-xs text-muted-foreground mt-1">
              Used in SDK: <code>client.sap.{'<alias>'}.list()</code>
            </p>
          </div>
          <div>
            <Label htmlFor="servicePath">Service Path *</Label>
            <Input id="servicePath" name="servicePath" defaultValue={service.servicePath} required />
            <p className="text-xs text-muted-foreground mt-1">OData service endpoint path</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={service.description || ''} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
