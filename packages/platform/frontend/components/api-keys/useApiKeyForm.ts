'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { api, ApiKey, InstanceService, System, Instance, SystemService, LogLevel } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AccessGrant, PermissionPreset, PRESET_CONFIG } from './access-grant-card';

export interface AliasConflict {
  alias: string;
  systemCount: number;
  systems: string[];
}

export interface InstanceServiceOption {
  instanceId: string;
  systemServiceId: string;
  instance: Instance;
  systemService: SystemService;
  existingInstanceServiceId?: string;
}

interface UseApiKeyFormProps {
  mode: 'create' | 'edit';
  apiKey?: ApiKey;
  // For create mode - passed from server
  instanceServices?: InstanceService[];
  systems?: System[];
  instances?: Instance[];
  systemServices?: SystemService[];
}

/**
 * Validates that grants don't have duplicate aliases across different systems
 */
export function validateServiceAliases(
  grants: AccessGrant[],
  systemServices?: SystemService[],
  systems?: System[]
): AliasConflict[] {
  const conflicts: AliasConflict[] = [];
  const aliasMap = new Map<string, Set<string>>();

  for (const grant of grants) {
    const grantSystemService = grant.systemService || grant.instanceService?.systemService;
    if (!grantSystemService) continue;

    const alias = grantSystemService.alias;
    if (!alias) continue;

    let systemId: string | undefined;

    // Try to get systemId from the full SystemService (has systemId)
    if ('systemId' in grantSystemService && (grantSystemService as any).systemId) {
      systemId = (grantSystemService as any).systemId;
    }

    // Look up systemId from systemServices array using the service id
    if (!systemId && systemServices && grantSystemService.id) {
      const fullSystemService = systemServices.find(ss => ss.id === grantSystemService.id);
      if (fullSystemService) {
        systemId = fullSystemService.systemId;
      }
    }

    // Look up from instanceService.systemServiceId
    if (!systemId && systemServices && grant.instanceService?.systemServiceId) {
      const fullSystemService = systemServices.find(ss => ss.id === grant.instanceService!.systemServiceId);
      if (fullSystemService) {
        systemId = fullSystemService.systemId;
      }
    }

    // Fallback: try instance.systemId
    if (!systemId && grant.instanceService?.instance?.systemId) {
      systemId = grant.instanceService.instance.systemId;
    }
    if (!systemId && grant.instance?.systemId) {
      systemId = grant.instance.systemId;
    }

    // Fallback: look up by systemName
    if (!systemId && grant.systemName && systems) {
      systemId = systems.find(s => s.name === grant.systemName)?.id;
    }

    if (!systemId) continue;

    if (!aliasMap.has(alias)) {
      aliasMap.set(alias, new Set());
    }
    aliasMap.get(alias)!.add(systemId);
  }

  for (const [alias, systemIds] of aliasMap) {
    if (systemIds.size > 1) {
      conflicts.push({
        alias,
        systemCount: systemIds.size,
        systems: Array.from(systemIds)
      });
    }
  }

  return conflicts;
}

function detectPreset(permissions: Record<string, string[]>): PermissionPreset {
  const defaultPerms = permissions['*'] || [];
  const hasWildcard = defaultPerms.length > 0;

  if (!hasWildcard) return 'custom';

  const sortedPerms = [...defaultPerms].sort().join(',');
  if (sortedPerms === 'read') return 'read';
  if (sortedPerms === 'create,read,update') return 'read_write';
  if (sortedPerms === 'create,delete,read,update') return 'full';

  return 'custom';
}

