'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, AuthConfiguration, AuthType } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Key, Upload, ChevronDown, ChevronUp, ShieldCheck, KeyRound, Globe, Settings2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditAuthConfigDialog } from './edit-auth-config-dialog';

interface AuthConfigSelectorProps {
  value?: string | null;
  onChange: (authConfigId: string | null) => void;
  disabled?: boolean;
  allowNone?: boolean;
  label?: string;
  description?: string;
}

/**
 * Build OAuth token URL from UAA base URL
 */
function buildTokenUrl(baseUrl: string): string {
  const url = baseUrl.replace(/\/$/, '');
  if (url.endsWith('/oauth/token')) return url;
  return `${url}/oauth/token`;
}

/**
 * Try to extract valid JSON containing VCAP_SERVICES from potentially malformed input
 * (e.g., when user pastes both VCAP_SERVICES and VCAP_APPLICATION together)
 */
function extractVcapServicesJson(input: string): string {
  // If input contains multiple JSON objects (VCAP_SERVICES followed by VCAP_APPLICATION),
  // try to extract just the VCAP_SERVICES part
  const vcapServicesMatch = input.match(/\{\s*"VCAP_SERVICES"\s*:\s*\{/);
  if (vcapServicesMatch) {
    const startIndex = vcapServicesMatch.index!;
    let braceCount = 0;
    let inString = false;
    let escape = false;

    for (let i = startIndex; i < input.length; i++) {
      const char = input[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        continue;
      }

      if (char === '"' && !escape) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return input.slice(startIndex, i + 1);
          }
        }
      }
    }
  }
  return input;
}

/**
 * Parse service binding JSON to extract OAuth credentials
 */
