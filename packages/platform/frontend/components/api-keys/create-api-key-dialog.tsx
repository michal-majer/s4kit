'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyDisplay } from './key-display';
import { Plus, Trash2 } from 'lucide-react';

const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440000';
const PERMISSIONS = ['read', 'create', 'update', 'delete'] as const;

interface ConnectionService {
  id: string;
  connectionId: string;
  serviceId: string;
  connection?: { id: string; name: string; environment: string };
  service?: { id: string; name: string; alias: string; entities?: string[] };
}

interface AccessGrant {
  connectionServiceId: string;
  connectionService?: ConnectionService;
  permissions: Record<string, string[]>;
}

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [connectionServices, setConnectionServices] = useState<ConnectionService[]>([]);
  const [selectedConnectionService, setSelectedConnectionService] = useState<string>('');
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>('dev');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [rateLimitPerDay, setRateLimitPerDay] = useState(10000);
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);

  useEffect(() => {
    if (open) {
      api.connectionServices.list().then(setConnectionServices).catch(() => {
        toast.error('Failed to load connection services');
      });
    }
  }, [open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEnvironment('dev');
    setRateLimitPerMinute(60);
    setRateLimitPerDay(10000);
    setAccessGrants([]);
    setActiveTab('basic');
    setSelectedConnectionService('');
  };

  const addAccessGrant = (cs: ConnectionService) => {
    // Use functional update to ensure we have the latest state
    setAccessGrants(prevGrants => {
      if (prevGrants.some(g => g.connectionServiceId === cs.id)) {
        toast.error('This connection-service is already added');
        setSelectedConnectionService(''); // Reset select
        return prevGrants;
      }
      // Reset the select after adding
      setSelectedConnectionService('');
      return [...prevGrants, {
        connectionServiceId: cs.id,
        connectionService: cs,
        permissions: { '*': ['read'] }
      }];
    });
  };

  const removeAccessGrant = (csId: string) => {
    setAccessGrants(prevGrants => prevGrants.filter(g => g.connectionServiceId !== csId));
  };

  const updatePermissions = (csId: string, entity: string, perms: string[]) => {
    setAccessGrants(prevGrants => prevGrants.map(g => {
      if (g.connectionServiceId !== csId) return g;
      const newPerms = { ...g.permissions };
      if (perms.length === 0) {
        delete newPerms[entity];
      } else {
        newPerms[entity] = perms;
      }
      return { ...g, permissions: newPerms };
    }));
  };

  const togglePermission = (csId: string, entity: string, perm: string) => {
    const grant = accessGrants.find(g => g.connectionServiceId === csId);
    if (!grant) return;
    const currentPerms = grant.permissions[entity] || [];
    const newPerms = currentPerms.includes(perm)
      ? currentPerms.filter(p => p !== perm)
      : [...currentPerms, perm];
    updatePermissions(csId, entity, newPerms);
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
        environment,
        rateLimitPerMinute,
        rateLimitPerDay,
        accessGrants: accessGrants.map(g => ({
          connectionServiceId: g.connectionServiceId,
          permissions: g.permissions
        })),
      });
      setNewKey(result.secretKey);
      toast.success('API key created');
      router.refresh();
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
          setSelectedConnectionService('');
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
          }} />
        </DialogContent>
      </Dialog>
    );
  }

  const availableConnectionServices = connectionServices.filter(
    cs => !accessGrants.some(g => g.connectionServiceId === cs.id)
  );

  const handleDialogOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      resetForm();
      setSelectedConnectionService('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button>Create API Key</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>Configure access permissions for this API key</DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="access">Access Grants {accessGrants.length > 0 && `(${accessGrants.length})`}</TabsTrigger>
            <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" />
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
                      <div className="p-2 text-sm text-muted-foreground">No connection-services available</div>
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
                    No access grants added. Select a connection-service above.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accessGrants.map((grant, index) => (
                      <div key={grant.connectionServiceId || `grant-${index}`} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-medium">
                            {grant.connectionService?.connection?.name} → {grant.connectionService?.service?.name}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeAccessGrant(grant.connectionServiceId)}>
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
                                    onCheckedChange={() => togglePermission(grant.connectionServiceId, '*', perm)}
                                  />
                                  {perm}
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          {/* Individual entities */}
                          {grant.connectionService?.service?.entities && grant.connectionService.service.entities.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              {grant.connectionService.service.entities.map((entity) => (
                                <div key={entity} className="flex items-center gap-4">
                                  <span className="w-32 text-sm font-medium truncate" title={entity}>
                                    {entity}
                                  </span>
                                  <div className="flex gap-3">
                                    {PERMISSIONS.map(perm => (
                                      <label key={perm} className="flex items-center gap-1.5 text-sm">
                                        <Checkbox
                                          checked={grant.permissions[entity]?.includes(perm) || false}
                                          onCheckedChange={() => togglePermission(grant.connectionServiceId, entity, perm)}
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

