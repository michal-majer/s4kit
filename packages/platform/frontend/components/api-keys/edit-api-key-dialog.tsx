'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { api, ApiKey, ConnectionService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const PERMISSIONS = ['read', 'create', 'update', 'delete'] as const;

interface AccessGrant {
  id: string;
  connectionServiceId: string;
  connectionService?: ConnectionService;
  permissions: Record<string, string[]>;
  connection?: { id: string; name: string; environment: string };
  service?: { id: string; name: string; alias: string; entities?: string[] };
}

interface EditApiKeyDialogProps {
  apiKey: ApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditApiKeyDialog({ apiKey, open, onOpenChange }: EditApiKeyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [connectionServices, setConnectionServices] = useState<ConnectionService[]>([]);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [selectedConnectionService, setSelectedConnectionService] = useState<string>('');
  const router = useRouter();

  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description || '');
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>(apiKey.environment);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(apiKey.rateLimitPerMinute);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(apiKey.rateLimitPerDay);
  const [expiresAt, setExpiresAt] = useState(
    apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : ''
  );

  // Load connection services and access grants when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedConnectionService(''); // Reset select when dialog opens
      Promise.all([
        api.connectionServices.list(),
        api.apiKeys.getAccess(apiKey.id)
      ]).then(([cs, grants]) => {
        setConnectionServices(cs);
        setAccessGrants(grants.map((g: any) => {
          const connService = cs.find(c => c.id === g.connectionServiceId);
          return {
            id: g.id,
            connectionServiceId: g.connectionServiceId,
            permissions: g.permissions,
            connectionService: connService,
            // Use enriched data from API if available, otherwise fall back to connectionService
            connection: g.connection || connService?.connection,
            service: g.service ? {
              ...g.service,
              // Merge entities from connectionService if service doesn't have them
              entities: g.service.entities || connService?.service?.entities
            } : connService?.service,
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
      setEnvironment(apiKey.environment);
      setRateLimitPerMinute(apiKey.rateLimitPerMinute);
      setRateLimitPerDay(apiKey.rateLimitPerDay);
      setExpiresAt(apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().slice(0, 16) : '');
    }
  }, [open, apiKey]);

  const addAccessGrant = async (cs: ConnectionService) => {
    // Check if already exists using current state
    if (accessGrants.some(g => g.connectionServiceId === cs.id)) {
      toast.error('This connection-service is already added');
      setSelectedConnectionService(''); // Reset select
      return;
    }
    
    try {
      const newGrant = await api.apiKeys.addAccessGrant(apiKey.id, {
        connectionServiceId: cs.id,
        permissions: { '*': ['read'] }
      });
      
      // Use functional update to ensure we have the latest state
      setAccessGrants(prevGrants => [...prevGrants, {
        id: newGrant.id,
        connectionServiceId: newGrant.connectionServiceId,
        permissions: newGrant.permissions,
        connectionService: cs,
        connection: cs.connection,
        service: cs.service,
      }]);
      
      // Reset the select after successful add
      setSelectedConnectionService('');
      toast.success('Access grant added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add access grant');
      setSelectedConnectionService(''); // Reset select even on error
    }
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
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
        environment,
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

  const availableConnectionServices = connectionServices.filter(
    cs => !accessGrants.some(g => g.connectionServiceId === cs.id)
  );

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset select when dialog closes
      setSelectedConnectionService('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit API Key</DialogTitle>
          <DialogDescription>Update API key settings and manage access grants</DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="access">Access Grants {accessGrants.length > 0 && `(${accessGrants.length})`}</TabsTrigger>
            <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="basic" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" required />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <div>
                  <Label htmlFor="environment">Environment *</Label>
                  <Select value={environment} onValueChange={(v) => setEnvironment(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="prod">Production</SelectItem>
                    </SelectContent>
                  </Select>
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
              </form>
            </TabsContent>

            <TabsContent value="access" className="mt-4 h-full overflow-hidden flex flex-col">
              <div className="mb-4">
                <Label>Add Connection-Service</Label>
                <Select 
                  value={selectedConnectionService}
                  onValueChange={(v) => {
                    setSelectedConnectionService(v);
                    const cs = connectionServices.find(c => c.id === v);
                    if (cs) {
                      addAccessGrant(cs);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select connection-service to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConnectionServices.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">All connection-services already added</div>
                    ) : (
                      availableConnectionServices.map(cs => (
                        <SelectItem key={cs.id} value={cs.id}>
                          {cs.connection?.name || 'Unknown'} → {cs.service?.name || 'Unknown'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="flex-1 pr-4">
                {accessGrants.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No access grants. Select a connection-service above to add one.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accessGrants.map((grant) => (
                      <div key={grant.id || grant.connectionServiceId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium">
                            {grant.connection?.name || grant.connectionService?.connection?.name || 'Unknown'} → {grant.service?.name || grant.connectionService?.service?.name || 'Unknown'}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeAccessGrant(grant.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-2">
                          {/* All entities option */}
                          <div className="flex items-center gap-4">
                            <span className="w-32 text-sm font-medium">* (All entities)</span>
                            <div className="flex gap-3">
                              {PERMISSIONS.map(perm => (
                                <label key={perm} className="flex items-center gap-1.5 text-sm">
                                  <Checkbox
                                    checked={grant.permissions['*']?.includes(perm) || false}
                                    onCheckedChange={() => togglePermission(grant.id, '*', perm)}
                                  />
                                  {perm}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          {/* Individual entities */}
                          {(grant.service?.entities || grant.connectionService?.service?.entities) && 
                           (grant.service?.entities || grant.connectionService?.service?.entities || []).length > 0 && (
                            <>
                              <Separator className="my-2" />
                              {(grant.service?.entities || grant.connectionService?.service?.entities || []).map((entity) => (
                                <div key={entity} className="flex items-center gap-4">
                                  <span className="w-32 text-sm font-medium truncate" title={entity}>
                                    {entity}
                                  </span>
                                  <div className="flex gap-3">
                                    {PERMISSIONS.map(perm => (
                                      <label key={perm} className="flex items-center gap-1.5 text-sm">
                                        <Checkbox
                                          checked={grant.permissions[entity]?.includes(perm) || false}
                                          onCheckedChange={() => togglePermission(grant.id, entity, perm)}
                                        />
                                        {perm}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
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
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Updating...' : 'Update API Key'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
