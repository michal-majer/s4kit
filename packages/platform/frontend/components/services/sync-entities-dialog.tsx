'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api, Connection } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface SyncEntitiesDialogProps {
  serviceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncEntitiesDialog({ serviceId, open, onOpenChange }: SyncEntitiesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [merge, setMerge] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      api.connections.list().then(setConnections).catch(() => {
        toast.error('Failed to load connections');
      });
    }
  }, [open]);

  const handleSync = async () => {
    if (!selectedConnectionId) {
      toast.error('Please select a connection');
      return;
    }

    setLoading(true);
    try {
      const result = await api.services.syncEntities(serviceId, selectedConnectionId, merge);
      toast.success(`Synced ${result.discovered} entities (${result.added} new)`);
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync entities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Entities from Metadata</DialogTitle>
          <DialogDescription>
            Fetch available entities from the OData service $metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="connection">Connection *</Label>
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select connection to use..." />
              </SelectTrigger>
              <SelectContent>
                {connections.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No connections available</div>
                ) : (
                  connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.environment})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Connection used to fetch $metadata from the SAP system
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="merge">Merge with existing</Label>
              <p className="text-xs text-muted-foreground">Keep existing entities and add new ones</p>
            </div>
            <Switch id="merge" checked={merge} onCheckedChange={setMerge} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={loading || !selectedConnectionId}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Entities
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
