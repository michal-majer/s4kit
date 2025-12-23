'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, System, Instance, SystemService, InstanceService, InstanceEnvironment } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  RefreshCw,
  Database,
  Settings,
  Globe,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  ExternalLink,
  Server,
  Layers,
  ChevronRight,
  Shield,
  Link2,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { ServiceVerificationStatus } from './service-verification-status';
import { InstanceServiceConfigDialog } from './instance-service-config-dialog';
import { ApiTestTab } from './api-test-tab';

const envLabels: Record<InstanceEnvironment, string> = {
  sandbox: 'Sandbox',
  dev: 'Development',
  quality: 'Quality',
  preprod: 'Pre-Production',
  production: 'Production',
};

const envColors: Record<InstanceEnvironment, string> = {
  sandbox: 'bg-purple-500',
  dev: 'bg-blue-500',
  quality: 'bg-amber-500',
  preprod: 'bg-orange-500',
  production: 'bg-green-500',
};

const envBorderColors: Record<InstanceEnvironment, string> = {
  sandbox: 'border-l-purple-500',
  dev: 'border-l-blue-500',
  quality: 'border-l-amber-500',
  preprod: 'border-l-orange-500',
  production: 'border-l-green-500',
};

// Environment order for sorting
const envOrder: Record<InstanceEnvironment, number> = {
  sandbox: 0,
  dev: 1,
  quality: 2,
  preprod: 3,
  production: 4,
};

interface InstanceServiceDetailsProps {
  instanceService: InstanceService;
  systemService: SystemService;
  instance: Instance;
  system: System;
  siblingServices: InstanceService[];
}

