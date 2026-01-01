'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { api, ApiKey } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  RefreshCw,
  ShieldOff,
  Clock,
  Key,
  Calendar,
  Activity,
  Gauge,
  ChevronDown,
  ChevronRight,
  Server,
  Loader2,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RotateKeyDialog } from './rotate-key-dialog';
import { RevokeKeyDialog } from './revoke-key-dialog';
import { PRESET_CONFIG, ENV_BADGES, type PermissionPreset } from './access-grant-card';

type KeyStatus = 'active' | 'revoked' | 'expired';

function getKeyStatus(key: ApiKey): KeyStatus {
  if (key.revoked) return 'revoked';
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return 'expired';
  return 'active';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const futureDays = Math.abs(diffDays);
    if (futureDays === 0) return 'Today';
    if (futureDays === 1) return 'Tomorrow';
    if (futureDays < 7) return `in ${futureDays} days`;
    return formatDate(dateString);
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function detectPreset(permissions: Record<string, string[]>): PermissionPreset {
  const defaultPerms = permissions['*'] || [];
  if (defaultPerms.length === 0) return 'custom';
  const sorted = [...defaultPerms].sort().join(',');
  if (sorted === 'read') return 'read';
  if (sorted === 'create,read,update') return 'read_write';
  if (sorted === 'create,delete,read,update') return 'full';
  return 'custom';
}

interface AccessGrantWithDetails {
  id: string;
  instanceServiceId: string;
  permissions: Record<string, string[]>;
  instance?: { id: string; environment: string } | null;
  systemService?: { id: string; name: string; alias: string; entities?: string[] } | null;
  system?: { id: string; name: string } | null;
}

interface ApiKeyViewPageProps {
  apiKey: ApiKey;
}

export function ApiKeyViewPage({ apiKey }: ApiKeyViewPageProps) {
  const router = useRouter();
  const [rotateOpen, setRotateOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [accessGrants, setAccessGrants] = useState<AccessGrantWithDetails[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [expandedGrants, setExpandedGrants] = useState<Set<string>>(new Set());
  const [generatingTypes, setGeneratingTypes] = useState(false);

  const handleDownloadTypes = async () => {
    setGeneratingTypes(true);
    try {
      const types = await api.apiKeys.getTypes(apiKey.id);

      // Create and download file
      const blob = new Blob([types], { type: 'application/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `s4kit-types-${apiKey.name.toLowerCase().replace(/\s+/g, '-')}.d.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('TypeScript types downloaded');
    } catch (error) {
      toast.error('Failed to generate types: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setGeneratingTypes(false);
    }
  };

  const status = getKeyStatus(apiKey);
  const isActive = status === 'active';

  useEffect(() => {
    api.apiKeys.getAccess(apiKey.id)
      .then(grants => setAccessGrants(grants))
      .catch(() => toast.error('Failed to load access grants'))
      .finally(() => setLoadingGrants(false));
  }, [apiKey.id]);

  const toggleGrant = (grantId: string) => {
    setExpandedGrants(prev => {
      const next = new Set(prev);
      if (next.has(grantId)) {
        next.delete(grantId);
      } else {
        next.add(grantId);
      }
      return next;
    });
  };

  const statusBadge = useMemo(() => {
    if (status === 'revoked') {
      return (
        <Badge variant="destructive" className="gap-1">
          <ShieldOff className="h-3 w-3" />
          Revoked
        </Badge>
      );
    }
    if (status === 'expired') {
      return (
        <Badge variant="secondary" className="gap-1 text-amber-600 border-amber-200 bg-amber-50">
          <Clock className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
        Active
      </Badge>
    );
  }, [status]);

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/api-keys">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{apiKey.name}</h1>
              {statusBadge}
            </div>
            {apiKey.description && (
              <p className="text-muted-foreground mt-1">{apiKey.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              <Button
                variant="outline"
                onClick={handleDownloadTypes}
                disabled={generatingTypes}
              >
                {generatingTypes ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileCode className="mr-2 h-4 w-4" />
                )}
                Generate Types
              </Button>
              <Button variant="outline" onClick={() => setRotateOpen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rotate
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setRevokeOpen(true)}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Revoke
              </Button>
              <Button asChild>
                <Link href={`/api-keys/${apiKey.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Revocation Info */}
      {apiKey.revoked && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <ShieldOff className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Key Revoked</h3>
              <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                {apiKey.revokedAt && (
                  <p>Revoked on {formatDate(apiKey.revokedAt)}</p>
                )}
                {apiKey.revokedReason && (
                  <p>Reason: {apiKey.revokedReason}</p>
                )}
                {!apiKey.revokedReason && (
                  <p>No reason provided</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Key Display */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-muted-foreground" />
          <code className="text-sm bg-muted px-3 py-1.5 rounded-md font-mono">
            {apiKey.displayKey}
          </code>
        </div>
      </Card>

      {/* Details Grid - SAP TechEd Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Created */}
        <div className="group relative overflow-hidden rounded-3xl border-0 p-6 bg-[oklch(0.94_0.05_300)] dark:bg-[oklch(0.28_0.08_290)] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.08_290)] dark:text-[oklch(0.75_0.05_290)]">
                Created
              </p>
              <p className="text-xl font-bold tracking-tight text-[oklch(0.25_0.1_290)] dark:text-white">
                {formatDate(apiKey.createdAt)}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl p-3.5 bg-[oklch(0.85_0.1_290)] dark:bg-[oklch(0.4_0.12_290)] transition-all duration-300 group-hover:scale-110">
              <Calendar className="h-6 w-6 text-[oklch(0.45_0.2_290)] dark:text-[oklch(0.85_0.15_290)]" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Last Used */}
        <div className="group relative overflow-hidden rounded-3xl border-0 p-6 bg-[oklch(0.94_0.06_175)] dark:bg-[oklch(0.28_0.08_175)] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-[oklch(0.4_0.08_175)] dark:text-[oklch(0.75_0.08_175)]">
                Last Used
              </p>
              <p className="text-xl font-bold tracking-tight text-[oklch(0.2_0.1_175)] dark:text-white">
                {apiKey.lastUsedAt ? formatRelativeTime(apiKey.lastUsedAt) : 'Never'}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl p-3.5 bg-[oklch(0.85_0.12_175)] dark:bg-[oklch(0.4_0.14_175)] transition-all duration-300 group-hover:scale-110">
              <Activity className="h-6 w-6 text-[oklch(0.4_0.18_175)] dark:text-[oklch(0.85_0.18_175)]" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Expires */}
        <div className="group relative overflow-hidden rounded-3xl border-0 p-6 bg-[oklch(0.92_0.08_280)] dark:bg-[oklch(0.26_0.1_280)] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-[oklch(0.42_0.1_280)] dark:text-[oklch(0.72_0.06_280)]">
                Expires
              </p>
              <p className={cn(
                "text-xl font-bold tracking-tight text-[oklch(0.22_0.12_280)] dark:text-white",
                apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() && "text-red-600 dark:text-red-400"
              )}>
                {apiKey.expiresAt ? formatRelativeTime(apiKey.expiresAt) : 'Never'}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl p-3.5 bg-[oklch(0.82_0.14_280)] dark:bg-[oklch(0.38_0.14_280)] transition-all duration-300 group-hover:scale-110">
              <Clock className="h-6 w-6 text-[oklch(0.4_0.2_280)] dark:text-[oklch(0.85_0.15_280)]" strokeWidth={1.75} />
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="group relative overflow-hidden rounded-3xl border-0 p-6 bg-[oklch(0.94_0.06_340)] dark:bg-[oklch(0.28_0.1_340)] shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.1_340)] dark:text-[oklch(0.75_0.08_340)]">
                Rate Limits
              </p>
              <p className="text-xl font-bold tracking-tight text-[oklch(0.25_0.12_340)] dark:text-white">
                {apiKey.rateLimitPerMinute}/min, {apiKey.rateLimitPerDay}/day
              </p>
            </div>
            <div className="shrink-0 rounded-2xl p-3.5 bg-[oklch(0.85_0.12_340)] dark:bg-[oklch(0.4_0.14_340)] transition-all duration-300 group-hover:scale-110">
              <Gauge className="h-6 w-6 text-[oklch(0.45_0.2_340)] dark:text-[oklch(0.85_0.15_340)]" strokeWidth={1.75} />
            </div>
          </div>
        </div>
      </div>

      {/* Services & Permissions */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Services & Permissions</h2>
          <Badge variant="secondary" className="ml-2">
            {accessGrants.length} {accessGrants.length === 1 ? 'service' : 'services'}
          </Badge>
        </div>

        {loadingGrants ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accessGrants.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No services configured for this API key.
          </div>
        ) : (
          <div className="space-y-3">
            {accessGrants.map((grant) => {
              const preset = detectPreset(grant.permissions);
              const env = grant.instance?.environment || 'unknown';
              const systemName = grant.system?.name || 'System';
              const serviceName = grant.systemService?.name || 'Unknown Service';
              const availableEntities = grant.systemService?.entities;
              const availableCount = Array.isArray(availableEntities) ? availableEntities.length : null;
              const hasWildcard = !!grant.permissions['*']?.length;
              const specificPermissions = Object.entries(grant.permissions).filter(
                ([key]) => key !== '*'
              );
              const isExpanded = expandedGrants.has(grant.id);

              return (
                <div key={grant.id} className="border rounded-lg overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleGrant(grant.id)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={cn('text-xs', ENV_BADGES[env] || 'bg-gray-100 text-gray-700')}
                          >
                            {env.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">{systemName}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-medium">{serviceName}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {hasWildcard
                              ? availableCount !== null
                                ? `(all ${availableCount} entities)`
                                : '(all entities)'
                              : specificPermissions.length > 0
                                ? `(${specificPermissions.length} entities)`
                                : '(no entities)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(PRESET_CONFIG[preset].color)}
                          >
                            {PRESET_CONFIG[preset].label}
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="pt-3 space-y-2">
                          {grant.permissions['*'] && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Default for all entities:</span>{' '}
                              <span className="font-medium">
                                {grant.permissions['*'].join(', ')}
                              </span>
                            </div>
                          )}
                          {specificPermissions.length > 0 && (
                            <div className="mt-3">
                              <div className="text-sm text-muted-foreground mb-2">
                                {grant.permissions['*'] ? 'Entity overrides:' : 'Entity permissions:'}
                              </div>
                              <div className="space-y-1">
                                {specificPermissions.map(([entity, perms]) => (
                                  <div
                                    key={entity}
                                    className="flex items-center justify-between text-sm bg-background px-3 py-1.5 rounded"
                                  >
                                    <code className="font-mono text-xs">{entity}</code>
                                    <span className="text-muted-foreground">
                                      {perms.join(', ')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {!grant.permissions['*'] && specificPermissions.length === 0 && (
                            <div className="text-sm text-amber-600">
                              No permissions configured
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dialogs */}
      <RotateKeyDialog
        apiKey={apiKey}
        open={rotateOpen}
        onOpenChange={setRotateOpen}
        onSuccess={() => {
          setRotateOpen(false);
          router.refresh();
        }}
      />
      <RevokeKeyDialog
        apiKey={apiKey}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onSuccess={() => {
          setRevokeOpen(false);
          router.push('/api-keys');
          router.refresh();
        }}
      />
    </div>
  );
}
