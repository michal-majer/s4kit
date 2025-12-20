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
import { api, InstanceEnvironment } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface CreateInstanceDialogProps {
  systemId: string;
  existingEnvironments: InstanceEnvironment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (instance: Awaited<ReturnType<typeof api.instances.create>>) => void;
}

const environments: { value: InstanceEnvironment; label: string }[] = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'dev', label: 'Development' },
  { value: 'quality', label: 'Quality' },
  { value: 'preprod', label: 'Pre-Production' },
  { value: 'production', label: 'Production' },
];

export function CreateInstanceDialog({
  systemId,
  existingEnvironments,
  open,
  onOpenChange,
  onCreated,
}: CreateInstanceDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    environment: '' as InstanceEnvironment | '',
    baseUrl: '',
    authType: 'basic' as string,
    username: '',
    password: '',
    oauth2ClientId: '',
    oauth2ClientSecret: '',
    oauth2TokenUrl: '',
    oauth2Scope: '',
    customHeaderName: '',
    customHeaderValue: '',
  });

  const availableEnvironments = environments.filter(
    (env) => !existingEnvironments.includes(env.value)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.environment || !formData.baseUrl) return;

    setLoading(true);
    try {
      const newInstance = await api.instances.create({
        systemId,
        environment: formData.environment as InstanceEnvironment,
        baseUrl: formData.baseUrl,
        authType: formData.authType,
        username: formData.authType === 'basic' ? formData.username : undefined,
        password: formData.authType === 'basic' ? formData.password : undefined,
        oauth2ClientId: formData.authType === 'oauth2' ? formData.oauth2ClientId : undefined,
        oauth2ClientSecret: formData.authType === 'oauth2' ? formData.oauth2ClientSecret : undefined,
        oauth2TokenUrl: formData.authType === 'oauth2' ? formData.oauth2TokenUrl : undefined,
        oauth2Scope: formData.authType === 'oauth2' ? formData.oauth2Scope : undefined,
        customHeaderName: formData.authType === 'custom' ? formData.customHeaderName : undefined,
        customHeaderValue: formData.authType === 'custom' ? formData.customHeaderValue : undefined,
      });
      toast.success('Instance created. Services are being verified...');
      onOpenChange(false);
      onCreated?.(newInstance);
    } catch (error) {
      toast.error('Failed to create instance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Instance</DialogTitle>
            <DialogDescription>
              Configure connection details for an environment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value) =>
                  setFormData({ ...formData, environment: value as InstanceEnvironment })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {availableEnvironments.map((env) => (
                    <SelectItem key={env.value} value={env.value}>
                      {env.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://my-system.s4hana.ondemand.com"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authType">Authentication</Label>
              <Select
                value={formData.authType}
                onValueChange={(value) => setFormData({ ...formData, authType: value })}
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
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
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
                    placeholder="https://auth.example.com/oauth/token"
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
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="oauth2Scope">Scope (optional)</Label>
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
                    placeholder="Bearer your-token-here"
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
            <Button type="submit" disabled={loading || !formData.environment || !formData.baseUrl}>
              {loading ? 'Creating...' : 'Create Instance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
