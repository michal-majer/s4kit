'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MultiSelect } from '@/components/ui/multi-select';
import { api, ApiKey, InstanceService, InstanceEnvironment } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, ChevronDown, ChevronRight, Search } from 'lucide-react';

const PERMISSIONS = ['read', 'create', 'update', 'delete'] as const;

interface AccessGrant {
  id: string;
  instanceServiceId: string;
  instanceService?: InstanceService;
  permissions: Record<string, string[]>;
  instance?: { id: string; environment: InstanceEnvironment } | null;
  systemService?: { id: string; name: string; alias: string; entities?: string[] } | null;
  showEntities?: boolean;
  entityFilter?: string;
}

interface EditApiKeyDialogProps {
  apiKey: ApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditApiKeyDialog({ apiKey, open, onOpenChange }: EditApiKeyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [instanceServices, setInstanceServices] = useState<InstanceService[]>([]);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [selectedInstanceServices, setSelectedInstanceServices] = useState<string[]>([]);
  const router = useRouter();

  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description || '');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(apiKey.rateLimitPerMinute);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(apiKey.rateLimitPerDay);
  const [expiresAt, setExpiresAt] = useState(
    apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : ''
  );

  useEffect(() => {
    if (open) {
      setSelectedInstanceServices([]);
      Promise.all([
        api.instanceServices.list(),
        api.apiKeys.getAccess(apiKey.id)
      ]).then(([is, grants]) => {
        setInstanceServices(is);
        setAccessGrants(grants.map((g: any) => {
          const instService = is.find(i => i.id === g.instanceServiceId);
          return {
            id: g.id,
            instanceServiceId: g.instanceServiceId,
            permissions: g.permissions,
            instanceService: instService,
            instance: g.instance || instService?.instance,
            systemService: g.systemService ? {
              ...g.systemService,
              entities: g.systemService.entities || instService?.systemService?.entities
            } : instService?.systemService,
            showEntities: false,
            entityFilter: ''
          };
        }));
      }).catch(() => {
        toast.error('Failed to load data');
      });
    }
  }, [open, apiKey.id]);

  useEffect(() => {
    if (open && apiKey) {
      setName(apiKey.name);
      setDescription(apiKey.description || '');
      setRateLimitPerMinute(apiKey.rateLimitPerMinute);
      setRateLimitPerDay(apiKey.rateLimitPerDay);
      setExpiresAt(apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : '');
    }
  }, [open, apiKey]);

