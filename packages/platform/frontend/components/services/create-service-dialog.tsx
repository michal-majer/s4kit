'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';

export function CreateServiceDialog() {
  const [open, setOpen] = useState(false);
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
      await api.services.create({
        name,
        alias,
        servicePath,
        description: description || undefined,
        organizationId: TEST_ORG_ID,
      });
      toast.success('Service created');
      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Service</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Service</DialogTitle>
          <DialogDescription>Define an OData service to use with your connections</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name *</Label>
            <Input id="name" name="name" placeholder="Business Partner API" required />
          </div>
          <div>
            <Label htmlFor="alias">Alias (for SDK) *</Label>
            <Input id="alias" name="alias" placeholder="business-partner" required />
            <p className="text-xs text-muted-foreground mt-1">
              Used in SDK: <code>client.sap.{'<alias>'}.list()</code>
            </p>
          </div>
          <div>
            <Label htmlFor="servicePath">Service Path *</Label>
            <Input id="servicePath" name="servicePath" placeholder="/sap/opu/odata/sap/API_BUSINESS_PARTNER" required />
            <p className="text-xs text-muted-foreground mt-1">OData service endpoint path</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Optional description" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
