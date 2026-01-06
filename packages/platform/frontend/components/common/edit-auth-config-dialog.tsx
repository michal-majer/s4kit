'use client';

import { useState, useEffect } from 'react';
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
import { Upload, ChevronDown, ChevronUp, ShieldCheck, KeyRound, Globe, Settings2, Key } from 'lucide-react';

interface EditAuthConfigDialogProps {
  config: AuthConfiguration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (config: AuthConfiguration) => void;
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

    // Unwrap outer VCAP_SERVICES wrapper if present
    if (parsed.VCAP_SERVICES && typeof parsed.VCAP_SERVICES === 'object') {
      parsed = parsed.VCAP_SERVICES;
    }

    // Try VCAP_SERVICES format
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

    // Try direct format
    if (parsed.clientid && parsed.clientsecret && parsed.url) {
      return {
        tokenUrl: buildTokenUrl(parsed.url),
        clientId: parsed.clientid,
        clientSecret: parsed.clientsecret,
        scope: parsed.scope,
      };
    }

    // Try nested credentials format
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

export function EditAuthConfigDialog({ config, open, onOpenChange, onUpdated }: EditAuthConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');

  // Form state with existing values
  const [formData, setFormData] = useState({
    name: config.name,
    description: config.description || '',
    authType: config.authType,
    // Non-secret fields from authConfig
    oauth2TokenUrl: config.authConfig?.tokenUrl || '',
    oauth2ClientId: config.authConfig?.clientId || '',
    oauth2Scope: config.authConfig?.scope || '',
    apiKeyHeaderName: config.authConfig?.headerName || 'X-API-Key',
    customHeaderName: config.authConfig?.headerName || '',
    // Secret fields start empty - show placeholder
    username: '',
    password: '',
    oauth2ClientSecret: '',
    apiKey: '',
    customHeaderValue: '',
  });

  // Reset form when config changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: config.name,
        description: config.description || '',
        authType: config.authType,
        oauth2TokenUrl: config.authConfig?.tokenUrl || '',
        oauth2ClientId: config.authConfig?.clientId || '',
        oauth2Scope: config.authConfig?.scope || '',
        apiKeyHeaderName: config.authConfig?.headerName || 'X-API-Key',
        customHeaderName: config.authConfig?.headerName || '',
        username: '',
        password: '',
        oauth2ClientSecret: '',
        apiKey: '',
        customHeaderValue: '',
      });
      setBindingJson('');
      setShowImportSection(false);
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
      const data: Parameters<typeof api.authConfigurations.update>[1] = {
        name: formData.name,
        description: formData.description || undefined,
        authType: formData.authType,
      };

      // Add auth-type specific fields - only include secrets if provided
      if (formData.authType === 'basic') {
        if (formData.username) data.username = formData.username;
        if (formData.password) data.password = formData.password;
      } else if (formData.authType === 'oauth2') {
        data.oauth2TokenUrl = formData.oauth2TokenUrl;
        data.oauth2ClientId = formData.oauth2ClientId;
        data.oauth2Scope = formData.oauth2Scope || undefined;
        // Only include secret if user entered a new one
        if (formData.oauth2ClientSecret) {
          data.oauth2ClientSecret = formData.oauth2ClientSecret;
        }
      } else if (formData.authType === 'api_key') {
        data.apiKeyHeaderName = formData.apiKeyHeaderName;
        if (formData.apiKey) data.apiKey = formData.apiKey;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Auth Configuration</DialogTitle>
            <DialogDescription>
              Update the authentication configuration. Leave password/secret fields empty to keep existing values.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-auth-config-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-auth-config-name"
                placeholder="e.g., Production OAuth, Dev Basic Auth"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-auth-config-description">Description</Label>
              <Input
                id="edit-auth-config-description"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-auth-config-type">Authentication Type</Label>
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
                  <Label htmlFor="edit-auth-username">Username</Label>
                  <Input
                    id="edit-auth-username"
                    autoComplete="off"
                    placeholder={config.hasCredentials ? 'Leave empty to keep existing' : 'Enter username'}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                  {config.hasCredentials && config.authType === 'basic' && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep existing username
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-password">Password</Label>
                  <Input
                    id="edit-auth-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials ? 'Leave empty to keep existing' : 'Enter password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {config.hasCredentials && config.authType === 'basic' && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep existing password
                    </p>
                  )}
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
                        className="h-20 font-mono text-xs resize-none overflow-y-auto overflow-x-hidden break-all whitespace-pre-wrap"
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
                    <span className="bg-background px-2 text-muted-foreground">Or edit manually</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-oauth-token-url">
                    Token URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-auth-oauth-token-url"
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                    required={formData.authType === 'oauth2'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-oauth-client-id">
                    Client ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-auth-oauth-client-id"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                    required={formData.authType === 'oauth2'}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-oauth-client-secret">Client Secret</Label>
                  <Input
                    id="edit-auth-oauth-client-secret"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials && config.authType === 'oauth2' ? 'Leave empty to keep existing' : 'Enter client secret'}
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                  />
                  {config.hasCredentials && config.authType === 'oauth2' && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep existing client secret
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-oauth-scope">Scope (optional)</Label>
                  <Input
                    id="edit-auth-oauth-scope"
                    value={formData.oauth2Scope}
                    onChange={(e) => setFormData({ ...formData, oauth2Scope: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.authType === 'api_key' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-api-key-header">Header Name</Label>
                  <Input
                    id="edit-auth-api-key-header"
                    placeholder="X-API-Key"
                    value={formData.apiKeyHeaderName}
                    onChange={(e) => setFormData({ ...formData, apiKeyHeaderName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    The HTTP header name for the API key (default: X-API-Key)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-api-key">API Key</Label>
                  <Input
                    id="edit-auth-api-key"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials && config.authType === 'api_key' ? 'Leave empty to keep existing' : 'Enter API key'}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                  {config.hasCredentials && config.authType === 'api_key' && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep existing API key
                    </p>
                  )}
                </div>
              </>
            )}

            {formData.authType === 'custom' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-custom-header-name">Header Name</Label>
                  <Input
                    id="edit-auth-custom-header-name"
                    placeholder="Authorization"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-auth-custom-header-value">Header Value</Label>
                  <Input
                    id="edit-auth-custom-header-value"
                    type="password"
                    autoComplete="new-password"
                    placeholder={config.hasCredentials && config.authType === 'custom' ? 'Leave empty to keep existing' : 'Enter header value'}
                    value={formData.customHeaderValue}
                    onChange={(e) => setFormData({ ...formData, customHeaderValue: e.target.value })}
                  />
                  {config.hasCredentials && config.authType === 'custom' && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to keep existing header value
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
