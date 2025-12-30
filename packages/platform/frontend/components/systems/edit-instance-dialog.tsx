'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { api, Instance } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { ImportBindingDialog } from './import-binding-dialog';

interface EditInstanceDialogProps {
  instance: Instance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updatedInstance: Instance) => void;
}

export function EditInstanceDialog({ instance, open, onOpenChange, onUpdated }: EditInstanceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    baseUrl: instance.baseUrl,
    authType: instance.authType,
    username: '',
    password: '',
    oauth2ClientId: instance.authConfig?.clientId || '',
    oauth2ClientSecret: '',
    oauth2TokenUrl: instance.authConfig?.tokenUrl || '',
    oauth2Scope: instance.authConfig?.scope || '',
    customHeaderName: instance.authConfig?.headerName || '',
    customHeaderValue: '',
  });

  // Reset form data when dialog opens or instance changes
  useEffect(() => {
    if (open) {
      setFormData({
        baseUrl: instance.baseUrl,
        authType: instance.authType,
        username: '',
        password: '',
        oauth2ClientId: instance.authConfig?.clientId || '',
        oauth2ClientSecret: '',
        oauth2TokenUrl: instance.authConfig?.tokenUrl || '',
        oauth2Scope: instance.authConfig?.scope || '',
        customHeaderName: instance.authConfig?.headerName || '',
        customHeaderValue: '',
      });
    }
  }, [open, instance.id, instance.baseUrl, instance.authType, instance.authConfig]);

  const handleImportSuccess = (config: {
    tokenUrl: string;
    clientId: string;
    scope?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      authType: 'oauth2',
      oauth2TokenUrl: config.tokenUrl,
      oauth2ClientId: config.clientId,
      oauth2Scope: config.scope || '',
      oauth2ClientSecret: '', // Already saved via import
    }));
    setImportDialogOpen(false);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.baseUrl) return;

    setLoading(true);
    try {
      const updatedInstance = await api.instances.update(instance.id, {
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        username: formData.authType === 'basic' && formData.username ? formData.username : undefined,
        password: formData.authType === 'basic' && formData.password ? formData.password : undefined,
        oauth2ClientId: formData.authType === 'oauth2' ? formData.oauth2ClientId : undefined,
        oauth2ClientSecret: formData.authType === 'oauth2' && formData.oauth2ClientSecret ? formData.oauth2ClientSecret : undefined,
        oauth2TokenUrl: formData.authType === 'oauth2' ? formData.oauth2TokenUrl : undefined,
        oauth2Scope: formData.authType === 'oauth2' ? formData.oauth2Scope : undefined,
        customHeaderName: formData.authType === 'custom' ? formData.customHeaderName : undefined,
        customHeaderValue: formData.authType === 'custom' && formData.customHeaderValue ? formData.customHeaderValue : undefined,
      });
      toast.success('Instance updated');
      onOpenChange(false);
      onUpdated?.(updatedInstance);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update instance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Instance</DialogTitle>
            <DialogDescription>
              Update connection details. Leave password fields empty to keep existing credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                The base URL of your SAP system API endpoint
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authType">Authentication</Label>
              <Select
                value={formData.authType}
                onValueChange={(value) => setFormData({ ...formData, authType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.authType === 'basic' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    name="edit-username"
                    autoComplete="off"
                    placeholder="Leave empty to keep existing"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    SAP technical user or communication user
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">Password</Label>
                  <Input
                    id="edit-password"
                    name="edit-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave empty to keep existing"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password for the technical user
                  </p>
                </div>
              </>
            )}

            {formData.authType === 'oauth2' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Service Binding
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or configure manually</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-oauth2TokenUrl">Token URL</Label>
                  <Input
                    id="edit-oauth2TokenUrl"
                    name="edit-oauth2TokenUrl"
                    autoComplete="off"
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-oauth2ClientId">Client ID</Label>
                  <Input
                    id="edit-oauth2ClientId"
                    name="edit-oauth2ClientId"
                    autoComplete="off"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-oauth2ClientSecret">Client Secret</Label>
                  <Input
                    id="edit-oauth2ClientSecret"
                    name="edit-oauth2ClientSecret"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave empty to keep existing"
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-oauth2Scope">Scope (optional)</Label>
                  <Input
                    id="edit-oauth2Scope"
                    name="edit-oauth2Scope"
                    autoComplete="off"
                    value={formData.oauth2Scope}
                    onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'custom' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-customHeaderName">Header Name</Label>
                  <Input
                    id="edit-customHeaderName"
                    name="edit-customHeaderName"
                    autoComplete="off"
                    placeholder="APIKey"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The HTTP header name used for authentication (e.g., APIKey, Authorization)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-customHeaderValue">Header Value</Label>
                  <Input
                    id="edit-customHeaderValue"
                    name="edit-customHeaderValue"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave empty to keep existing"
                    value={formData.customHeaderValue}
                    onChange={(e) => setFormData({ ...formData, customHeaderValue: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The value sent with the header (e.g., your API key or &quot;Bearer token&quot;)
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.baseUrl}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ImportBindingDialog
        instanceId={instance.id}
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={handleImportSuccess}
      />
    </Dialog>
  );
}
