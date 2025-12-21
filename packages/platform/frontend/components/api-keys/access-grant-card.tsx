'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Search, Settings2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERMISSIONS = ['read', 'create', 'update', 'delete'] as const;

export type PermissionPreset = 'read' | 'read_write' | 'full' | 'custom';

export const PRESET_CONFIG: Record<PermissionPreset, { label: string; description: string; permissions: string[]; color: string }> = {
  read: { label: 'Read Only', description: 'All entities', permissions: ['read'], color: 'bg-blue-100 text-blue-700 border-blue-200' },
  read_write: { label: 'Read & Write', description: 'All entities', permissions: ['read', 'create', 'update'], color: 'bg-amber-100 text-amber-700 border-amber-200' },
  full: { label: 'Full Access', description: 'All entities', permissions: ['read', 'create', 'update', 'delete'], color: 'bg-red-100 text-red-700 border-red-200' },
  custom: { label: 'Custom', description: 'Specific entities', permissions: [], color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export const ENV_BADGES: Record<string, string> = {
  dev: 'bg-blue-100 text-blue-700',
  quality: 'bg-amber-100 text-amber-700',
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
  // Edit page uses these directly on the grant
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
  // Handle both grant structures (create page vs edit page)
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

  return (
    <div className={cn("border rounded-lg bg-card overflow-hidden relative", isSaving && "opacity-70")}>
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-full">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      )}
      {/* Header */}
      <div className="px-4 py-3 bg-muted/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="outline" className={cn("shrink-0 text-xs", ENV_BADGES[env] || 'bg-gray-100 text-gray-700')}>
            {env.toUpperCase()}
          </Badge>
          <div className="min-w-0">
            <div className="font-medium truncate">{serviceName}</div>
            <div className="text-xs text-muted-foreground truncate">
              {systemName} • {entityCount} entities available
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", PRESET_CONFIG[grant.preset || 'read'].color)}>
          {hasWildcard ? `${PRESET_CONFIG[grant.preset || 'read'].label} (all)` : `Custom (${specificEntityCount})`}
        </Badge>
      </div>

      {/* Mode selection */}
      <div className="px-4 py-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Access all {entityCount} entities:</span>
          {presets.map(preset => (
            <Button
              key={preset}
              variant={grant.preset === preset && hasWildcard ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onPresetChange(preset)}
            >
              {PRESET_CONFIG[preset].label}
            </Button>
          ))}
        </div>

        {hasWildcard && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-600">All {entityCount} entities can be accessed.</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-purple-600"
              onClick={() => onPresetChange('custom')}
            >
              Restrict to specific entities
            </Button>
          </div>
        )}

        {!hasWildcard && (
          <div className="text-xs text-muted-foreground">
            Only {specificEntityCount} specific {specificEntityCount === 1 ? 'entity' : 'entities'} can be accessed.
            {specificEntityCount === 0 && <span className="text-red-500 ml-1">No access configured!</span>}
          </div>
        )}
      </div>

      {/* Entity-level permissions (collapsible) */}
      {entityCount > 0 && (
        <Collapsible open={grant.showEntities} onOpenChange={onToggleEntities}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
              {grant.showEntities ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Settings2 className="h-3.5 w-3.5" />
              {hasWildcard ? 'Add specific entity overrides' : 'Select entities to allow'}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-3 space-y-2">
              {!hasWildcard && (
                <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded">
                  Check the entities you want to allow access to. Unchecked entities will be blocked.
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter entities..."
                  value={grant.entityFilter || ''}
                  onChange={(e) => onSetEntityFilter(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>

              <div className="border rounded-md">
                <ScrollArea className="h-[250px]">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-background sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="text-left p-2 font-medium text-xs">Entity</th>
                        {PERMISSIONS.map(perm => (
                          <th key={perm} className="text-center p-2 font-medium text-xs w-16 capitalize">{perm}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredEntities.map((entity) => {
                        const entityPerms = grant.permissions[entity] || [];
                        const hasEntityPerms = entityPerms.length > 0;
                        return (
                          <tr key={entity} className={cn("hover:bg-muted/20", hasEntityPerms && "bg-purple-50/50")}>
                            <td className="p-2" title={entity}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs truncate">{entity}</span>
                                {hasEntityPerms && !hasWildcard && (
                                  <Badge variant="outline" className="shrink-0 text-[9px] px-1 py-0 bg-purple-100 text-purple-700">allowed</Badge>
                                )}
                              </div>
                            </td>
                            {PERMISSIONS.map(perm => (
                              <td key={perm} className="text-center p-1 w-16">
                                <Checkbox
                                  checked={entityPerms.includes(perm)}
                                  onCheckedChange={() => onTogglePermission(entity, perm)}
                                  className="h-4 w-4"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredEntities.length === 0 && (
                    <div className="py-4 text-center text-muted-foreground text-sm">
                      No entities match filter
                    </div>
                  )}
                </ScrollArea>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {filteredEntities.length} of {entityCount} entities
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
