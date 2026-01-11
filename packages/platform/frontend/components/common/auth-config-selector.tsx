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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api, AuthConfiguration, AuthType } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Key, Upload, ChevronDown, ChevronUp, ShieldCheck, KeyRound, Globe, Settings2, Pencil } from 'lucide-react';

interface AuthConfigSelectorProps {
  value?: string | null;
  onChange: (authConfigId: string | null) => void;
  disabled?: boolean;
  allowNone?: boolean;
  label?: string;
  description?: string;
  suggestedNameContext?: {
    systemName?: string;
    instanceName?: string;
  };
}

const authTypeShortNames: Record<AuthType, string> = {
  none: 'NoAuth',
  basic: 'Basic',
  oauth2: 'OAuth',
  custom: 'Custom',
};

function generateSuggestedName(
  systemName?: string,
  instanceName?: string,
  authType?: AuthType
): string {
  const parts = [
    systemName,
    instanceName,
    authType ? authTypeShortNames[authType] : undefined,
  ].filter(Boolean);
  return parts.join('-');
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
  custom: 'Custom Header',
};

const authTypeIcons: Record<AuthType, React.ReactNode> = {
  none: <Globe className="h-4 w-4" />,
  basic: <KeyRound className="h-4 w-4" />,
  oauth2: <ShieldCheck className="h-4 w-4" />,
  custom: <Key className="h-4 w-4" />,
};

