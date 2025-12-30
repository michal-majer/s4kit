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
import { Checkbox } from '@/components/ui/checkbox';
import { api, InstanceService, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Client-side parser for service binding JSON
 */
function parseServiceBinding(json: string): {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
} | null {
  try {
    const parsed = JSON.parse(json);

    // Try VCAP_SERVICES format
    if (parsed.xsuaa && Array.isArray(parsed.xsuaa) && parsed.xsuaa.length > 0) {
      const creds = parsed.xsuaa[0].credentials;
      if (creds?.clientid && creds?.clientsecret && creds?.url) {
        return {
          tokenUrl: creds.url.replace(/\/$/, '') + '/oauth/token',
          clientId: creds.clientid,
          clientSecret: creds.clientsecret,
          scope: creds.scope,
        };
      }
    }

    // Try destination service format
    if (parsed.destination && Array.isArray(parsed.destination) && parsed.destination.length > 0) {
      const creds = parsed.destination[0].credentials;
      if (creds?.clientid && creds?.clientsecret && creds?.url) {
        return {
          tokenUrl: creds.url.replace(/\/$/, '') + '/oauth/token',
          clientId: creds.clientid,
          clientSecret: creds.clientsecret,
        };
      }
    }

    // Try direct service binding format
    if (parsed.clientid && parsed.clientsecret && parsed.url) {
      return {
        tokenUrl: parsed.url.replace(/\/$/, '') + '/oauth/token',
        clientId: parsed.clientid,
        clientSecret: parsed.clientsecret,
        scope: parsed.scope,
      };
    }

    // Try nested credentials format
    if (parsed.credentials?.clientid && parsed.credentials?.clientsecret && parsed.credentials?.url) {
      return {
        tokenUrl: parsed.credentials.url.replace(/\/$/, '') + '/oauth/token',
        clientId: parsed.credentials.clientid,
        clientSecret: parsed.credentials.clientsecret,
        scope: parsed.credentials.scope,
      };
    }

    return null;
  } catch {
    return null;
  }
}

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
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
  const [formData, setFormData] = useState({
    servicePathOverride: instanceService.servicePathOverride || '',
    useServicePathOverride: !!instanceService.servicePathOverride,
    useAuthOverride: instanceService.hasAuthOverride || false,
    authType: instanceService.authType || 'basic',
    username: '',
    password: '',
    oauth2ClientId: instanceService.authConfig?.clientId || '',
    oauth2ClientSecret: '',
    oauth2TokenUrl: instanceService.authConfig?.tokenUrl || '',
    oauth2Scope: instanceService.authConfig?.scope || '',
    customHeaderName: instanceService.authConfig?.headerName || '',
    customHeaderValue: '',
    useEntityOverride: instanceService.hasEntityOverride || false,
  });

  const handleParseBinding = () => {
    const parsed = parseServiceBinding(bindingJson);
    if (parsed) {
      setFormData((prev) => ({
        ...prev,
        oauth2TokenUrl: parsed.tokenUrl,
        oauth2ClientId: parsed.clientId,
        oauth2ClientSecret: parsed.clientSecret,
        oauth2Scope: parsed.scope || '',
      }));
      setBindingJson('');
      setShowImportSection(false);
      toast.success('Service binding parsed successfully');
    } else {
      toast.error('Invalid service binding format');
    }
  };

  useEffect(() => {
    if (open) {
      setFormData({
        servicePathOverride: instanceService.servicePathOverride || '',
        useServicePathOverride: !!instanceService.servicePathOverride,
        useAuthOverride: instanceService.hasAuthOverride || false,
        authType: instanceService.authType || 'basic',
        username: '',
        password: '',
        oauth2ClientId: instanceService.authConfig?.clientId || '',
        oauth2ClientSecret: '',
        oauth2TokenUrl: instanceService.authConfig?.tokenUrl || '',
        oauth2Scope: instanceService.authConfig?.scope || '',
        customHeaderName: instanceService.authConfig?.headerName || '',
        customHeaderValue: '',
        useEntityOverride: instanceService.hasEntityOverride || false,
      });
    }
  }, [instanceService, open]);

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
      if (formData.useAuthOverride) {
        updateData.authType = formData.authType;

        if (formData.authType === 'basic') {
          updateData.username = formData.username;
          updateData.password = formData.password;
        } else if (formData.authType === 'oauth2') {
          updateData.oauth2ClientId = formData.oauth2ClientId;
          updateData.oauth2ClientSecret = formData.oauth2ClientSecret;
          updateData.oauth2TokenUrl = formData.oauth2TokenUrl;
          updateData.oauth2Scope = formData.oauth2Scope;
        } else if (formData.authType === 'custom') {
          updateData.customHeaderName = formData.customHeaderName;
          updateData.customHeaderValue = formData.customHeaderValue;
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
                <div className="grid gap-2">
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
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.authType === 'basic' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="override-username">
                        Username <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="override-username"
                        name="override-username"
                        autoComplete="off"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        SAP technical user or communication user
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="override-password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="override-password"
                        name="override-password"
                        type="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Password for the technical user
                      </p>
                    </div>
                  </>
                )}

                {formData.authType === 'oauth2' && (
                  <>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setShowImportSection(!showImportSection)}
                      >
                        <span className="flex items-center">
                          <Upload className="mr-2 h-4 w-4" />
                          Import from Service Binding
                        </span>
                        {showImportSection ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      {showImportSection && (
                        <div className="space-y-2 rounded-md border p-3">
                          <Textarea
                            placeholder="Paste VCAP_SERVICES or service binding JSON..."
                            value={bindingJson}
                            onChange={(e) => setBindingJson(e.target.value)}
                            className="min-h-[100px] font-mono text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleParseBinding}
                            disabled={!bindingJson.trim()}
                          >
                            Parse & Fill Fields
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="override-oauth2TokenUrl">Token URL</Label>
                      <Input
                        id="override-oauth2TokenUrl"
                        name="override-oauth2TokenUrl"
                        autoComplete="off"
                        placeholder="https://auth.example.com/oauth/token"
                        value={formData.oauth2TokenUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2TokenUrl: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="override-oauth2ClientId">Client ID</Label>
                      <Input
                        id="override-oauth2ClientId"
                        name="override-oauth2ClientId"
                        autoComplete="off"
                        value={formData.oauth2ClientId}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2ClientId: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="override-oauth2ClientSecret">Client Secret</Label>
                      <Input
                        id="override-oauth2ClientSecret"
                        name="override-oauth2ClientSecret"
                        type="password"
                        autoComplete="new-password"
                        value={formData.oauth2ClientSecret}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2ClientSecret: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="override-oauth2Scope">Scope (optional)</Label>
                      <Input
                        id="override-oauth2Scope"
                        name="override-oauth2Scope"
                        autoComplete="off"
                        value={formData.oauth2Scope}
                        onChange={(e) =>
                          setFormData({ ...formData, oauth2Scope: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                {formData.authType === 'custom' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="override-customHeaderName">
                        Header Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="override-customHeaderName"
                        name="override-customHeaderName"
                        autoComplete="off"
                        placeholder="APIKey"
                        value={formData.customHeaderName}
                        onChange={(e) =>
                          setFormData({ ...formData, customHeaderName: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        The HTTP header name used for authentication (e.g., APIKey, Authorization)
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="override-customHeaderValue">
                        Header Value <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="override-customHeaderValue"
                        name="override-customHeaderValue"
                        type="password"
                        autoComplete="new-password"
                        placeholder="your-api-key-or-token"
                        value={formData.customHeaderValue}
                        onChange={(e) =>
                          setFormData({ ...formData, customHeaderValue: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        The value sent with the header (e.g., your API key or &quot;Bearer token&quot;)
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
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
