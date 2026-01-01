'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface EditServiceDialogProps {
  service: SystemService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditServiceDialog({ service, open, onOpenChange }: EditServiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: service.name,
    alias: service.alias,
    servicePath: service.servicePath,
    description: service.description || '',
    entities: service.entities?.join(', ') || '',
    authType: service.authType || 'inherit',
    username: '',
    password: '',
    apiKey: '',
    apiKeyHeaderName: service.authConfig?.headerName || 'X-API-Key',
    oauth2ClientId: service.authConfig?.clientId || '',
    oauth2ClientSecret: '',
    oauth2TokenUrl: service.authConfig?.tokenUrl || '',
    oauth2Scope: service.authConfig?.scope || '',
    oauth2AuthorizationUrl: service.authConfig?.authorizationUrl || '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: service.name,
        alias: service.alias,
        servicePath: service.servicePath,
        description: service.description || '',
        entities: service.entities?.join(', ') || '',
        authType: service.authType || 'inherit',
        username: '',
        password: '',
        apiKey: '',
        apiKeyHeaderName: service.authConfig?.headerName || 'X-API-Key',
        oauth2ClientId: service.authConfig?.clientId || '',
        oauth2ClientSecret: '',
        oauth2TokenUrl: service.authConfig?.tokenUrl || '',
        oauth2Scope: service.authConfig?.scope || '',
        oauth2AuthorizationUrl: service.authConfig?.authorizationUrl || '',
      });
    }
  }, [service, open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.alias.trim()) {
      toast.error('Alias is required');
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9-_]+$/i.test(formData.alias)) {
      toast.error('Alias can only contain letters, numbers, dashes and underscores');
      setLoading(false);
      return;
    }

    if (!formData.servicePath.trim()) {
      toast.error('Service path is required');
      setLoading(false);
      return;
    }

    try {
      const updateData: {
        name: string;
        alias: string;
        servicePath: string;
        description?: string;
        entities: string[];
        authType?: 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom' | null;
        username?: string;
        password?: string;
        apiKey?: string;
        apiKeyHeaderName?: string;
        oauth2ClientId?: string;
        oauth2ClientSecret?: string;
        oauth2TokenUrl?: string;
        oauth2Scope?: string;
        oauth2AuthorizationUrl?: string;
      } = {
        name: formData.name,
        alias: formData.alias,
        servicePath: formData.servicePath,
        description: formData.description || undefined,
        entities: formData.entities
          ? formData.entities.split(',').map((e) => e.trim()).filter(Boolean)
          : [],
      };

      // Handle auth settings
      if (formData.authType === 'inherit') {
        updateData.authType = null;
      } else {
        updateData.authType = formData.authType as 'none' | 'basic' | 'oauth2' | 'api_key' | 'custom';
        
        if (formData.authType === 'basic') {
          if (formData.username) updateData.username = formData.username;
          if (formData.password) updateData.password = formData.password;
        } else if (formData.authType === 'api_key') {
          if (formData.apiKey) updateData.apiKey = formData.apiKey;
          updateData.apiKeyHeaderName = formData.apiKeyHeaderName;
        } else if (formData.authType === 'oauth2') {
          updateData.oauth2ClientId = formData.oauth2ClientId;
          if (formData.oauth2ClientSecret) updateData.oauth2ClientSecret = formData.oauth2ClientSecret;
          updateData.oauth2TokenUrl = formData.oauth2TokenUrl;
          updateData.oauth2Scope = formData.oauth2Scope;
          updateData.oauth2AuthorizationUrl = formData.oauth2AuthorizationUrl;
        }
      }

      await api.systemServices.update(service.id, updateData);
      toast.success('Service updated');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>Update service settings and authentication</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="alias">Alias (for SDK) *</Label>
            <Input
              id="alias"
              value={formData.alias}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used in SDK: <code>client.sap.{'<alias>'}.list()</code>
            </p>
          </div>
          <div>
            <Label htmlFor="servicePath">Service Path *</Label>
            <Input
              id="servicePath"
              value={formData.servicePath}
              onChange={(e) => setFormData({ ...formData, servicePath: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">OData service endpoint path</p>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="entities">Entities (comma-separated)</Label>
            <Input
              id="entities"
              value={formData.entities}
              onChange={(e) => setFormData({ ...formData, entities: e.target.value })}
              placeholder="Entity1, Entity2, Entity3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              List of OData entity names this service exposes
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Service Authentication</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Configure dedicated authentication for this service. Leave as &quot;Inherit from instance&quot; to use the instance&apos;s authentication settings.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="authType">Authentication Type</Label>
                <Select
                  value={formData.authType}
                  onValueChange={(value) => setFormData({ ...formData, authType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit from instance</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.authType === 'basic' && (
                <>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Leave empty to keep existing"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
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

              {formData.authType === 'api_key' && (
                <>
                  <div>
                    <Label htmlFor="apiKeyHeaderName">Header Name</Label>
                    <Input
                      id="apiKeyHeaderName"
                      value={formData.apiKeyHeaderName}
                      onChange={(e) => setFormData({ ...formData, apiKeyHeaderName: e.target.value })}
                      placeholder="X-API-Key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Leave empty to keep existing"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    />
                  </div>
                </>
              )}

              {formData.authType === 'oauth2' && (
                <>
                  <div>
                    <Label htmlFor="oauth2TokenUrl">Token URL</Label>
                    <Input
                      id="oauth2TokenUrl"
                      value={formData.oauth2TokenUrl}
                      onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oauth2ClientId">Client ID</Label>
                    <Input
                      id="oauth2ClientId"
                      value={formData.oauth2ClientId}
                      onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oauth2ClientSecret">Client Secret</Label>
                    <Input
                      id="oauth2ClientSecret"
                      type="password"
                      placeholder="Leave empty to keep existing"
                      value={formData.oauth2ClientSecret}
                      onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oauth2Scope">Scope</Label>
                    <Input
                      id="oauth2Scope"
                      value={formData.oauth2Scope}
                      onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="oauth2AuthorizationUrl">Authorization URL</Label>
                    <Input
                      id="oauth2AuthorizationUrl"
                      value={formData.oauth2AuthorizationUrl}
                      onChange={(e) => setFormData({ ...formData, oauth2AuthorizationUrl: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
