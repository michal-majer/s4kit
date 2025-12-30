'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiKey } from '@/lib/api';
import { toast } from 'sonner';
import { ShieldOff, AlertTriangle, Loader2 } from 'lucide-react';

interface RevokeKeyDialogProps {
  apiKey: ApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevokeKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onSuccess,
}: RevokeKeyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await api.apiKeys.revoke(apiKey.id, reason || undefined);
      toast.success(`API key "${apiKey.name}" has been revoked`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldOff className="h-5 w-5" />
            Revoke API Key
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The key will be immediately invalidated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">This will break existing integrations</div>
                <div className="mt-1">
                  Any applications or services using this key will immediately lose
                  access to your API.
                </div>
              </div>
            </div>
          </div>

          {/* Key info */}
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground">Key to revoke</div>
            <div className="font-medium">{apiKey.name}</div>
            <code className="text-xs text-muted-foreground">{apiKey.displayKey}</code>
          </div>

          {/* Reason (optional) */}
          <div>
            <Label htmlFor="reason">Reason for revocation (optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Security concern, no longer needed, etc."
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Key'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