export function AuthConfigSelector({
  value,
  onChange,
  disabled = false,
  allowNone = true,
  label = 'Authentication',
  description,
  suggestedNameContext,
}: AuthConfigSelectorProps) {
  const [configs, setConfigs] = useState<AuthConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Load auth configurations
  useEffect(() => {
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

      <CreateAuthConfigSheet
        open={createDialogOpen}
        onOpenChange={handleCreateDialogClose}
        onCreated={(newConfig) => {
          setConfigs((prev) => [newConfig, ...prev]);
          setCreateDialogOpen(false);
          // Use setTimeout to ensure state updates are flushed before notifying parent
          setTimeout(() => onChange(newConfig.id), 0);
        }}
        suggestedNameContext={suggestedNameContext}
      />

      {selectedConfig && (
        <EditAuthConfigSheet
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
  suggestedNameContext?: {
    systemName?: string;
    instanceName?: string;
  };
}

// Sheet version for use when triggered from within another modal
function CreateAuthConfigSheet({ open, onOpenChange, onCreated, suggestedNameContext }: CreateAuthConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
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
      customHeaderName: '',
      customHeaderValue: '',
    });
    setBindingJson('');
    setShowImportSection(false);
    setNameManuallyEdited(false);
    setParseSuccess(false);
  };

  useEffect(() => {
    if (open && suggestedNameContext && !nameManuallyEdited) {
      const suggested = generateSuggestedName(
        suggestedNameContext.systemName,
        suggestedNameContext.instanceName,
        formData.authType
      );
      if (suggested) {
        setFormData((prev) => ({ ...prev, name: suggested }));
      }
    }
  }, [open, suggestedNameContext, formData.authType, nameManuallyEdited]);

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
      // Show inline success message instead of toast to avoid button overlap
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 3000);
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
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <SheetContent className="flex flex-col" onPointerDownOutside={(e) => e.stopPropagation()} onInteractOutside={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <SheetHeader>
            <SheetTitle>Create Auth Configuration</SheetTitle>
            <SheetDescription>
              Create a reusable authentication configuration.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="sheet-auth-config-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sheet-auth-config-name"
                placeholder="e.g., Production OAuth, Dev Basic Auth"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  setNameManuallyEdited(true);
                }}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sheet-auth-config-type">Authentication Type</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-auth-username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-auth-username"
                    autoComplete="off"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-auth-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-auth-password"
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
                    size="sm"
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
                        className="h-20 font-mono text-xs resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleParseBinding}
                          disabled={!bindingJson.trim()}
                          className="flex-1"
                        >
                          Parse & Fill
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
                {parseSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-in fade-in">
                    <ShieldCheck className="h-4 w-4" />
                    Service binding imported successfully
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-oauth-token-url">
                    Token URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-oauth-token-url"
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-oauth-client-id">
                    Client ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-oauth-client-id"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-oauth-client-secret">
                    Client Secret <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-oauth-client-secret"
                    type="password"
                    autoComplete="new-password"
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-oauth-scope">Scope (optional)</Label>
                  <Input
                    id="sheet-oauth-scope"
                    value={formData.oauth2Scope}
                    onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-custom-header-name">
                    Header Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-custom-header-name"
                    placeholder="Authorization"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sheet-custom-header-value">
                    Header Value <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sheet-custom-header-value"
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
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Edit Auth Config Sheet - for editing within modals
interface EditAuthConfigSheetProps {
  config: AuthConfiguration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (config: AuthConfiguration) => void;
}

function EditAuthConfigSheet({ config, open, onOpenChange, onUpdated }: EditAuthConfigSheetProps) {
  const [loading, setLoading] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
  const [parseSuccess, setParseSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: config.name,
    description: config.description || '',
    authType: config.authType,
    oauth2TokenUrl: config.authConfig?.tokenUrl || '',
    oauth2ClientId: config.authConfig?.clientId || '',
    oauth2Scope: config.authConfig?.scope || '',
    customHeaderName: config.authConfig?.headerName || '',
    username: '',
    password: '',
    oauth2ClientSecret: '',
    customHeaderValue: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: config.name,
        description: config.description || '',
        authType: config.authType,
        oauth2TokenUrl: config.authConfig?.tokenUrl || '',
        oauth2ClientId: config.authConfig?.clientId || '',
        oauth2Scope: config.authConfig?.scope || '',
        customHeaderName: config.authConfig?.headerName || '',
        username: '',
        password: '',
        oauth2ClientSecret: '',
        customHeaderValue: '',
      });
      setBindingJson('');
      setShowImportSection(false);
      setParseSuccess(false);
    }
  }, [open, config]);

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
      // Show inline success message instead of toast to avoid button overlap
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 3000);
    } else {
      toast.error('Invalid service binding format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      const data: Parameters<typeof api.authConfigurations.update>[1] = {
        name: formData.name,
        description: formData.description || undefined,
        authType: formData.authType,
      };

      if (formData.authType === 'basic') {
        if (formData.username) data.username = formData.username;
        if (formData.password) data.password = formData.password;
      } else if (formData.authType === 'oauth2') {
        data.oauth2TokenUrl = formData.oauth2TokenUrl;
        data.oauth2ClientId = formData.oauth2ClientId;
        data.oauth2Scope = formData.oauth2Scope || undefined;
        if (formData.oauth2ClientSecret) {
          data.oauth2ClientSecret = formData.oauth2ClientSecret;
        }
      } else if (formData.authType === 'custom') {
        data.customHeaderName = formData.customHeaderName;
        if (formData.customHeaderValue) data.customHeaderValue = formData.customHeaderValue;
      }

      const updatedConfig = await api.authConfigurations.update(config.id, data);
      toast.success('Auth configuration updated');
      onOpenChange(false);
      onUpdated?.(updatedConfig);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        toast.error('An auth configuration with this name already exists');
      } else {
        toast.error('Failed to update auth configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col" onPointerDownOutside={(e) => e.stopPropagation()} onInteractOutside={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <SheetHeader>
            <SheetTitle>Edit Auth Configuration</SheetTitle>
            <SheetDescription>
              Update authentication settings. Leave secrets empty to keep existing values.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-6 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sheet-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-sheet-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sheet-type">Authentication Type</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-username">Username</Label>
                  <Input
                    id="edit-sheet-username"
                    autoComplete="off"
                    placeholder={config.hasCredentials ? 'Leave empty to keep existing' : ''}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-password">Password</Label>
                  <Input
                    id="edit-sheet-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials ? 'Leave empty to keep existing' : ''}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setShowImportSection(!showImportSection)}
                  >
                    <span className="flex items-center">
                      <Upload className="mr-2 h-4 w-4" />
                      Import from Service Binding
                    </span>
                    {showImportSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {showImportSection && (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <Textarea
                        placeholder="Paste VCAP_SERVICES or service binding JSON..."
                        value={bindingJson}
                        onChange={(e) => setBindingJson(e.target.value)}
                        className="h-20 font-mono text-xs resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={handleParseBinding} disabled={!bindingJson.trim()} className="flex-1">
                          Parse & Fill
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setBindingJson(''); setShowImportSection(false); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {parseSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 animate-in fade-in">
                    <ShieldCheck className="h-4 w-4" />
                    Service binding imported successfully
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-token-url">
                    Token URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-sheet-token-url"
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                    required={formData.authType === 'oauth2'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-client-id">
                    Client ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-sheet-client-id"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                    required={formData.authType === 'oauth2'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-client-secret">Client Secret</Label>
                  <Input
                    id="edit-sheet-client-secret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials && config.authType === 'oauth2' ? 'Leave empty to keep existing' : ''}
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-scope">Scope (optional)</Label>
                  <Input
                    id="edit-sheet-scope"
                    value={formData.oauth2Scope}
                    onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-header-name">Header Name</Label>
                  <Input
                    id="edit-sheet-header-name"
                    placeholder="Authorization"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-sheet-header-value">Header Value</Label>
                  <Input
                    id="edit-sheet-header-value"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials && config.authType === 'custom' ? 'Leave empty to keep existing' : ''}
                    value={formData.customHeaderValue}
                    onChange={(e) => setFormData({ ...formData, customHeaderValue: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
