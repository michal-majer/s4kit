'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiSelect } from '@/components/ui/multi-select';
import { api, InstanceService, System, Instance, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyDisplay } from './key-display';
import { Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react';

const TEST_ORG_ID = '00000000-0000-4000-8000-000000000001';
const PERMISSIONS = ['read', 'create', 'update', 'delete'] as const;

interface AccessGrant {
  instanceServiceId: string;
  instanceService?: InstanceService;
  permissions: Record<string, string[]>;
  showEntities?: boolean;
  entityFilter?: string;
  combinationKey?: string; // Store the combination key for easier tracking
}

interface InstanceServiceOption {
  instanceId: string;
  systemServiceId: string;
  instance: Instance;
  systemService: SystemService;
  existingInstanceServiceId?: string; // If an instance-service already exists
}

interface CreateApiKeyDialogProps {
  instanceServices?: InstanceService[];
  systems?: System[];
  instances?: Instance[];
  systemServices?: SystemService[];
}

export function CreateApiKeyDialog({ instanceServices, systems, instances, systemServices }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creatingInstanceService, setCreatingInstanceService] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedCombinations, setSelectedCombinations] = useState<string[]>([]);
  const router = useRouter();
  
  // Ensure arrays are always defined
  const safeInstanceServices = instanceServices || [];
  const safeInstances = instances || [];
  const safeSystemServices = systemServices || [];

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(10000);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);

  // Compute available instance-service combinations
  const availableCombinations = useMemo(() => {
    const combinations: InstanceServiceOption[] = [];
    const existingMap = new Map<string, string>(); // Map of "instanceId:systemServiceId" -> instanceServiceId
    
    // Map existing instance-services
    safeInstanceServices.forEach(is => {
      if (is.instanceId && is.systemServiceId) {
        existingMap.set(`${is.instanceId}:${is.systemServiceId}`, is.id);
      }
    });

    // Create combinations from instances and system-services
    safeInstances.forEach(instance => {
      safeSystemServices.forEach(systemService => {
        // Only include if instance and system-service belong to the same system
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
  }, [safeInstances, safeSystemServices, safeInstanceServices]);

  // Filter out combinations that are already in access grants
  const availableOptions = useMemo(() => {
    const grantIds = new Set(accessGrants.map(g => g.instanceServiceId));
    return availableCombinations.filter(opt => {
      if (opt.existingInstanceServiceId) {
        return !grantIds.has(opt.existingInstanceServiceId);
      }
      return true; // New combinations are always available
    });
  }, [availableCombinations, accessGrants]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setRateLimitPerMinute(60);
    setRateLimitPerDay(10000);
    setAccessGrants([]);
    setActiveTab('basic');
    setSelectedCombinations([]);
  };

  const handleSelectCombination = async (combinationKey: string): Promise<string | null> => {
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

      // If instance-service already exists, use it
      if (combination.existingInstanceServiceId) {
        instanceServiceId = combination.existingInstanceServiceId;
        instanceService = await api.instanceServices.get(instanceServiceId);
      } else {
        // Create new instance-service
        const newInstanceService = await api.instanceServices.create({
          instanceId: combination.instanceId,
          systemServiceId: combination.systemServiceId,
        });
        instanceServiceId = newInstanceService.id;
        
        // Fetch the created instance-service to get enriched data
        instanceService = await api.instanceServices.get(instanceServiceId);
        
        // If the API doesn't return enriched data, manually add it
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

      // Add to access grants
      setAccessGrants(prevGrants => {
        if (prevGrants.some(g => g.instanceServiceId === instanceServiceId)) {
          return prevGrants; // Already added, skip silently
        }
        return [...prevGrants, {
          instanceServiceId,
          instanceService,
          permissions: { '*': ['read'] },
          showEntities: false,
          entityFilter: '',
          combinationKey: combinationKey
        }];
      });

      return instanceServiceId;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create instance-service');
      return null;
    }
  };

  const handleMultiSelectChange = async (selectedKeys: string[]) => {
    setCreatingInstanceService(true);
    
    try {
      // Get current grant keys
      const currentGrantKeys = accessGrants
        .map(g => g.combinationKey)
        .filter((key): key is string => key !== undefined);

      // Find newly selected combinations
      const newlySelected = selectedKeys.filter(key => !currentGrantKeys.includes(key));
      
      // Find combinations to remove
      const toRemove = currentGrantKeys.filter(key => !selectedKeys.includes(key));

      // Remove deselected grants first
      for (const key of toRemove) {
        const grant = accessGrants.find(g => g.combinationKey === key);
        if (grant) {
          removeAccessGrant(grant.instanceServiceId);
        }
      }

      // Add newly selected combinations
      const addPromises = newlySelected.map(key => handleSelectCombination(key));
      await Promise.all(addPromises);

      // Refresh to get updated instance-services list if any were created
      if (newlySelected.length > 0) {
        router.refresh();
      }

      setSelectedCombinations(selectedKeys);
    } finally {
      setCreatingInstanceService(false);
    }
  };

  const removeAccessGrant = (isId: string) => {
    setAccessGrants(prevGrants => prevGrants.filter(g => g.instanceServiceId !== isId));
  };

  const toggleShowEntities = (isId: string) => {
    setAccessGrants(prevGrants => prevGrants.map(g => 
      g.instanceServiceId === isId ? { ...g, showEntities: !g.showEntities } : g
    ));
  };

  const setEntityFilter = (isId: string, filter: string) => {
    setAccessGrants(prevGrants => prevGrants.map(g => 
      g.instanceServiceId === isId ? { ...g, entityFilter: filter } : g
    ));
  };

  const updatePermissions = (isId: string, entity: string, perms: string[]) => {
    setAccessGrants(prevGrants => prevGrants.map(g => {
      if (g.instanceServiceId !== isId) return g;
      const newPerms = { ...g.permissions };
      if (perms.length === 0) {
        delete newPerms[entity];
      } else {
        newPerms[entity] = perms;
      }
      return { ...g, permissions: newPerms };
    }));
  };

  const togglePermission = (isId: string, entity: string, perm: string) => {
    const grant = accessGrants.find(g => g.instanceServiceId === isId);
    if (!grant) return;
    const currentPerms = grant.permissions[entity] || [];
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    updatePermissions(isId, entity, newPerms);
  };

  const setAllPermissions = (isId: string, perm: string, enabled: boolean) => {
    const grant = accessGrants.find(g => g.instanceServiceId === isId);
    if (!grant) return;
    
    const entities = grant.instanceService?.systemService?.entities || [];
    const allEntities = ['*', ...entities];
    
    setAccessGrants(prevGrants => prevGrants.map(g => {
      if (g.instanceServiceId !== isId) return g;
      const newPerms = { ...g.permissions };
      
      allEntities.forEach(entity => {
        const current = newPerms[entity] || [];
        if (enabled && !current.includes(perm)) {
          newPerms[entity] = [...current, perm];
        } else if (!enabled) {
          newPerms[entity] = current.filter(p => p !== perm);
          if (newPerms[entity].length === 0) delete newPerms[entity];
        }
      });
      
      return { ...g, permissions: newPerms };
    }));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      setActiveTab('basic');
      return;
    }
    if (accessGrants.length === 0) {
      toast.error('At least one access grant is required');
      setActiveTab('access');
      return;
    }

    setLoading(true);
    try {
      const result = await api.apiKeys.create({
        name,
        description: description || undefined,
        organizationId: TEST_ORG_ID,
        rateLimitPerMinute,
        rateLimitPerDay,
        accessGrants: accessGrants.map(g => ({
          instanceServiceId: g.instanceServiceId,
          permissions: g.permissions
        })),
      });
      setNewKey(result.secretKey);
      toast.success('API key created');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  if (newKey) {
    return (
      <Dialog open={true} onOpenChange={(o) => {
        if (!o) {
          setNewKey(null);
          setOpen(false);
          resetForm();
          router.refresh();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
          </DialogHeader>
          <KeyDisplay secretKey={newKey} onClose={() => {
            setNewKey(null);
            setOpen(false);
            resetForm();
            router.refresh();
          }} />
        </DialogContent>
      </Dialog>
    );
  }

  const envLabels: Record<string, string> = {
    sandbox: 'SBX',
    dev: 'DEV',
    quality: 'QA',
    preprod: 'PRE',
    production: 'PROD',
  };

  const multiSelectOptions = availableOptions.map(opt => {
    const key = `${opt.instanceId}:${opt.systemServiceId}`;
    const system = systems?.find(s => s.id === opt.instance.systemId);
    return {
      value: key,
      label: `[${envLabels[opt.instance.environment] || opt.instance.environment}] ${system?.name || 'System'} - ${opt.systemService.name}${opt.existingInstanceServiceId ? ' (existing)' : ''}`
    };
  });

  const currentSelectedKeys = accessGrants
    .map(g => g.combinationKey)
    .filter((key): key is string => key !== undefined);

  const handleDialogOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button>Create API Key</Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>Configure access permissions for this API key</DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="access">Access Grants {accessGrants.length > 0 && `(${accessGrants.length})`}</TabsTrigger>
            <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4 flex-shrink-0">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-4 flex flex-col min-h-0">
            <div className="mb-4 flex-shrink-0">
              <Label>Instance-Services</Label>
              <MultiSelect
                options={multiSelectOptions}
                selected={currentSelectedKeys}
                onSelectionChange={handleMultiSelectChange}
                placeholder={
                  creatingInstanceService
                    ? "Creating instance-service..."
                    : availableOptions.length === 0 
                      ? "No combinations available" 
                      : "Select instance-services to add..."
                }
                searchPlaceholder="Search instance-services..."
                emptyMessage={
                  availableOptions.length === 0
                    ? safeInstances.length === 0 || safeSystemServices.length === 0
                      ? "Create instances and system-services first to link them."
                      : "All combinations have been added."
                    : "No instance-services match your search"
                }
                disabled={creatingInstanceService}
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {accessGrants.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border rounded-md">
                  No access grants added. Select instance-services above to add them.
                </div>
              ) : (
                accessGrants.map((grant) => (
                  <AccessGrantCard
                    key={grant.instanceServiceId}
                    grant={grant}
                    onRemove={() => removeAccessGrant(grant.instanceServiceId)}
                    onToggleEntities={() => toggleShowEntities(grant.instanceServiceId)}
                    onSetEntityFilter={(filter) => setEntityFilter(grant.instanceServiceId, filter)}
                    onTogglePermission={(entity, perm) => togglePermission(grant.instanceServiceId, entity, perm)}
                    onSetAllPermissions={(perm, enabled) => setAllPermissions(grant.instanceServiceId, perm, enabled)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4 mt-4 flex-shrink-0">
            <div>
              <Label htmlFor="rateLimitPerMinute">Requests per minute</Label>
              <Input
                id="rateLimitPerMinute"
                type="number"
                min={1}
                max={10000}
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(parseInt(e.target.value) || 60)}
              />
            </div>
            <div>
              <Label htmlFor="rateLimitPerDay">Requests per day</Label>
              <Input
                id="rateLimitPerDay"
                type="number"
                min={1}
                max={1000000}
                value={rateLimitPerDay}
                onChange={(e) => setRateLimitPerDay(parseInt(e.target.value) || 10000)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create API Key'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Separate component for better performance
function AccessGrantCard({ 
  grant, 
  onRemove, 
  onToggleEntities,
  onSetEntityFilter,
  onTogglePermission,
  onSetAllPermissions
}: { 
  grant: AccessGrant;
  onRemove: () => void;
  onToggleEntities: () => void;
  onSetEntityFilter: (filter: string) => void;
  onTogglePermission: (entity: string, perm: string) => void;
  onSetAllPermissions: (perm: string, enabled: boolean) => void;
}) {
  const entities = grant.instanceService?.systemService?.entities || [];
  const entityCount = entities.length;
  
  const filteredEntities = useMemo(() => {
    if (!grant.entityFilter) return entities;
    const lower = grant.entityFilter.toLowerCase();
    return entities.filter(e => e.toLowerCase().includes(lower));
  }, [entities, grant.entityFilter]);

  const customizedCount = Object.keys(grant.permissions).filter(k => k !== '*').length;

  const envLabels: Record<string, string> = {
    sandbox: 'Sandbox',
    dev: 'Development',
    quality: 'Quality',
    preprod: 'Pre-Production',
    production: 'Production',
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-medium">
            {grant.instanceService?.systemService?.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {envLabels[grant.instanceService?.instance?.environment || ''] || grant.instanceService?.instance?.environment}
            {' • '}{entityCount} entities available
            {customizedCount > 0 && ` • ${customizedCount} customized`}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Default permissions for all entities */}
      <div className="bg-muted/50 rounded-md p-3 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Default Permissions</div>
            <div className="text-xs text-muted-foreground">Applied to all entities unless overridden</div>
          </div>
          <div className="flex gap-4 flex-wrap">
            {PERMISSIONS.map(perm => (
              <label key={perm} className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
                <Checkbox
                  checked={grant.permissions['*']?.includes(perm) || false}
                  onCheckedChange={() => onTogglePermission('*', perm)}
                />
                {perm}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable entity customization */}
      {entityCount > 0 && (
        <Collapsible open={grant.showEntities} onOpenChange={onToggleEntities}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
              {grant.showEntities ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
              {grant.showEntities ? 'Hide' : 'Customize'} individual entity permissions
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter entities..."
                value={grant.entityFilter || ''}
                onChange={(e) => onSetEntityFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Entity list */}
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2 font-medium min-w-[200px] sticky left-0 bg-muted/50 z-20">Entity</th>
                      {PERMISSIONS.map(perm => (
                        <th key={perm} className="text-center p-2 font-medium w-20">{perm}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.map((entity) => (
                      <tr key={entity} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-mono text-xs sticky left-0 bg-card z-10" title={entity}>
                          {entity.length > 35 ? entity.slice(0, 35) + '...' : entity}
                        </td>
                        {PERMISSIONS.map(perm => (
                          <td key={perm} className="text-center p-2">
                            <Checkbox
                              checked={grant.permissions[entity]?.includes(perm) || false}
                              onCheckedChange={() => onTogglePermission(entity, perm)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    {filteredEntities.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          No entities match your filter
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Showing {filteredEntities.length} of {entityCount} entities
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
