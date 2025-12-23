'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Upload, CheckCircle2 } from 'lucide-react';

interface ImportBindingDialogProps {
  instanceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (config: {
    tokenUrl: string;
    clientId: string;
    scope?: string;
    identityZone?: string;
    bindingType: string;
  }) => void;
}

export function ImportBindingDialog({
  instanceId,
  open,
  onOpenChange,
  onImported,
}: ImportBindingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
  const [preferredService, setPreferredService] = useState<'xsuaa' | 'destination' | ''>('');
  const [importedConfig, setImportedConfig] = useState<{
    tokenUrl: string;
    clientId: string;
    scope?: string;
    identityZone?: string;
    bindingType: string;
  } | null>(null);

  const handleImport = async () => {
    if (!bindingJson.trim()) {
      toast.error('Please paste the service binding JSON');
      return;
    }

    setLoading(true);
    try {
      const result = await api.instances.importBinding(instanceId, {
        bindingJson: bindingJson.trim(),
        preferredService: preferredService || undefined,
      });

      setImportedConfig(result.config);
      toast.success('Service binding imported successfully');
      onImported?.(result.config);
    } catch (error: any) {
      const message = error.message || 'Failed to import service binding';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBindingJson('');
    setPreferredService('');
    setImportedConfig(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Service Binding
          </DialogTitle>
          <DialogDescription>
            Paste your VCAP_SERVICES or BTP service binding JSON to automatically configure OAuth2 authentication.
          </DialogDescription>
        </DialogHeader>

        {importedConfig ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Successfully imported!</span>
            </div>
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="text-muted-foreground">Token URL:</span>
                <span className="font-mono text-xs break-all">{importedConfig.tokenUrl}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="text-muted-foreground">Client ID:</span>
                <span className="font-mono text-xs">{importedConfig.clientId}</span>
              </div>
              {importedConfig.scope && (
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <span className="text-muted-foreground">Scope:</span>
                  <span className="font-mono text-xs">{importedConfig.scope}</span>
                </div>
              )}
              {importedConfig.identityZone && (
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <span className="text-muted-foreground">Identity Zone:</span>
                  <span className="font-mono text-xs">{importedConfig.identityZone}</span>
                </div>
              )}
              <div className="grid grid-cols-[120px_1fr] gap-1">
                <span className="text-muted-foreground">Binding Type:</span>
                <span className="font-mono text-xs uppercase">{importedConfig.bindingType}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              The instance authentication has been updated to OAuth2 with the imported credentials.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bindingJson">Service Binding JSON</Label>
              <Textarea
                id="bindingJson"
                placeholder={`Paste your service binding JSON here...

Example formats:
- VCAP_SERVICES (from Cloud Foundry)
- Service Key JSON (from BTP Cockpit)
- Service Binding JSON (from Kubernetes/Kyma)`}
                value={bindingJson}
                onChange={(e) => setBindingJson(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Supports VCAP_SERVICES format and direct service binding JSON from SAP BTP.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredService">Service Type (optional)</Label>
              <Select
                value={preferredService}
                onValueChange={(value) => setPreferredService(value as 'xsuaa' | 'destination' | '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-detect</SelectItem>
                  <SelectItem value="xsuaa">XSUAA (Authorization)</SelectItem>
                  <SelectItem value="destination">Destination Service</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If your JSON contains multiple services, specify which one to use.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {importedConfig ? 'Close' : 'Cancel'}
          </Button>
          {!importedConfig && (
            <Button onClick={handleImport} disabled={loading || !bindingJson.trim()}>
              {loading ? 'Importing...' : 'Import Binding'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
