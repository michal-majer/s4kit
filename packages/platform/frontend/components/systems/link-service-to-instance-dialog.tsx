'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { api, Instance, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface LinkServiceToInstanceDialogProps {
  instance: Instance;
  availableServices: SystemService[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked?: () => void;
}

export function LinkServiceToInstanceDialog({
  instance,
  availableServices,
  open,
  onOpenChange,
  onLinked,
}: LinkServiceToInstanceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [syncEntities, setSyncEntities] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) return;

    setLoading(true);
    try {
      const result = await api.instanceServices.create({
        instanceId: instance.id,
        systemServiceId: selectedServiceId,
      });

      // If syncEntities is enabled, refresh entities immediately
      if (syncEntities) {
        try {
          await api.instanceServices.refreshEntities(result.id);
          toast.success('Service linked and entities synced');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.warning('Service linked, but failed to sync entities: ' + errorMessage);
        }
      } else {
        toast.success('Service linked');
      }

      onOpenChange(false);
      setSelectedServiceId('');
      setSyncEntities(true);
      if (onLinked) onLinked();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link service';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link Service to Instance</DialogTitle>
            <DialogDescription>
              Link a service to {instance.environment} instance
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="service">Service</Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} ({service.alias})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="syncEntities"
                checked={syncEntities}
                onCheckedChange={(checked) => setSyncEntities(checked === true)}
              />
              <Label
                htmlFor="syncEntities"
                className="text-sm font-normal cursor-pointer"
              >
                Sync entities from instance immediately
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedServiceId}>
              {loading ? 'Linking...' : 'Link Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
