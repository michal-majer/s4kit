'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search, Loader2, Database, Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERMISSIONS = ['read', 'create', 'update', 'delete'] as const;

const PERMISSION_ICONS = {
  read: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
} as const;

export type PermissionPreset = 'read' | 'read_write' | 'full' | 'custom';

export const PRESET_CONFIG: Record<PermissionPreset, { label: string; shortLabel: string; permissions: string[]; color: string }> = {
  read: { label: 'Read Only', shortLabel: 'Read', permissions: ['read'], color: 'bg-blue-100 text-blue-700 border-blue-200' },
  read_write: { label: 'Read & Write', shortLabel: 'Read/Write', permissions: ['read', 'create', 'update'], color: 'bg-amber-100 text-amber-700 border-amber-200' },
  full: { label: 'Full Access', shortLabel: 'Full', permissions: ['read', 'create', 'update', 'delete'], color: 'bg-red-100 text-red-700 border-red-200' },
  custom: { label: 'Custom', shortLabel: 'Custom', permissions: [], color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export const ENV_COLORS: Record<string, { bg: string; text: string }> = {
  sandbox: { bg: 'bg-slate-100', text: 'text-slate-700' },
  dev: { bg: 'bg-blue-100', text: 'text-blue-700' },
  quality: { bg: 'bg-amber-100', text: 'text-amber-700' },
  preprod: { bg: 'bg-orange-100', text: 'text-orange-700' },
  production: { bg: 'bg-red-100', text: 'text-red-700' },
};

// Legacy export for backward compatibility
export const ENV_BADGES: Record<string, string> = {
  sandbox: 'bg-slate-100 text-slate-700',
  dev: 'bg-blue-100 text-blue-700',
  quality: 'bg-amber-100 text-amber-700',
  preprod: 'bg-orange-100 text-orange-700',
  production: 'bg-red-100 text-red-700',
};

export interface AccessGrant {
  id?: string;
  instanceServiceId: string;
  instanceService?: {
    id?: string;
    instanceId?: string;
    systemServiceId?: string;
    instance?: { id?: string; environment?: string; systemId?: string };
    systemService?: { id?: string; name?: string; alias?: string; entities?: string[] };
    entities?: string[];
  };
  permissions: Record<string, string[]>;
  preset?: PermissionPreset;
  combinationKey?: string;
  showEntities?: boolean;
  entityFilter?: string;
  instance?: { id?: string; environment?: string; systemId?: string };
  systemService?: { id?: string; name?: string; alias?: string; entities?: string[] };
  systemName?: string;
}

interface AccessGrantCardProps {
  grant: AccessGrant;
  systemName: string;
  onPresetChange: (preset: PermissionPreset) => void;
  onToggleEntities: () => void;
  onSetEntityFilter: (filter: string) => void;
  onTogglePermission: (entity: string, perm: string) => void;
  isSaving?: boolean;
}

export function AccessGrantCard({
  grant,
  systemName,
  onPresetChange,
  onToggleEntities,
  onSetEntityFilter,
  onTogglePermission,
  isSaving,
}: AccessGrantCardProps) {
  const entities = grant.systemService?.entities
    || grant.instanceService?.entities
    || grant.instanceService?.systemService?.entities
    || [];
  const entityCount = entities.length;
  const env = grant.instance?.environment
    || grant.instanceService?.instance?.environment
    || 'unknown';
  const serviceName = grant.systemService?.name
    || grant.instanceService?.systemService?.name
    || 'Unknown Service';

  const filteredEntities = useMemo(() => {
    if (!grant.entityFilter) return entities;
    const lower = grant.entityFilter.toLowerCase();
    return entities.filter(e => e.toLowerCase().includes(lower));
  }, [entities, grant.entityFilter]);

  const hasWildcard = !!grant.permissions['*']?.length;
  const specificEntityCount = Object.keys(grant.permissions).filter(k => k !== '*').length;
  const presets: PermissionPreset[] = ['read', 'read_write', 'full'];
  const envColors = ENV_COLORS[env] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <div className={cn(
      "border rounded-xl bg-card overflow-hidden transition-opacity",
      isSaving && "opacity-60"
    )}>
      {/* Compact Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg shrink-0", envColors.bg)}>
            <Database className={cn("h-4 w-4", envColors.text)} />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{serviceName}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className={cn("uppercase font-semibold", envColors.text)}>{env}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>{systemName}</span>
              <span className="text-muted-foreground/50">|</span>
              <span>{entityCount} entities</span>
            </div>
          </div>
        </div>

        {/* Saving indicator */}
        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Saving</span>
          </div>
        )}
      </div>

      {/* Permission Presets - Segmented Control Style */}
      <div className="px-4 pb-3">
        <div className="inline-flex p-1 bg-muted/60 rounded-xl">
          {presets.map(preset => {
            const isActive = grant.preset === preset && hasWildcard;
            return (
              <button
                key={preset}
                onClick={() => onPresetChange(preset)}
                className={cn(
                  "px-5 py-2 text-sm font-semibold rounded-lg transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {PRESET_CONFIG[preset].shortLabel}
              </button>
            );
          })}
        </div>

        {!hasWildcard && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Custom: {specificEntityCount} {specificEntityCount === 1 ? 'entity' : 'entities'}
            </Badge>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => onPresetChange('read')}
            >
              Reset to Read Only
            </Button>
          </div>
        )}
      </div>

      {/* Entity Configuration (Collapsible) */}
      {entityCount > 0 && (
        <Collapsible open={grant.showEntities} onOpenChange={onToggleEntities}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-2.5 flex items-center justify-between text-sm border-t bg-muted/20 hover:bg-muted/40 transition-colors">
              <span className="text-muted-foreground">
                {hasWildcard ? 'Configure entity overrides' : 'Select allowed entities'}
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                grant.showEntities && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-3 space-y-3 border-t">
              {!hasWildcard && (
                <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                  Select entities to grant access. Unselected entities will be blocked.
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities..."
                  value={grant.entityFilter || ''}
                  onChange={(e) => onSetEntityFilter(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_repeat(4,3rem)] gap-0 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <div className="px-3 py-2">Entity</div>
                  {PERMISSIONS.map(perm => {
                    const Icon = PERMISSION_ICONS[perm];
                    return (
                      <div key={perm} className="flex items-center justify-center py-2" title={perm}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    );
                  })}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="divide-y">
                    {filteredEntities.map((entity) => {
                      const entityPerms = grant.permissions[entity] || [];
                      const hasEntityPerms = entityPerms.length > 0;
                      return (
                        <div
                          key={entity}
                          className={cn(
                            "grid grid-cols-[1fr_repeat(4,3rem)] gap-0 items-center hover:bg-muted/30",
                            hasEntityPerms && !hasWildcard && "bg-purple-50/50"
                          )}
                        >
                          <div className="px-3 py-2 min-w-0">
                            <span className="font-mono text-xs truncate block" title={entity}>
                              {entity}
                            </span>
                          </div>
                          {PERMISSIONS.map(perm => (
                            <div key={perm} className="flex items-center justify-center py-2">
                              <Checkbox
                                checked={entityPerms.includes(perm)}
                                onCheckedChange={() => onTogglePermission(entity, perm)}
                                className="h-4 w-4"
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  {filteredEntities.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      No entities found
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {filteredEntities.length} of {entityCount} entities
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
