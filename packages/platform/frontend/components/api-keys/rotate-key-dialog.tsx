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
import { KeyDisplay } from './key-display';
import { RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

interface RotateKeyDialogProps {
  apiKey: ApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RotateKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onSuccess,
}: RotateKeyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const handleRotate = async () => {
    setLoading(true);
    try {
      const result = await api.apiKeys.rotate(apiKey.id, {
        newName: newKeyName || undefined,
        revokeReason: revokeReason || undefined,
      });
      setNewKey(result.newKey.secretKey);
      toast.success(`API key rotated: ${result.newKey.displayKey}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to rotate API key');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (newKey) {
      onSuccess();
    }
    setNewKey(null);
    setNewKeyName('');
    setRevokeReason('');
    onOpenChange(false);
  };

  // Show the new key after rotation
  if (newKey) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Key Rotated Successfully</DialogTitle>
            <DialogDescription>
              Your old key has been revoked. Here is your new key.
            </DialogDescription>
          </DialogHeader>
          <KeyDisplay secretKey={newKey} onClose={handleClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Rotate API Key
          </DialogTitle>
          <DialogDescription>
            This will create a new key with the same permissions and revoke the
            current one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Warning</div>
                <div className="mt-1">
                  The current key (<code className="font-mono text-xs">{apiKey.displayKey}</code>) will be immediately
                  revoked. Any systems using this key will lose access.
                </div>
              </div>
            </div>
          </div>

          {/* Current key info */}
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground">Current key</div>
            <div className="font-medium">{apiKey.name}</div>
            <code className="text-xs text-muted-foreground">{apiKey.displayKey}</code>
          </div>

          {/* New name (optional) */}
          <div>
            <Label htmlFor="newName">New key name (optional)</Label>
            <Input
              id="newName"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={`${apiKey.name} (Rotated)`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to use "{apiKey.name} (Rotated)"
            </p>
          </div>

          {/* Revoke reason (optional) */}
          <div>
            <Label htmlFor="revokeReason">Revocation reason (optional)</Label>
            <Input
              id="revokeReason"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Scheduled rotation"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRotate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rotating...
              </>
            ) : (
              'Rotate Key'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