function parseServiceBinding(json: string): {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
} | null {
  try {
    // Try to extract valid VCAP_SERVICES JSON if input contains multiple objects
    const cleanedJson = extractVcapServicesJson(json.trim());
    let parsed = JSON.parse(cleanedJson);

    // Unwrap outer VCAP_SERVICES wrapper if present
    // Handles format: { "VCAP_SERVICES": { "xsuaa": [...] } }
    if (parsed.VCAP_SERVICES && typeof parsed.VCAP_SERVICES === 'object') {
      parsed = parsed.VCAP_SERVICES;
    }

    // Try VCAP_SERVICES format: { xsuaa: [{ credentials: { ... } }] }
    if (parsed.xsuaa && Array.isArray(parsed.xsuaa) && parsed.xsuaa.length > 0) {
      const creds = parsed.xsuaa[0].credentials;
      if (creds?.clientid && creds?.clientsecret && creds?.url) {
        return {
          tokenUrl: buildTokenUrl(creds.url),
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
          tokenUrl: buildTokenUrl(creds.url),
          clientId: creds.clientid,
          clientSecret: creds.clientsecret,
        };
      }
    }

    // Try direct service binding format: { clientid, clientsecret, url }
    if (parsed.clientid && parsed.clientsecret && parsed.url) {
      return {
        tokenUrl: buildTokenUrl(parsed.url),
        clientId: parsed.clientid,
        clientSecret: parsed.clientsecret,
        scope: parsed.scope,
      };
    }

    // Try nested credentials format: { credentials: { clientid, ... } }
    if (parsed.credentials?.clientid && parsed.credentials?.clientsecret && parsed.credentials?.url) {
      return {
        tokenUrl: buildTokenUrl(parsed.credentials.url),
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

const authTypeLabels: Record<AuthType, string> = {
  none: 'No Authentication',
  basic: 'Basic Auth',
  oauth2: 'OAuth 2.0',
  api_key: 'API Key',
  custom: 'Custom Header',
};

const authTypeIcons: Record<AuthType, React.ReactNode> = {
  none: <Globe className="h-4 w-4" />,
  basic: <KeyRound className="h-4 w-4" />,
  oauth2: <ShieldCheck className="h-4 w-4" />,
  api_key: <Key className="h-4 w-4" />,
  custom: <Settings2 className="h-4 w-4" />,
};

export function AuthConfigSelector({
  value,
  onChange,
  disabled = false,
  allowNone = true,
  label = 'Authentication',
  description,
}: AuthConfigSelectorProps) {
  const [configs, setConfigs] = useState<AuthConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Load auth configurations
  useEffect(() => {
    setLoading(true);
    api.authConfigurations.list()
      .then(setConfigs)
      .catch(() => toast.error('Failed to load auth configurations'))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch when create dialog closes (to get new config)
  const handleCreateDialogClose = (open: boolean) => {
    if (!open) {
      api.authConfigurations.list().then(setConfigs);
    }
    setCreateDialogOpen(open);
  };

  const selectedConfig = useMemo(() => {
    return configs.find((c) => c.id === value);
  }, [configs, value]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select
          value={value || '__none__'}
          onValueChange={(v) => onChange(v === '__none__' ? null : v)}
          disabled={disabled || loading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? 'Loading...' : 'Select authentication'}>
              {selectedConfig ? (
                <span className="flex items-center gap-2">
                  {authTypeIcons[selectedConfig.authType]}
                  {selectedConfig.name}
                </span>
              ) : value === null || !value ? (
                allowNone ? (
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    No Authentication
                  </span>
                ) : (
                  'Select authentication'
                )
              ) : (
                'Select authentication'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allowNone && (
              <SelectItem value="__none__">
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  No Authentication
                </span>
              </SelectItem>
            )}
            {configs.map((config) => (
              <SelectItem key={config.id} value={config.id}>
                <span className="flex items-center gap-2">
                  {authTypeIcons[config.authType]}
                  <span>{config.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({authTypeLabels[config.authType]})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCreateDialogOpen(true)}
          disabled={disabled}
          title="Create new auth configuration"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {selectedConfig && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setEditDialogOpen(true)}
            disabled={disabled}
            title="Edit selected auth configuration"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {selectedConfig && (
        <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
          <span className="font-medium">{authTypeLabels[selectedConfig.authType]}</span>
          {selectedConfig.description && (
            <span> - {selectedConfig.description}</span>
          )}
        </div>
      )}

      <CreateAuthConfigDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogClose}
        onCreated={(newConfig) => {
          setConfigs((prev) => [newConfig, ...prev]);
          onChange(newConfig.id);
          setCreateDialogOpen(false);
        }}
      />

      {selectedConfig && (
        <EditAuthConfigDialog
          config={selectedConfig}
          open={editDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              // Refresh configs when dialog closes
              api.authConfigurations.list().then(setConfigs);
            }
            setEditDialogOpen(open);
          }}
          onUpdated={(updatedConfig) => {
            setConfigs((prev) =>
              prev.map((c) => (c.id === updatedConfig.id ? updatedConfig : c))
            );
          }}
        />
      )}
    </div>
  );
}

interface CreateAuthConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (config: AuthConfiguration) => void;
}

function CreateAuthConfigDialog({ open, onOpenChange, onCreated }: CreateAuthConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    authType: 'basic' as AuthType,
    username: '',
    password: '',
    oauth2ClientId: '',
    oauth2ClientSecret: '',
    oauth2TokenUrl: '',
    oauth2Scope: '',
    apiKey: '',
    apiKeyHeaderName: 'X-API-Key',
    customHeaderName: '',
    customHeaderValue: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      authType: 'basic',
      username: '',
      password: '',
      oauth2ClientId: '',
      oauth2ClientSecret: '',
      oauth2TokenUrl: '',
      oauth2Scope: '',
      apiKey: '',
      apiKeyHeaderName: 'X-API-Key',
      customHeaderName: '',
      customHeaderValue: '',
    });
    setBindingJson('');
    setShowImportSection(false);
  };

  const handleParseBinding = () => {
    const parsed = parseServiceBinding(bindingJson);
    if (parsed) {
      setFormData((prev) => ({
        ...prev,
        authType: 'oauth2',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      const data: Parameters<typeof api.authConfigurations.create>[0] = {
        name: formData.name,
        description: formData.description || undefined,
        authType: formData.authType,
      };

      if (formData.authType === 'basic') {
        data.username = formData.username;
        data.password = formData.password;
      } else if (formData.authType === 'oauth2') {
        data.oauth2ClientId = formData.oauth2ClientId;
        data.oauth2ClientSecret = formData.oauth2ClientSecret;
        data.oauth2TokenUrl = formData.oauth2TokenUrl;
        data.oauth2Scope = formData.oauth2Scope || undefined;
      } else if (formData.authType === 'api_key') {
        data.apiKey = formData.apiKey;
        data.apiKeyHeaderName = formData.apiKeyHeaderName;
      } else if (formData.authType === 'custom') {
        data.customHeaderName = formData.customHeaderName;
        data.customHeaderValue = formData.customHeaderValue;
      }

      const newConfig = await api.authConfigurations.create(data);
      toast.success('Auth configuration created');
      resetForm();
      onCreated?.(newConfig);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('An auth configuration with this name already exists');
      } else {
        toast.error('Failed to create auth configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Auth Configuration</DialogTitle>
            <DialogDescription>
              Create a reusable authentication configuration that can be shared across instances and services.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="auth-config-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="auth-config-name"
                placeholder="e.g., Production OAuth, Dev Basic Auth"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this configuration
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="auth-config-description">Description</Label>
              <Input
                id="auth-config-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="auth-config-type">Authentication Type</Label>
              <Select
                value={formData.authType}
                onValueChange={(value) => setFormData({ ...formData, authType: value as AuthType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Basic Auth
                    </span>
                  </SelectItem>
                  <SelectItem value="oauth2">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      OAuth 2.0
                    </span>
                  </SelectItem>
                  <SelectItem value="api_key">
                    <span className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Key
                    </span>
                  </SelectItem>
                  <SelectItem value="custom">
                    <span className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Custom Header
                    </span>
                  </SelectItem>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      No Authentication
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.authType === 'basic' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="auth-username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-username"
                    autoComplete="off"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auth-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
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
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <Textarea
                        placeholder="Paste VCAP_SERVICES or service binding JSON here..."
                        value={bindingJson}
                        onChange={(e) => setBindingJson(e.target.value)}
                        className="h-20 font-mono text-xs resize-none overflow-auto"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleParseBinding}
                          disabled={!bindingJson.trim()}
                          className="flex-1"
                        >
                          Parse & Fill Fields
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setBindingJson('');
                            setShowImportSection(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
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
                  <Label htmlFor="auth-oauth-token-url">
                    Token URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-oauth-token-url"
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auth-oauth-client-id">
                    Client ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-oauth-client-id"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auth-oauth-client-secret">
                    Client Secret <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-oauth-client-secret"
                    type="password"
                    autoComplete="new-password"
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auth-oauth-scope">Scope (optional)</Label>
                  <Input
                    id="auth-oauth-scope"
                    value={formData.oauth2Scope}
                    onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'api_key' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="auth-api-key-header">Header Name</Label>
                  <Input
                    id="auth-api-key-header"
                    placeholder="X-API-Key"
                    value={formData.apiKeyHeaderName}
                    onChange={(e) => setFormData({ ...formData, apiKeyHeaderName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The HTTP header name for the API key (default: X-API-Key)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auth-api-key">
                    API Key <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-api-key"
                    type="password"
                    autoComplete="new-password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            {formData.authType === 'custom' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="auth-custom-header-name">
                    Header Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-custom-header-name"
                    placeholder="Authorization"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auth-custom-header-value">
                    Header Value <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="auth-custom-header-value"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Bearer token or custom value"
                    value={formData.customHeaderValue}
                    onChange={(e) => setFormData({ ...formData, customHeaderValue: e.target.value })}
                    required
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Creating...' : 'Create Configuration'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
