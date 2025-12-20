'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, System, Instance, SystemService, InstanceService, InstanceEnvironment } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, Database, Settings, Globe, Key, CheckCircle2, Info } from 'lucide-react';
import Link from 'next/link';
import { ServiceVerificationStatus } from './service-verification-status';
import { InstanceServiceConfigDialog } from './instance-service-config-dialog';

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

interface InstanceServiceDetailsProps {
  instanceService: InstanceService;
  systemService: SystemService;
  instance: Instance;
  system: System;
}

export function InstanceServiceDetails({
  instanceService,
  systemService,
  instance,
  system,
}: InstanceServiceDetailsProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

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

  // Resolve values (use override if exists, otherwise use system defaults)
  const resolvedServicePath = instanceService.servicePathOverride || systemService.servicePath;
  const resolvedEntities = instanceService.entities || systemService.entities || [];
  const hasPathOverride = !!instanceService.servicePathOverride;
  const hasAuthOverride = instanceService.hasAuthOverride || false;
  const hasEntityOverride = instanceService.hasEntityOverride || false;

  // Determine effective auth type (instanceService > systemService > instance)
  const effectiveAuthType = instanceService.authType || systemService.authType || instance.authType;
  const authSource = instanceService.authType
    ? 'Instance Service'
    : systemService.authType
    ? 'System Service'
    : 'Instance';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/systems/${system.id}?instance=${instance.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {system.name}
          </Link>
        </Button>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-3">
                {systemService.name}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="font-mono">
                  {systemService.alias}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${envColors[instance.environment]}`} />
                  <span className="text-sm text-muted-foreground">
                    {envLabels[instance.environment]}
                  </span>
                </div>
                <ServiceVerificationStatus
                  status={instanceService.verificationStatus}
                  lastVerifiedAt={instanceService.lastVerifiedAt}
                  entityCount={instanceService.entityCount}
                  error={instanceService.verificationError}
                />
              </div>
              {systemService.description && (
                <p className="text-sm text-muted-foreground">{systemService.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button
                variant="outline"
                onClick={handleRefreshEntities}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
          <CardDescription>
            Service configuration for this instance. Overrides are highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Path */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Service Path
              </label>
              {hasPathOverride ? (
                <Badge variant="default" className="text-xs">Override</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Inherited</Badge>
              )}
            </div>
            <div className={`p-3 rounded-lg border ${hasPathOverride ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900' : 'bg-muted/30'}`}>
              <code className="text-sm font-mono">{resolvedServicePath}</code>
              {hasPathOverride && (
                <p className="text-xs text-muted-foreground mt-1">
                  Default: {systemService.servicePath}
                </p>
              )}
            </div>
          </div>

          {/* Instance URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Instance URL
            </label>
            <div className="p-3 rounded-lg border bg-muted/30">
              <code className="text-sm font-mono">{instance.baseUrl}</code>
            </div>
          </div>

          {/* Full URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Full Endpoint
            </label>
            <div className="p-3 rounded-lg border bg-muted/30">
              <code className="text-sm font-mono break-all">
                {instance.baseUrl}{resolvedServicePath}
              </code>
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Key className="h-4 w-4" />
                Authentication
              </label>
              {hasAuthOverride ? (
                <Badge variant="default" className="text-xs">Override</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">From {authSource}</Badge>
              )}
            </div>
            <div className={`p-3 rounded-lg border ${hasAuthOverride ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {effectiveAuthType || 'None'}
                </Badge>
                {effectiveAuthType === 'basic' && (
                  <span className="text-sm text-muted-foreground">Username/Password</span>
                )}
                {effectiveAuthType === 'oauth2' && (
                  <span className="text-sm text-muted-foreground">
                    {instanceService.authConfig?.tokenUrl || instance.authConfig?.tokenUrl || 'Token URL configured'}
                  </span>
                )}
                {effectiveAuthType === 'api_key' && (
                  <span className="text-sm text-muted-foreground">
                    Header: {instanceService.authConfig?.headerName || instance.authConfig?.headerName || 'X-API-Key'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entities Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Entities
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {resolvedEntities.length} entities available
                {hasEntityOverride ? (
                  <Badge variant="default" className="text-xs">Override</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Inherited from service</Badge>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshEntities}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Sync from Instance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {resolvedEntities.length > 0 ? (
            <div className="border rounded-lg p-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {resolvedEntities.map((entity, index) => (
                  <code key={index} className="text-sm font-mono text-muted-foreground truncate">
                    {entity}
                  </code>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No entities found</p>
              <p className="text-sm mt-1">Click "Sync from Instance" to fetch entities from the service metadata</p>
            </div>
          )}
        </CardContent>
      </Card>

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
