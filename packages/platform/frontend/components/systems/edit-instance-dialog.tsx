'use client';

import { useState } from 'react';
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

interface EditInstanceDialogProps {
  instance: Instance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInstanceDialog({ instance, open, onOpenChange }: EditInstanceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.baseUrl) return;

    setLoading(true);
    try {
      await api.instances.update(instance.id, {
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
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Leave empty to keep existing"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave empty to keep existing"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'oauth2' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="oauth2TokenUrl">Token URL</Label>
                  <Input
                    id="oauth2TokenUrl"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="oauth2ClientId">Client ID</Label>
                  <Input
                    id="oauth2ClientId"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="oauth2ClientSecret">Client Secret</Label>
                  <Input
                    id="oauth2ClientSecret"
                    type="password"
                    placeholder="Leave empty to keep existing"
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="oauth2Scope">Scope</Label>
                  <Input
                    id="oauth2Scope"
                    value={formData.oauth2Scope}
                    onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'custom' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="customHeaderName">Header Name</Label>
                  <Input
                    id="customHeaderName"
                    placeholder="Authorization"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customHeaderValue">Header Value</Label>
                  <Input
                    id="customHeaderValue"
                    placeholder="Leave empty to keep existing"
                    value={formData.customHeaderValue}
                    onChange={(e) => setFormData({ ...formData, customHeaderValue: e.target.value })}
                  />
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
    </Dialog>
  );
}