export function useApiKeyForm({
  mode,
  apiKey,
  instanceServices: initialInstanceServices,
  systems: initialSystems,
  instances: initialInstances,
  systemServices: initialSystemServices,
}: UseApiKeyFormProps) {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  // Data state (loaded from API in edit mode, passed as props in create mode)
  const [instanceServices, setInstanceServices] = useState<InstanceService[]>(initialInstanceServices || []);
  const [systems, setSystems] = useState<System[]>(initialSystems || []);
  const [instances, setInstances] = useState<Instance[]>(initialInstances || []);
  const [systemServices, setSystemServices] = useState<SystemService[]>(initialSystemServices || []);
  const [dataLoaded, setDataLoaded] = useState(!isEditMode);

  // Form state
  const [loading, setLoading] = useState(false);
  const [creatingInstanceService, setCreatingInstanceService] = useState(false);
  const [savingGrant, setSavingGrant] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [name, setName] = useState(apiKey?.name || '');
  const [description, setDescription] = useState(apiKey?.description || '');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(apiKey?.rateLimitPerMinute || 60);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(apiKey?.rateLimitPerDay || 10000);
  const [logLevel, setLogLevel] = useState<LogLevel | ''>(apiKey?.logLevel || '');
  const [expiresAt, setExpiresAt] = useState(
    apiKey?.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : ''
  );

  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [aliasConflicts, setAliasConflicts] = useState<AliasConflict[]>([]);

  // Load data for edit mode
  useEffect(() => {
    if (!isEditMode || !apiKey) return;

    Promise.all([
      api.instanceServices.list(),
      api.systems.list(),
      api.systemServices.list(),
      api.instances.list(),
      api.apiKeys.getAccess(apiKey.id)
    ]).then(([is, sys, sysServices, inst, grants]) => {
      setInstanceServices(is);
      setSystems(sys);
      setSystemServices(sysServices);
      setInstances(inst);

      setAccessGrants(grants.map((g: any) => {
        const instService = is.find(i => i.id === g.instanceServiceId);
        const sysService = sysServices.find(s => s.id === instService?.systemServiceId);
        const system = sys.find(s => s.id === sysService?.systemId);

        return {
          id: g.id,
          instanceServiceId: g.instanceServiceId,
          permissions: g.permissions,
          preset: detectPreset(g.permissions),
          instanceService: instService,
          instance: g.instance || instService?.instance,
          systemService: g.systemService ? {
            ...g.systemService,
            entities: g.systemService.entities || instService?.systemService?.entities
          } : instService?.systemService,
          systemName: system?.name || 'System',
          showEntities: false,
          entityFilter: ''
        };
      }));
      setDataLoaded(true);
    }).catch(() => {
      toast.error('Failed to load data');
    });
  }, [isEditMode, apiKey?.id]);

  // Sync apiKey prop changes (for edit mode)
  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name);
      setDescription(apiKey.description || '');
      setRateLimitPerMinute(apiKey.rateLimitPerMinute);
      setRateLimitPerDay(apiKey.rateLimitPerDay);
      setLogLevel(apiKey.logLevel || '');
      setExpiresAt(apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : '');
    }
  }, [apiKey]);

  // Compute available instance-service combinations (for create mode selector)
  const availableCombinations = useMemo(() => {
    const combinations: InstanceServiceOption[] = [];
    const existingMap = new Map<string, string>();

    instanceServices.forEach(is => {
      if (is.instanceId && is.systemServiceId) {
        existingMap.set(`${is.instanceId}:${is.systemServiceId}`, is.id);
      }
    });

    instances.forEach(instance => {
      systemServices.forEach(systemService => {
        if (instance.systemId === systemService.systemId) {
          const key = `${instance.id}:${systemService.id}`;
          const existingId = existingMap.get(key);

          combinations.push({
            instanceId: instance.id,
            systemServiceId: systemService.id,
            instance,
            systemService,
            existingInstanceServiceId: existingId
          });
        }
      });
    });

    return combinations;
  }, [instances, systemServices, instanceServices]);

  // Build selector options - show all combinations in both modes
  const selectorOptions = useMemo(() => {
    return availableCombinations.map(opt => {
      const system = systems.find(s => s.id === opt.instance.systemId);
      return {
        id: `${opt.instanceId}:${opt.systemServiceId}`,
        label: `[${opt.instance.environment}] ${system?.name || 'System'} - ${opt.systemService.name}`,
        environment: opt.instance.environment,
        systemName: system?.name || 'System',
        serviceName: opt.systemService.name,
        isExisting: !!opt.existingInstanceServiceId
      };
    });
  }, [availableCombinations, systems]);

  // Get currently selected keys for the selector (always use combinationKey format)
  const currentSelectedKeys = useMemo(() => {
    return accessGrants
      .map(g => {
        // If combinationKey exists, use it
        if (g.combinationKey) return g.combinationKey;
        // For edit mode grants, derive from instanceService
        if (g.instanceService?.instanceId && g.instanceService?.systemServiceId) {
          return `${g.instanceService.instanceId}:${g.instanceService.systemServiceId}`;
        }
        return undefined;
      })
      .filter((key): key is string => key !== undefined);
  }, [accessGrants]);

  // Validate and update conflicts
  const updateConflicts = useCallback((grants: AccessGrant[]) => {
    const conflicts = validateServiceAliases(grants, systemServices, systems);
    setAliasConflicts(conflicts);
    return conflicts;
  }, [systemServices, systems]);

  // Add access grant (works for both create and edit modes)
  const addAccessGrantCreate = async (combinationKey: string): Promise<string | null> => {
    const [instanceId, systemServiceId] = combinationKey.split(':');
    const combination = availableCombinations.find(
      c => c.instanceId === instanceId && c.systemServiceId === systemServiceId
    );

    if (!combination) {
      toast.error('Selected combination not found');
      return null;
    }

    try {
      let instanceServiceId: string;
      let instanceService: InstanceService;

      if (combination.existingInstanceServiceId) {
        instanceServiceId = combination.existingInstanceServiceId;
        instanceService = await api.instanceServices.get(instanceServiceId);
      } else {
        const newInstanceService = await api.instanceServices.create({
          instanceId: combination.instanceId,
          systemServiceId: combination.systemServiceId,
        });
        instanceServiceId = newInstanceService.id;
        instanceService = await api.instanceServices.get(instanceServiceId);

        if (!instanceService.instance || !instanceService.systemService) {
          instanceService.instance = {
            id: combination.instance.id,
            environment: combination.instance.environment,
          };
          instanceService.systemService = {
            id: combination.systemService.id,
            name: combination.systemService.name,
            alias: combination.systemService.alias,
            entities: combination.systemService.entities,
          };
        }
      }

      // In edit mode, also create the access grant via API
      let grantId: string | undefined;
      if (isEditMode && apiKey) {
        const newGrant = await api.apiKeys.addAccessGrant(apiKey.id, {
          instanceServiceId,
          permissions: { '*': ['read'] }
        });
        grantId = newGrant.id;
      }

      setAccessGrants(prevGrants => {
        if (prevGrants.some(g => g.instanceServiceId === instanceServiceId)) {
          return prevGrants;
        }
        const newGrants = [...prevGrants, {
          id: grantId,
          instanceServiceId,
          instanceService,
          permissions: { '*': ['read'] },
          preset: 'read' as PermissionPreset,
          combinationKey,
          showEntities: false,
          entityFilter: ''
        }];
        updateConflicts(newGrants);
        return newGrants;
      });

      return instanceServiceId;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add service');
      return null;
    }
  };

  // Handle multi-select change - unified logic for both modes using combinationKeys
  const handleMultiSelectChange = async (selectedKeys: string[]) => {
    setCreatingInstanceService(true);

    try {
      // Get current keys by deriving combinationKey from each grant
      const currentKeys = accessGrants.map(g => {
        if (g.combinationKey) return g.combinationKey;
        if (g.instanceService?.instanceId && g.instanceService?.systemServiceId) {
          return `${g.instanceService.instanceId}:${g.instanceService.systemServiceId}`;
        }
        return '';
      }).filter(Boolean);

      const toAdd = selectedKeys.filter(key => !currentKeys.includes(key));
      const toRemove = currentKeys.filter(key => !selectedKeys.includes(key));

      // Validate additions
      if (toAdd.length > 0) {
        const testGrants: AccessGrant[] = toAdd.map(key => {
          const [instanceId, systemServiceId] = key.split(':');
          const combo = availableCombinations.find(
            c => c.instanceId === instanceId && c.systemServiceId === systemServiceId
          );
          return {
            instanceServiceId: '',
            instanceService: {
              id: '',
              instanceId: combo?.instanceId || '',
              systemServiceId: combo?.systemServiceId || '',
              instance: combo?.instance,
              systemService: combo?.systemService,
            },
            permissions: {},
          };
        });

        const existingAfterRemove = accessGrants.filter(g => {
          const grantKey = g.combinationKey ||
            (g.instanceService?.instanceId && g.instanceService?.systemServiceId
              ? `${g.instanceService.instanceId}:${g.instanceService.systemServiceId}`
              : '');
          return !toRemove.includes(grantKey);
        });
        const conflicts = validateServiceAliases([...existingAfterRemove, ...testGrants], systemServices, systems);

        if (conflicts.length > 0) {
          const conflictList = conflicts.map(c => `"${c.alias}" (${c.systemCount} systems)`).join(', ');
          toast.error(`Cannot add: ${conflictList} - Service aliases must be unique across systems`, { duration: 5000 });
          return;
        }
      }

      // Remove deselected grants
      if (toRemove.length > 0) {
        if (isEditMode) {
          // In edit mode, delete via API
          for (const key of toRemove) {
            const grant = accessGrants.find(g => {
              const grantKey = g.combinationKey ||
                (g.instanceService?.instanceId && g.instanceService?.systemServiceId
                  ? `${g.instanceService.instanceId}:${g.instanceService.systemServiceId}`
                  : '');
              return grantKey === key;
            });
            if (grant?.id) {
              await api.apiKeys.deleteAccessGrant(apiKey!.id, grant.id);
            }
          }
        }
        // Update local state for both modes
        setAccessGrants(prev => prev.filter(g => {
          const grantKey = g.combinationKey ||
            (g.instanceService?.instanceId && g.instanceService?.systemServiceId
              ? `${g.instanceService.instanceId}:${g.instanceService.systemServiceId}`
              : '');
          return !toRemove.includes(grantKey);
        }));
      }

      // Add new grants
      for (const key of toAdd) {
        await addAccessGrantCreate(key);
      }

      if (toAdd.length > 0) {
        router.refresh();
      }
    } finally {
      setCreatingInstanceService(false);
    }
  };

  // Permission management
  const setPermissionPreset = async (grantIdentifier: string, preset: PermissionPreset) => {
    const grant = accessGrants.find(g =>
      g.id === grantIdentifier || g.instanceServiceId === grantIdentifier
    );
    if (!grant) return;

    let newPerms: Record<string, string[]>;

    if (preset === 'custom') {
      const { '*': _, ...specificPerms } = grant.permissions;
      newPerms = specificPerms;
    } else {
      const presetPerms = PRESET_CONFIG[preset].permissions;
      newPerms = { '*': presetPerms };
    }

    if (isEditMode && grant.id) {
      setSavingGrant(grant.id);
      try {
        await api.apiKeys.updateAccessGrant(apiKey!.id, grant.id, newPerms);
        setAccessGrants(prev => prev.map(g =>
          g.id === grant.id ? { ...g, preset, permissions: newPerms, showEntities: preset === 'custom' } : g
        ));
      } catch (error: any) {
        toast.error(error.message || 'Failed to update permissions');
      } finally {
        setSavingGrant(null);
      }
    } else {
      setAccessGrants(prev => prev.map(g =>
        g.instanceServiceId === grant.instanceServiceId
          ? { ...g, preset, permissions: newPerms, showEntities: preset === 'custom' }
          : g
      ));
    }
  };

  const toggleShowEntities = (grantIdentifier: string) => {
    setAccessGrants(prev => prev.map(g =>
      (g.id === grantIdentifier || g.instanceServiceId === grantIdentifier)
        ? { ...g, showEntities: !g.showEntities }
        : g
    ));
  };

  const setEntityFilter = (grantIdentifier: string, filter: string) => {
    setAccessGrants(prev => prev.map(g =>
      (g.id === grantIdentifier || g.instanceServiceId === grantIdentifier)
        ? { ...g, entityFilter: filter }
        : g
    ));
  };

  const togglePermission = async (grantIdentifier: string, entity: string, perm: string) => {
    const grant = accessGrants.find(g =>
      g.id === grantIdentifier || g.instanceServiceId === grantIdentifier
    );
    if (!grant) return;

    const { '*': wildcardPerms, ...entityPerms } = grant.permissions;
    const newPerms = { ...entityPerms };
    const currentPerms = newPerms[entity] || [];

    if (currentPerms.includes(perm)) {
      newPerms[entity] = currentPerms.filter(p => p !== perm);
      if (newPerms[entity].length === 0) delete newPerms[entity];
    } else {
      newPerms[entity] = [...currentPerms, perm];
    }

    if (isEditMode && grant.id) {
      setSavingGrant(grant.id);
      try {
        await api.apiKeys.updateAccessGrant(apiKey!.id, grant.id, newPerms);
        setAccessGrants(prev => prev.map(g =>
          g.id === grant.id ? { ...g, permissions: newPerms, preset: 'custom' } : g
        ));
      } catch (error: any) {
        toast.error(error.message || 'Failed to update permissions');
      } finally {
        setSavingGrant(null);
      }
    } else {
      setAccessGrants(prev => prev.map(g =>
        g.instanceServiceId === grant.instanceServiceId
          ? { ...g, permissions: newPerms, preset: 'custom' }
          : g
      ));
    }
  };

  // Get system name for a grant
  const getSystemNameForGrant = (grant: AccessGrant): string => {
    if (grant.systemName) return grant.systemName;

    const combo = availableCombinations.find(c =>
      `${c.instanceId}:${c.systemServiceId}` === grant.combinationKey
    );
    if (combo) {
      return systems.find(s => s.id === combo.instance.systemId)?.name || 'System';
    }

    return 'System';
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      setActiveTab('basic');
      return;
    }

    if (accessGrants.length === 0) {
      toast.error('At least one service must be selected');
      setActiveTab('services');
      return;
    }

    if (aliasConflicts.length > 0) {
      toast.error(
        `Cannot save: service alias conflicts detected (${aliasConflicts.map(c => `"${c.alias}"`).join(', ')}). Please select different services.`,
        { duration: 5000 }
      );
      setActiveTab('services');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await api.apiKeys.update(apiKey!.id, {
          name,
          description: description || undefined,
          rateLimitPerMinute,
          rateLimitPerDay,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
        toast.success('API key updated');
        router.push(`/api-keys/${apiKey!.id}`);
        router.refresh();
      } else {
        const result = await api.apiKeys.create({
          name,
          description: description || undefined,
          rateLimitPerMinute,
          rateLimitPerDay,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          accessGrants: accessGrants.map(g => ({
            instanceServiceId: g.instanceServiceId,
            permissions: g.permissions
          })),
        });
        setNewKey(result.secretKey);
        toast.success('API key created');
      }
    } catch (error: any) {
      let errorMessage = error.message || `Failed to ${isEditMode ? 'update' : 'create'} API key`;
      try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError.error) {
          errorMessage = parsedError.details || parsedError.error;
        }
      } catch { }
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setRateLimitPerMinute(60);
    setRateLimitPerDay(10000);
    setLogLevel('');
    setExpiresAt('');
    setAccessGrants([]);
    setAliasConflicts([]);
    setActiveTab('basic');
    setNewKey(null);
  };

  return {
    // Mode
    mode,
    isEditMode,
    dataLoaded,

    // State
    loading,
    creatingInstanceService,
    savingGrant,
    newKey,
    activeTab,
    name,
    description,
    rateLimitPerMinute,
    rateLimitPerDay,
    logLevel,
    expiresAt,
    accessGrants,
    aliasConflicts,
    selectorOptions,
    currentSelectedKeys,
    systems,

    // Setters
    setActiveTab,
    setName,
    setDescription,
    setRateLimitPerMinute,
    setRateLimitPerDay,
    setLogLevel,
    setExpiresAt,
    setNewKey,

    // Handlers
    handleMultiSelectChange,
    setPermissionPreset,
    toggleShowEntities,
    setEntityFilter,
    togglePermission,
    handleSubmit,
    resetForm,
    getSystemNameForGrant,
  };
}
