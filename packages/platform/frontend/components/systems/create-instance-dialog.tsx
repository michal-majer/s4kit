'use client';

import { useState } from 'react';
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
import { api, InstanceEnvironment } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Client-side parser for service binding JSON
 * Extracts OAuth credentials from VCAP_SERVICES or direct service binding format
 */
function parseServiceBinding(json: string): {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
} | null {
  try {
    const parsed = JSON.parse(json);

    // Try VCAP_SERVICES format: { xsuaa: [{ credentials: { ... } }] }
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

    // Try direct service binding format: { clientid, clientsecret, url }
    if (parsed.clientid && parsed.clientsecret && parsed.url) {
      return {
        tokenUrl: parsed.url.replace(/\/$/, '') + '/oauth/token',
        clientId: parsed.clientid,
        clientSecret: parsed.clientsecret,
        scope: parsed.scope,
      };
    }

    // Try nested credentials format: { credentials: { clientid, ... } }
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
  const [showImportSection, setShowImportSection] = useState(false);
  const [bindingJson, setBindingJson] = useState('');
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
                  <Label htmlFor="create-username">
                    Username <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-username"
                    name="create-username"
                    autoComplete="off"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    SAP technical user or communication user
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-password"
                    name="create-password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  <Label htmlFor="create-oauth2TokenUrl">Token URL</Label>
                  <Input
                    id="create-oauth2TokenUrl"
                    name="create-oauth2TokenUrl"
                    autoComplete="off"
                    placeholder="https://auth.example.com/oauth/token"
                    value={formData.oauth2TokenUrl}
                    onChange={(e) => setFormData({ ...formData, oauth2TokenUrl: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-oauth2ClientId">Client ID</Label>
                  <Input
                    id="create-oauth2ClientId"
                    name="create-oauth2ClientId"
                    autoComplete="off"
                    value={formData.oauth2ClientId}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientId: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-oauth2ClientSecret">Client Secret</Label>
                  <Input
                    id="create-oauth2ClientSecret"
                    name="create-oauth2ClientSecret"
                    type="password"
                    autoComplete="new-password"
                    value={formData.oauth2ClientSecret}
                    onChange={(e) => setFormData({ ...formData, oauth2ClientSecret: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-oauth2Scope">Scope (optional)</Label>
                  <Input
                    id="create-oauth2Scope"
                    name="create-oauth2Scope"
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
                  <Label htmlFor="create-customHeaderName">
                    Header Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-customHeaderName"
                    name="create-customHeaderName"
                    autoComplete="off"
                    placeholder="APIKey"
                    value={formData.customHeaderName}
                    onChange={(e) => setFormData({ ...formData, customHeaderName: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The HTTP header name used for authentication (e.g., APIKey, Authorization)
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-customHeaderValue">
                    Header Value <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-customHeaderValue"
                    name="create-customHeaderValue"
                    type="password"
                    autoComplete="new-password"
                    placeholder="your-api-key-or-token"
                    value={formData.customHeaderValue}
                    onChange={(e) => setFormData({ ...formData, customHeaderValue: e.target.value })}
                    required
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
            <Button type="submit" disabled={loading || !formData.environment || !formData.baseUrl}>
              {loading ? 'Creating...' : 'Create Instance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
