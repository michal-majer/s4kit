'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InstanceServiceSelector } from './instance-service-selector';
import { ApiKey, InstanceService, System, Instance, SystemService } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { KeyDisplay } from './key-display';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { useApiKeyForm } from './useApiKeyForm';
import { AccessGrantCard } from './access-grant-card';

interface ApiKeyFormPageProps {
  mode: 'create' | 'edit';
  apiKey?: ApiKey;
  instanceServices?: InstanceService[];
  systems?: System[];
  instances?: Instance[];
  systemServices?: SystemService[];
}

export function ApiKeyFormPage({
  mode,
  apiKey,
  instanceServices,
  systems,
  instances,
  systemServices,
}: ApiKeyFormPageProps) {
  const router = useRouter();
  const {
    isEditMode,
    dataLoaded,
    loading,
    creatingInstanceService,
    newKey,
    activeTab,
    name,
    description,
    rateLimitPerMinute,
    rateLimitPerDay,
    expiresAt,
    accessGrants,
    aliasConflicts,
    selectorOptions,
    currentSelectedKeys,
    setActiveTab,
    setName,
    setDescription,
    setRateLimitPerMinute,
    setRateLimitPerDay,
    setExpiresAt,
    handleMultiSelectChange,
    setPermissionPreset,
    toggleShowEntities,
    setEntityFilter,
    togglePermission,
    handleSubmit,
    getSystemNameForGrant,
  } = useApiKeyForm({
    mode,
    apiKey,
    instanceServices,
    systems,
    instances,
    systemServices,
  });

  // Show loading spinner while data is being fetched (edit mode)
  if (isEditMode && !dataLoaded) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center gap-4">
          <Link href="/api-keys">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <PageHeader
            title="Edit API Key"
            description="Loading..."
          />
        </div>
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      </div>
    );
  }

  // Show success screen after creating API key
  if (newKey) {
    return (
      <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto">
        <PageHeader
          title="API Key Created"
          description="Save this key securely. You won't be able to see it again."
        />
        <Card className="p-6">
          <KeyDisplay
            secretKey={newKey}
            onClose={() => {
              router.push('/api-keys');
              router.refresh();
            }}
          />
        </Card>
      </div>
    );
  }

  const pageTitle = isEditMode ? 'Edit API Key' : 'Create API Key';
  const pageDescription = isEditMode
    ? 'Update API key settings and manage access grants'
    : 'Configure access permissions for this API key';
  const submitLabel = isEditMode
    ? (loading ? 'Updating...' : 'Update API Key')
    : (loading ? 'Creating...' : 'Create API Key');
  const permissionsHint = isEditMode
    ? 'Changes saved automatically'
    : 'Default: Read Only for all entities';

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center gap-4">
        <Link href="/api-keys">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader title={pageTitle} description={pageDescription} />
      </div>

      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="services">
              Services {accessGrants.length > 0 && `(${accessGrants.length})`}
            </TabsTrigger>
            <TabsTrigger value="permissions" disabled={accessGrants.length === 0}>
              Permissions
            </TabsTrigger>
            <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-6">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API Key"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
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

          <TabsContent value="services" className="mt-6 space-y-4">
            {aliasConflicts.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-medium text-red-700 mb-2">Service Alias Conflicts Detected</div>
                <div className="text-sm text-red-600 mb-2">
                  The following service aliases are used in multiple systems. Please select different services:
                </div>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {aliasConflicts.map(conflict => (
                    <li key={conflict.alias}>
                      <span className="font-mono">"{conflict.alias}"</span> appears in {conflict.systemCount} systems
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <InstanceServiceSelector
              options={selectorOptions}
              selected={currentSelectedKeys}
              onSelectionChange={handleMultiSelectChange}
              disabled={creatingInstanceService}
              isLoading={creatingInstanceService}
            />
          </TabsContent>

          <TabsContent value="permissions" className="mt-6 space-y-3">
            {accessGrants.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 border rounded-md">
                Select services first to configure permissions.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{permissionsHint}</span>
                </div>
                {accessGrants.map((grant) => (
                  <AccessGrantCard
                    key={grant.id || grant.instanceServiceId}
                    grant={grant}
                    systemName={getSystemNameForGrant(grant)}
                    onPresetChange={(preset) => setPermissionPreset(grant.id || grant.instanceServiceId, preset)}
                    onToggleEntities={() => toggleShowEntities(grant.id || grant.instanceServiceId)}
                    onSetEntityFilter={(filter) => setEntityFilter(grant.id || grant.instanceServiceId, filter)}
                    onTogglePermission={(entity, perm) => togglePermission(grant.id || grant.instanceServiceId, entity, perm)}
                  />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="limits" className="space-y-4 mt-6">
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

        <div className="flex justify-end gap-2 pt-6 mt-6 border-t">
          <Link href="/api-keys">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={loading || aliasConflicts.length > 0}>
            {submitLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
