'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, System } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface CreateServiceDialogProps {
  systems: System[];
  trigger?: React.ReactNode;
}

export function CreateServiceDialog({ systems, trigger }: CreateServiceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    systemId: '',
    name: '',
    alias: '',
    servicePath: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.systemId || !formData.name || !formData.alias || !formData.servicePath) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.systemServices.create({
        systemId: formData.systemId,
        name: formData.name,
        alias: formData.alias.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        servicePath: formData.servicePath,
        description: formData.description || undefined,
      });
      toast.success('Service created. Entities will be auto-detected when linked to an instance.');
      setOpen(false);
      setFormData({ systemId: '', name: '', alias: '', servicePath: '', description: '' });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create service');
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Create Service
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Service</DialogTitle>
            <DialogDescription>
              Add a new OData service to a system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="systemId">System *</Label>
              <Select
                value={formData.systemId}
                onValueChange={(value) => setFormData({ ...formData, systemId: value })}
                required
              >
                <SelectTrigger id="systemId">
                  <SelectValue placeholder="Select a system" />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="My Custom API"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="alias">Alias *</Label>
              <Input
                id="alias"
                placeholder="my_api"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used in SDK to reference this service (lowercase, alphanumeric, dashes, underscores)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="servicePath">Service Path *</Label>
              <Input
                id="servicePath"
                placeholder="/sap/opu/odata/sap/MY_API"
                value={formData.servicePath}
                onChange={(e) => setFormData({ ...formData, servicePath: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this service do?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Entities will be automatically detected when this service is linked to an instance.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.systemId || !formData.name || !formData.alias || !formData.servicePath}
            >
              {loading ? 'Creating...' : 'Create Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