export function InstanceServiceDetails({
  instanceService,
  systemService,
  instance,
  system,
  siblingServices,
}: InstanceServiceDetailsProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('endpoint');
  const [testEntity, setTestEntity] = useState<string | null>(null);

  const handleTestEntity = (entity: string) => {
    setTestEntity(entity);
    setActiveTab('test');
  };

  const handleRefreshEntities = async () => {
    setRefreshing(true);
    try {
      const result = await api.instanceServices.refreshEntities(instanceService.id);
      toast.success(`Refreshed ${result.refreshedCount || result.entities?.length || 0} entities`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to refresh entities');
    } finally {
      setRefreshing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Resolve values (use override if exists, otherwise use system defaults)
  const resolvedServicePath = instanceService.servicePathOverride || systemService.servicePath;
  const resolvedEntities = instanceService.entities || systemService.entities || [];
  const hasPathOverride = !!instanceService.servicePathOverride;
  const hasAuthOverride = instanceService.hasAuthOverride || false;
  const fullEndpoint = `${instance.baseUrl}${resolvedServicePath}`;

  // Determine effective auth type (instanceService > systemService > instance)
  const effectiveAuthType = instanceService.authType || systemService.authType || instance.authType;
  const authSource = instanceService.authType
    ? 'Custom for this service'
    : systemService.authType
    ? 'From system service'
    : 'From instance';

  const getStatusIcon = () => {
    switch (instanceService.verificationStatus) {
      case 'verified':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    switch (instanceService.verificationStatus) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getAuthLabel = () => {
    switch (effectiveAuthType) {
      case 'basic':
        return 'Basic Auth';
      case 'oauth2':
        return 'OAuth 2.0';
      case 'api_key':
        return 'API Key';
      case 'none':
        return 'Public';
      default:
        return 'Inherited';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/systems" className="hover:text-foreground transition-colors">
          Systems
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/systems/${system.id}`} className="hover:text-foreground transition-colors">
          {system.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{systemService.name}</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${envColors[instance.environment].replace('bg-', 'bg-')}/10`}>
              <Server className={`h-6 w-6 ${envColors[instance.environment].replace('bg-', 'text-').replace('-500', '-600')}`} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{systemService.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="font-mono text-xs">
                  {systemService.alias}
                </Badge>
                {systemService.odataVersion && (
                  <Badge variant="outline" className="text-xs">
                    OData {systemService.odataVersion.toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {systemService.description && (
            <p className="text-muted-foreground max-w-2xl">{systemService.description}</p>
          )}

          {/* Environment Selector */}
          {siblingServices.length > 1 && (
            <Select
              value={instanceService.id}
              onValueChange={(serviceId) => {
                if (serviceId !== instanceService.id) {
                  router.push(`/systems/${system.id}/instance-services/${serviceId}`);
                }
              }}
            >
              <SelectTrigger className="w-fit h-8 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${envColors[instance.environment]}`} />
                  <span>{envLabels[instance.environment]}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {siblingServices
                  .sort((a, b) => {
                    const envA = a.instance?.environment || 'dev';
                    const envB = b.instance?.environment || 'dev';
                    return envOrder[envA] - envOrder[envB];
                  })
                  .map((sibling) => {
                    const env = sibling.instance?.environment || 'dev';
                    return (
                      <SelectItem key={sibling.id} value={sibling.id}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${envColors[env]}`} />
                          <span>{envLabels[env]}</span>
                          {sibling.verificationStatus === 'failed' && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          )}

          {/* Single environment - just show badge */}
          {siblingServices.length <= 1 && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${envColors[instance.environment]}`} />
              <span className="text-sm text-muted-foreground">{envLabels[instance.environment]}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button onClick={handleRefreshEntities} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Sync Entities
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={`border-l-4 ${
          instanceService.verificationStatus === 'verified' ? 'border-l-green-500' :
          instanceService.verificationStatus === 'failed' ? 'border-l-red-500' :
          'border-l-amber-500'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon()}
                  <span className="text-lg font-semibold">{getStatusLabel()}</span>
                </div>
              </div>
            </div>
            {instanceService.verificationStatus === 'failed' && instanceService.verificationError ? (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 break-all">
                {instanceService.verificationError}
              </p>
            ) : instanceService.lastVerifiedAt ? (
              <p className="text-xs text-muted-foreground mt-2">
                Last checked {new Date(instanceService.lastVerifiedAt).toLocaleDateString()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entities</p>
                <p className="text-2xl font-semibold mt-1">{resolvedEntities.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Database className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Authentication</p>
                <p className="text-lg font-semibold mt-1">{getAuthLabel()}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{authSource}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overrides</p>
                <p className="text-2xl font-semibold mt-1">
                  {[hasPathOverride, hasAuthOverride].filter(Boolean).length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Layers className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active customizations</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoint">
            <Link2 className="h-4 w-4 mr-2" />
            Endpoint
          </TabsTrigger>
          <TabsTrigger value="entities">
            <Database className="h-4 w-4 mr-2" />
            Entities
          </TabsTrigger>
          <TabsTrigger value="test">
            <Play className="h-4 w-4 mr-2" />
            Test
          </TabsTrigger>
          <TabsTrigger value="authentication">
            <Key className="h-4 w-4 mr-2" />
            Authentication
          </TabsTrigger>
        </TabsList>

        {/* Endpoint Tab */}
        <TabsContent value="endpoint" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endpoint Configuration</CardTitle>
              <CardDescription>
                The full endpoint URL for this service on this instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full Endpoint URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Full Endpoint URL</label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(fullEndpoint, 'Endpoint URL')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      asChild
                    >
                      <a href={fullEndpoint} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <code className="text-sm font-mono break-all">{fullEndpoint}</code>
                </div>
              </div>

              <Separator />

              {/* Breakdown */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Base URL
                    </label>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <code className="text-sm font-mono">{instance.baseUrl}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {envLabels[instance.environment]} instance
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Service Path
                    </label>
                    {hasPathOverride ? (
                      <Badge className="text-xs">Override</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg border ${hasPathOverride ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
                    <code className="text-sm font-mono">{resolvedServicePath}</code>
                  </div>
                  {hasPathOverride && (
                    <p className="text-xs text-muted-foreground">
                      Default: <code className="font-mono">{systemService.servicePath}</code>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Available Entities</CardTitle>
                  <CardDescription>
                    {resolvedEntities.length} entities available
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshEntities}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {resolvedEntities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {resolvedEntities.map((entity, index) => {
                    const entityUrl = `${fullEndpoint}/${entity}?$format=json`;
                    return (
                      <div
                        key={index}
                        className="group flex items-center justify-between gap-1 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <code className="text-sm font-mono truncate" title={entity}>
                            {entity}
                          </code>
                        </div>
                        <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(entityUrl, `${entity} URL`)}
                            title="Copy URL"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary hover:text-primary"
                            onClick={() => handleTestEntity(entity)}
                            title="Test this entity"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Database className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No entities discovered</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Click "Refresh" to fetch available entities from the service metadata endpoint
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <ApiTestTab
            instanceServiceId={instanceService.id}
            entities={resolvedEntities}
            fullEndpoint={fullEndpoint}
            initialEntity={testEntity}
          />
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Authentication</CardTitle>
                  <CardDescription>{authSource}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Key className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{getAuthLabel()}</p>
                  {effectiveAuthType === 'basic' && (
                    <p className="text-sm text-muted-foreground">Username & Password</p>
                  )}
                  {effectiveAuthType === 'oauth2' && (
                    <p className="text-sm text-muted-foreground">
                      {instanceService.authConfig?.tokenUrl || instance.authConfig?.tokenUrl || 'OAuth 2.0 Client Credentials'}
                    </p>
                  )}
                  {effectiveAuthType === 'api_key' && (
                    <p className="text-sm text-muted-foreground">
                      Header: {instanceService.authConfig?.headerName || instance.authConfig?.headerName || 'X-API-Key'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <InstanceServiceConfigDialog
        instanceService={instanceService}
        systemService={systemService}
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
      />
    </div>
  );
}
