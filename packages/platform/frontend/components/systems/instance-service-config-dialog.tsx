'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { api, InstanceService, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface InstanceServiceConfigDialogProps {
  instanceService: InstanceService;
  systemService: SystemService;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstanceServiceConfigDialog({
  instanceService,
  systemService,
  open,
  onOpenChange,
}: InstanceServiceConfigDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refreshingEntities, setRefreshingEntities] = useState(false);
  const [formData, setFormData] = useState({
    servicePathOverride: instanceService.servicePathOverride || '',
    useServicePathOverride: !!instanceService.servicePathOverride,
    useAuthOverride: instanceService.hasAuthOverride || false,
    authType: instanceService.authType || 'inherit',
    username: '',
    password: '',
    apiKey: '',
    apiKeyHeaderName: instanceService.authConfig?.headerName || 'X-API-Key',
    oauth2ClientId: instanceService.authConfig?.clientId || '',
    oauth2ClientSecret: '',
    oauth2TokenUrl: instanceService.authConfig?.tokenUrl || '',
    oauth2Scope: instanceService.authConfig?.scope || '',
    useEntityOverride: instanceService.hasEntityOverride || false,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        servicePathOverride: instanceService.servicePathOverride || '',
        useServicePathOverride: !!instanceService.servicePathOverride,
        useAuthOverride: instanceService.hasAuthOverride || false,
        authType: instanceService.authType || 'inherit',
        username: '',
        password: '',
        apiKey: '',
        apiKeyHeaderName: instanceService.authConfig?.headerName || 'X-API-Key',
        oauth2ClientId: instanceService.authConfig?.clientId || '',
        oauth2ClientSecret: '',
        oauth2TokenUrl: instanceService.authConfig?.tokenUrl || '',
        oauth2Scope: instanceService.authConfig?.scope || '',
        useEntityOverride: instanceService.hasEntityOverride || false,
      });
    }
  }, [instanceService, open]);

  const handleRefreshEntities = async () => {
    setRefreshingEntities(true);
    try {
      const result = await api.instanceServices.refreshEntities(instanceService.id);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      router.refresh();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh entities');
    } finally {
      setRefreshingEntities(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData: any = {};

      // Service path override
      if (formData.useServicePathOverride && formData.servicePathOverride) {
        updateData.servicePathOverride = formData.servicePathOverride;
      } else {
        updateData.servicePathOverride = null;
      }

      // Auth override
      if (formData.useAuthOverride && formData.authType !== 'inherit') {
        updateData.authType = formData.authType;
        
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
        }
      } else {
        updateData.authType = null;
      }

      // Entity override - handled separately via refresh endpoint
      // Users can refresh entities which will set the override

      await api.instanceServices.update(instanceService.id, updateData);
      toast.success('Instance service configuration updated');
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const resolvedEntities = instanceService.entities || systemService.entities || [];
  const entityCount = resolvedEntities.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Instance Service</DialogTitle>
          <DialogDescription>
            Configure {systemService.name} for {instanceService.instance?.environment || 'this instance'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Path Override */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useServicePathOverride"
                checked={formData.useServicePathOverride}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, useServicePathOverride: checked === true })
                }
              />
              <Label htmlFor="useServicePathOverride" className="cursor-pointer">
                Override Service Path
              </Label>
            </div>
            {formData.useServicePathOverride && (
              <div>
                <Label htmlFor="servicePathOverride">Service Path</Label>
                <Input
                  id="servicePathOverride"
                  placeholder={systemService.servicePath}
                  value={formData.servicePathOverride}
                  onChange={(e) =>
                    setFormData({ ...formData, servicePathOverride: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default: {systemService.servicePath}
                </p>
              </div>
            )}
          </div>

          {/* Auth Override */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useAuthOverride"
                checked={formData.useAuthOverride}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, useAuthOverride: checked === true })
                }
              />
              <Label htmlFor="useAuthOverride" className="cursor-pointer">
                Override Authentication
              </Label>
            </div>
            {formData.useAuthOverride && (
              <div className="space-y-4 pl-6 border-l-2">
                <div>
                  <Label htmlFor="authType">Authentication Type</Label>
                  <Select
                    value={formData.authType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, authType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
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
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        placeholder="Leave empty to keep existing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        placeholder="Leave empty to keep existing"
                      />
                    </div>
                  </>
                )}

                {formData.authType === 'api_key' && (
                  <>
                    <div>
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) =>
                          setFormData({ ...formData, apiKey: e.target.value })
                        }
                        placeholder="Leave empty to keep existing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="apiKeyHeaderName">Header Name</Label>
                      <Input
                        id="apiKeyHeaderName"
                        value={formData.apiKeyHeaderName}
                        onChange={(e) =>
                          setFormData({ ...formData, apiKeyHeaderName: e.target.value })
                        }
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
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2TokenUrl: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="oauth2ClientId">Client ID</Label>
                      <Input
                        id="oauth2ClientId"
                        value={formData.oauth2ClientId}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2ClientId: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="oauth2ClientSecret">Client Secret</Label>
                      <Input
                        id="oauth2ClientSecret"
                        type="password"
                        value={formData.oauth2ClientSecret}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2ClientSecret: e.target.value })
                        }
                        placeholder="Leave empty to keep existing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="oauth2Scope">Scope (optional)</Label>
                      <Input
                        id="oauth2Scope"
                        value={formData.oauth2Scope}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2Scope: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Entities */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Entities</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{entityCount} entities</Badge>
                  {instanceService.hasEntityOverride && (
                    <Badge variant="secondary">Instance Override</Badge>
                  )}
                  {!instanceService.hasEntityOverride && (
                    <span className="text-xs text-muted-foreground">Inherited from service</span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshEntities}
                disabled={refreshingEntities}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshingEntities ? 'animate-spin' : ''}`} />
                {refreshingEntities ? 'Syncing...' : 'Sync from Instance'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sync entities from the instance metadata. This will create an entity override for this instance.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
