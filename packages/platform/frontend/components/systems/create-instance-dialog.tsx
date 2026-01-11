'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { AuthConfigSelector } from '@/components/common/auth-config-selector';
import { api, InstanceEnvironment, AuthType } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Upload, ChevronDown, ChevronUp, ShieldCheck, KeyRound, Globe, Settings2 } from 'lucide-react';

interface CreateInstanceDialogProps {
  systemId: string;
  systemName: string;
  existingEnvironments: InstanceEnvironment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (instance: Awaited<ReturnType<typeof api.instances.create>>) => void;
}

type DialogView = 'create' | 'createAuth';

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

const environments: { value: InstanceEnvironment; label: string }[] = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'dev', label: 'Development' },
  { value: 'quality', label: 'Quality' },
  { value: 'preprod', label: 'Pre-Production' },
  { value: 'production', label: 'Production' },
];

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
 */
function extractVcapServicesJson(input: string): string {
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
    const cleanedJson = extractVcapServicesJson(json.trim());
    let parsed = JSON.parse(cleanedJson);

    if (parsed.VCAP_SERVICES && typeof parsed.VCAP_SERVICES === 'object') {
      parsed = parsed.VCAP_SERVICES;
    }

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

    if (parsed.clientid && parsed.clientsecret && parsed.url) {
      return {
        tokenUrl: buildTokenUrl(parsed.url),
        clientId: parsed.clientid,
        clientSecret: parsed.clientsecret,
        scope: parsed.scope,
      };
    }

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

export function CreateInstanceDialog({
  systemId,
  systemName,
  existingEnvironments,
  open,
  onOpenChange,
  onCreated,
}: CreateInstanceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<DialogView>('create');
  const [formData, setFormData] = useState({
    environment: '' as InstanceEnvironment | '',
    baseUrl: '',
    authConfigId: null as string | null,
  });

  // Auth config form state
  const [authLoading, setAuthLoading] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
  const [parseSuccess, setParseSuccess] = useState(false);
  const [authFormData, setAuthFormData] = useState({
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

  // Track newly created auth config ID to pass to selector
  const [newAuthConfigId, setNewAuthConfigId] = useState<string | null>(null);

  // Track if auth config name was manually edited
  const [authNameManuallyEdited, setAuthNameManuallyEdited] = useState(false);

  const availableEnvironments = environments.filter(
    (env) => !existingEnvironments.includes(env.value)
  );

  // Get the label for the selected environment
  const selectedEnvironmentLabel = environments.find(
    (env) => env.value === formData.environment
  )?.label;

  // Reset form data when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        environment: '' as InstanceEnvironment | '',
        baseUrl: '',
        authConfigId: null,
      });
      setView('create');
      resetAuthForm();
      setNewAuthConfigId(null);
      setAuthNameManuallyEdited(false);
    }
  }, [open]);

  // Auto-generate suggested auth config name
  useEffect(() => {
    if (view === 'createAuth' && !authNameManuallyEdited) {
      const suggested = generateSuggestedName(
        systemName,
        selectedEnvironmentLabel,
        authFormData.authType
      );
      if (suggested) {
        setAuthFormData((prev) => ({ ...prev, name: suggested }));
      }
    }
  }, [view, systemName, selectedEnvironmentLabel, authFormData.authType, authNameManuallyEdited]);

  const resetAuthForm = () => {
    setAuthFormData({
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
    setParseSuccess(false);
    setAuthNameManuallyEdited(false);
  };

  const handleParseBinding = () => {
    const parsed = parseServiceBinding(bindingJson);
    if (parsed) {
      setAuthFormData((prev) => ({
        ...prev,
        authType: 'oauth2',
        oauth2TokenUrl: parsed.tokenUrl,
        oauth2ClientId: parsed.clientId,
        oauth2ClientSecret: parsed.clientSecret,
        oauth2Scope: parsed.scope || '',
      }));
      setBindingJson('');
      setShowImportSection(false);
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 3000);
    } else {
      toast.error('Invalid service binding format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.environment || !formData.baseUrl) return;

    setLoading(true);
    try {
      const newInstance = await api.instances.create({
        systemId,
        environment: formData.environment as InstanceEnvironment,
        baseUrl: formData.baseUrl,
        authConfigId: formData.authConfigId,
      });
      toast.success('Instance created. Services are being verified...');
      onOpenChange(false);
      onCreated?.(newInstance);
    } catch {
      toast.error('Failed to create instance');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAuthConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFormData.name) return;

    setAuthLoading(true);
    try {
      const data: Parameters<typeof api.authConfigurations.create>[0] = {
        name: authFormData.name,
        description: authFormData.description || undefined,
        authType: authFormData.authType,
      };

      if (authFormData.authType === 'basic') {
        data.username = authFormData.username;
        data.password = authFormData.password;
      } else if (authFormData.authType === 'oauth2') {
        data.oauth2ClientId = authFormData.oauth2ClientId;
        data.oauth2ClientSecret = authFormData.oauth2ClientSecret;
        data.oauth2TokenUrl = authFormData.oauth2TokenUrl;
        data.oauth2Scope = authFormData.oauth2Scope || undefined;
      } else if (authFormData.authType === 'custom') {
        data.customHeaderName = authFormData.customHeaderName;
        data.customHeaderValue = authFormData.customHeaderValue;
      }

      const newConfig = await api.authConfigurations.create(data);
      toast.success('Auth configuration created');

      // Select the new config and go back to create view
      setFormData((prev) => ({ ...prev, authConfigId: newConfig.id }));
      setNewAuthConfigId(newConfig.id);
      resetAuthForm();
      setView('create');
    } catch (error) {
      console.error('Failed to create auth configuration:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists')) {
        toast.error('An auth configuration with this name already exists. Please choose a different name.');
      } else if (errorMessage.includes('Required authentication fields')) {
        toast.error('Please fill in all required authentication fields');
      } else {
        toast.error('Failed to create auth configuration');
      }
      // Stay on createAuth view - don't change view on error
      return;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setView('create');
      resetAuthForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange} modal={true}>
      <DialogContent
        className="sm:max-w-[500px] max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {view === 'create' ? (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add Instance</DialogTitle>
              <DialogDescription>
                Configure connection details for an environment
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="environment">
                  Environment <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) =>
                    setFormData({ ...formData, environment: value as InstanceEnvironment })
                  }
                  required
                >
                  <SelectTrigger className={!formData.environment ? 'border-muted-foreground/50' : ''}>
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
                <p className="text-xs text-muted-foreground">
                  Choose the environment type for this instance (e.g., Development, Production)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="baseUrl">
                  Base URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="baseUrl"
                  placeholder="https://my-system.s4hana.ondemand.com"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The base URL of your SAP system API endpoint
                </p>
              </div>

              <AuthConfigSelector
                value={formData.authConfigId}
                onChange={(authConfigId) => setFormData({ ...formData, authConfigId })}
                description="Select or create an authentication configuration for this instance"
                suggestedNameContext={{
                  systemName,
                  instanceName: selectedEnvironmentLabel,
                }}
                onRequestCreateAuth={() => setView('createAuth')}
                newConfigId={newAuthConfigId}
              />
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
        ) : (
          <form onSubmit={handleCreateAuthConfig} className="flex flex-col flex-1 overflow-hidden">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    resetAuthForm();
                    setView('create');
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Create Auth Configuration</DialogTitle>
                  <DialogDescription>
                    Create a new authentication configuration.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <Label htmlFor="auth-config-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="auth-config-name"
                  placeholder="e.g., Production OAuth, Dev Basic Auth"
                  value={authFormData.name}
                  onChange={(e) => {
                    setAuthFormData({ ...authFormData, name: e.target.value });
                    setAuthNameManuallyEdited(true);
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-config-type">Authentication Type</Label>
                <Select
                  value={authFormData.authType}
                  onValueChange={(value) => setAuthFormData({ ...authFormData, authType: value as AuthType })}
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

              {authFormData.authType === 'basic' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-username">
                      Username <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="auth-username"
                      autoComplete="off"
                      value={authFormData.username}
                      onChange={(e) => setAuthFormData({ ...authFormData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-password">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="auth-password"
                      type="password"
                      autoComplete="new-password"
                      value={authFormData.password}
                      onChange={(e) => setAuthFormData({ ...authFormData, password: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              {authFormData.authType === 'oauth2' && (
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
                    <Label htmlFor="oauth-token-url">
                      Token URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="oauth-token-url"
                      placeholder="https://auth.example.com/oauth/token"
                      value={authFormData.oauth2TokenUrl}
                      onChange={(e) => setAuthFormData({ ...authFormData, oauth2TokenUrl: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-client-id">
                      Client ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="oauth-client-id"
                      value={authFormData.oauth2ClientId}
                      onChange={(e) => setAuthFormData({ ...authFormData, oauth2ClientId: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-client-secret">
                      Client Secret <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="oauth-client-secret"
                      type="password"
                      autoComplete="new-password"
                      value={authFormData.oauth2ClientSecret}
                      onChange={(e) => setAuthFormData({ ...authFormData, oauth2ClientSecret: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-scope">Scope (optional)</Label>
                    <Input
                      id="oauth-scope"
                      value={authFormData.oauth2Scope}
                      onChange={(e) => setAuthFormData({ ...authFormData, oauth2Scope: e.target.value })}
                    />
                  </div>
                </>
              )}

              {authFormData.authType === 'custom' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-header-name">
                      Header Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="custom-header-name"
                      placeholder="Authorization"
                      value={authFormData.customHeaderName}
                      onChange={(e) => setAuthFormData({ ...authFormData, customHeaderName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-header-value">
                      Header Value <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="custom-header-value"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Bearer token or custom value"
                      value={authFormData.customHeaderValue}
                      onChange={(e) => setAuthFormData({ ...authFormData, customHeaderValue: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetAuthForm();
                  setView('create');
                }}
              >
                Back
              </Button>
              <Button type="submit" disabled={authLoading || !authFormData.name}>
                {authLoading ? 'Creating...' : 'Create Auth Config'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