  const addAccessGrant = async (is: InstanceService) => {
    if (accessGrants.some(g => g.instanceServiceId === is.id)) {
      return; // Already added, skip silently
    }
    
    try {
      const newGrant = await api.apiKeys.addAccessGrant(apiKey.id, {
        instanceServiceId: is.id,
        permissions: { '*': ['read'] }
      });
      
      setAccessGrants(prevGrants => [...prevGrants, {
        id: newGrant.id,
        instanceServiceId: newGrant.instanceServiceId,
        permissions: newGrant.permissions,
        instanceService: is,
        instance: is.instance,
        systemService: is.systemService,
        showEntities: false,
        entityFilter: ''
      }]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add access grant');
    }
  };

  const handleMultiSelectChange = async (selectedIds: string[]) => {
    const newlySelected = selectedIds.filter(id => 
      !accessGrants.some(g => g.instanceServiceId === id)
    );
    
    // Add all newly selected instance-services
    const addPromises = newlySelected.map(id => {
      const is = instanceServices.find(i => i.id === id);
      return is ? addAccessGrant(is) : Promise.resolve();
    });
    
    await Promise.all(addPromises);
    
    // Remove any that were deselected
    const toRemove = accessGrants.filter(g => !selectedIds.includes(g.instanceServiceId));
    for (const grant of toRemove) {
      await removeAccessGrant(grant.id);
    }
    
    setSelectedInstanceServices(selectedIds);
  };

  const removeAccessGrant = async (grantId: string) => {
    if (!confirm('Are you sure you want to remove this access grant?')) return;
    try {
      await api.apiKeys.deleteAccessGrant(apiKey.id, grantId);
      setAccessGrants(accessGrants.filter(g => g.id !== grantId));
      toast.success('Access grant removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove access grant');
    }
  };

  const toggleShowEntities = (grantId: string) => {
    setAccessGrants(prevGrants => prevGrants.map(g => 
      g.id === grantId ? { ...g, showEntities: !g.showEntities } : g
    ));
  };

  const setEntityFilter = (grantId: string, filter: string) => {
    setAccessGrants(prevGrants => prevGrants.map(g => 
      g.id === grantId ? { ...g, entityFilter: filter } : g
    ));
  };

  const updatePermissions = async (grantId: string, entity: string, perms: string[]) => {
    const grant = accessGrants.find(g => g.id === grantId);
    if (!grant) return;

    const newPerms = { ...grant.permissions };
    if (perms.length === 0) {
      delete newPerms[entity];
    } else {
      newPerms[entity] = perms;
    }

    try {
      await api.apiKeys.updateAccessGrant(apiKey.id, grantId, newPerms);
      setAccessGrants(accessGrants.map(g => 
        g.id === grantId ? { ...g, permissions: newPerms } : g
      ));
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permissions');
    }
  };

  const togglePermission = async (grantId: string, entity: string, perm: string) => {
    const grant = accessGrants.find(g => g.id === grantId);
    if (!grant) return;
    const currentPerms = grant.permissions[entity] || [];
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    await updatePermissions(grantId, entity, newPerms);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!name.trim()) {
      toast.error('Name is required');
      setActiveTab('basic');
      return;
    }

    setLoading(true);
    try {
      await api.apiKeys.update(apiKey.id, {
        name,
        description: description || undefined,
        rateLimitPerMinute,
        rateLimitPerDay,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast.success('API key updated');
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  const availableInstanceServices = instanceServices.filter(
    is => !accessGrants.some(g => g.instanceServiceId === is.id)
  );

  const multiSelectOptions = instanceServices.map(is => ({
    value: is.id,
    label: `[${is.instance?.environment || 'Unknown'}] ${is.systemService?.name || 'Unknown'}`
  }));

  const currentSelectedIds = accessGrants.map(g => g.instanceServiceId);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedInstanceServices([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit API Key</DialogTitle>
          <DialogDescription>Update API key settings and manage access grants</DialogDescription>
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
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div>
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for no expiration</p>
            </div>
          </TabsContent>

          <TabsContent value="access" className="mt-4 flex flex-col min-h-0">
            <div className="mb-4 flex-shrink-0">
              <Label>Instance-Services</Label>
              <MultiSelect
                options={multiSelectOptions}
                selected={currentSelectedIds}
                onSelectionChange={handleMultiSelectChange}
                placeholder="Select instance-services to add..."
                searchPlaceholder="Search instance-services..."
                emptyMessage={
                  instanceServices.length === 0
                    ? "No instance-services available"
                    : "No instance-services match your search"
                }
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {accessGrants.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border rounded-md">
                  No access grants. Select instance-services above to add them.
                </div>
              ) : (
                accessGrants.map((grant) => (
                  <EditAccessGrantCard
                    key={grant.id}
                    grant={grant}
                    onRemove={() => removeAccessGrant(grant.id)}
                    onToggleEntities={() => toggleShowEntities(grant.id)}
                    onSetEntityFilter={(filter) => setEntityFilter(grant.id, filter)}
                    onTogglePermission={(entity, perm) => togglePermission(grant.id, entity, perm)}
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

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} disabled={loading}>
            {loading ? 'Updating...' : 'Update API Key'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Separate component for better performance
function EditAccessGrantCard({ 
  grant, 
  onRemove, 
  onToggleEntities,
  onSetEntityFilter,
  onTogglePermission,
}: { 
  grant: AccessGrant;
  onRemove: () => void;
  onToggleEntities: () => void;
  onSetEntityFilter: (filter: string) => void;
  onTogglePermission: (entity: string, perm: string) => void;
}) {
  const entities = grant.systemService?.entities || grant.instanceService?.systemService?.entities || [];
  const entityCount = entities.length;
  
  const filteredEntities = useMemo(() => {
    if (!grant.entityFilter) return entities;
    const lower = grant.entityFilter.toLowerCase();
    return entities.filter(e => e.toLowerCase().includes(lower));
  }, [entities, grant.entityFilter]);

  const customizedCount = Object.keys(grant.permissions).filter(k => k !== '*').length;

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-medium">
            [{grant.instance?.environment || grant.instanceService?.instance?.environment || 'Unknown'}] {grant.systemService?.name || grant.instanceService?.systemService?.name || 'Unknown'}
          </div>
          <div className="text-xs text-muted-foreground">
            {entityCount} entities available
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

