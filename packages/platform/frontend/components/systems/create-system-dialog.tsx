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
import { api, SystemType } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const systemTypes: { value: SystemType; label: string; description: string }[] = [
  { value: 's4_public', label: 'SAP S/4HANA Cloud Public Edition', description: 'Multi-tenant cloud with predefined services' },
  { value: 's4_private', label: 'SAP S/4HANA Cloud Private Edition', description: 'Single-tenant cloud with predefined services' },
  { value: 's4_onprem', label: 'SAP S/4HANA On-Premise', description: 'On-premise deployment with predefined services' },
  { value: 'btp', label: 'SAP BTP', description: 'Business Technology Platform - custom services' },
  { value: 'other', label: 'Other', description: 'Generic OData endpoint' },
];

export function CreateSystemDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '' as SystemType | '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) return;

    setLoading(true);
    try {
      const newSystem = await api.systems.create({
        name: formData.name,
        type: formData.type as SystemType,
        description: formData.description || undefined,
      });
      toast.success('System created successfully');
      if (formData.type === 's4_public' || formData.type === 's4_private' || formData.type === 's4_onprem') {
        toast.info('Predefined services have been added to your system');
      }
      setOpen(false);
      setFormData({ name: '', type: '', description: '' });
      router.push(`/systems/${newSystem.id}`);
    } catch (error) {
      toast.error('Failed to create system');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = systemTypes.find(t => t.value === formData.type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add System
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New System</DialogTitle>
            <DialogDescription>
              Add a new SAP system to manage connections and services.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My SAP System"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, 100) })}
                required
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/100 characters
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">System Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as SystemType })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system type" />
                </SelectTrigger>
                <SelectContent>
                  {systemTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-sm text-muted-foreground">
                  {selectedType.description}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe this system..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.type}>
              {loading ? 'Creating...' : 'Create System'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
