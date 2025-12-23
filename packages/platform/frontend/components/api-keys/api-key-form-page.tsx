'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstanceServiceSelector } from './instance-service-selector';
import { ApiKey, InstanceService, System, Instance, SystemService, LogLevel } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { KeyDisplay } from './key-display';
import { ArrowLeft, Loader2, Check, KeyRound, Server, Shield, Gauge } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { useApiKeyForm } from './useApiKeyForm';
import { AccessGrantCard } from './access-grant-card';
import { cn } from '@/lib/utils';

interface ApiKeyFormPageProps {
  mode: 'create' | 'edit';
  apiKey?: ApiKey;
  instanceServices?: InstanceService[];
  systems?: System[];
  instances?: Instance[];
  systemServices?: SystemService[];
}

const STEPS = [
  { id: 'basic', label: 'Details', icon: KeyRound },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'limits', label: 'Limits', icon: Gauge },
] as const;

type StepId = typeof STEPS[number]['id'];

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
    setActiveTab,
    setName,
    setDescription,
    setRateLimitPerMinute,
    setRateLimitPerDay,
    setLogLevel,
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
  const submitLabel = isEditMode
    ? (loading ? 'Saving...' : 'Save Changes')
    : (loading ? 'Creating...' : 'Create API Key');

  const currentStepIndex = STEPS.findIndex(s => s.id === activeTab);

  const isStepComplete = (stepId: StepId): boolean => {
    switch (stepId) {
      case 'basic': return name.trim().length > 0;
      case 'services': return accessGrants.length > 0;
      case 'permissions': return accessGrants.length > 0;
      case 'limits': return true;
      default: return false;
    }
  };

  const isStepDisabled = (stepId: StepId): boolean => {
    if (stepId === 'permissions') return accessGrants.length === 0;
    return false;
  };

  const goToStep = (stepId: StepId) => {
    if (!isStepDisabled(stepId)) {
      setActiveTab(stepId);
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      const nextStep = STEPS[nextIndex];
      if (!isStepDisabled(nextStep.id)) {
        setActiveTab(nextStep.id);
      }
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setActiveTab(STEPS[prevIndex].id);
    }
  };

  const canProceed = () => {
    switch (activeTab) {
      case 'basic': return name.trim().length > 0;
      case 'services': return accessGrants.length > 0 && aliasConflicts.length === 0;
      case 'permissions': return true;
      case 'limits': return true;
      default: return true;
    }
  };

  const isLastStep = currentStepIndex === STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/api-keys">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEditMode ? 'Update settings and permissions' : 'Set up access for your application'}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Step Indicator */}
        <div className="px-6 py-4 bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === activeTab;
              const isComplete = isStepComplete(step.id) && !isActive;
              const isDisabled = isStepDisabled(step.id);
              const isPast = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all",
                      isActive && "bg-primary text-primary-foreground shadow-md",
                      !isActive && !isDisabled && "hover:bg-muted",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                      isActive && "bg-primary-foreground/20",
                      !isActive && isComplete && "bg-success/15 text-success",
                      !isActive && !isComplete && "bg-muted text-muted-foreground"
                    )}>
                      {isComplete && !isActive ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium hidden sm:block",
                      !isActive && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                    {step.id === 'services' && accessGrants.length > 0 && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full hidden sm:block",
                        isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                      )}>
                        {accessGrants.length}
                      </span>
                    )}
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                      isPast || isComplete ? "bg-success/40" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Basic Info Step */}
          {activeTab === 'basic' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Key Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Production Backend"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to identify this key
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this key used for?"
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt" className="text-sm font-medium">
                  Expiration
                </Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Leave empty for a key that never expires.
                </p>
              </div>
            </div>
          )}

          {/* Services Step */}
          {activeTab === 'services' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {aliasConflicts.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <div className="text-sm font-medium text-destructive mb-1">Alias Conflict</div>
                  <p className="text-sm text-destructive/80">
                    {aliasConflicts.map(c => `"${c.alias}"`).join(', ')} {aliasConflicts.length === 1 ? 'is' : 'are'} used in multiple systems. Select different services.
                  </p>
                </div>
              )}
              <InstanceServiceSelector
                options={selectorOptions}
                selected={currentSelectedKeys}
                onSelectionChange={handleMultiSelectChange}
                disabled={creatingInstanceService}
                isLoading={creatingInstanceService}
              />
            </div>
          )}

          {/* Permissions Step */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {accessGrants.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl">
                  <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Select services first</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    {isEditMode ? 'Changes are saved automatically' : 'Default: Read-only access to all entities'}
                  </div>
                  <div className="space-y-3">
                    {accessGrants.map((grant) => (
                      <AccessGrantCard
                        key={grant.id || grant.instanceServiceId}
                        grant={grant}
                        systemName={getSystemNameForGrant(grant)}
                        onPresetChange={(preset) => setPermissionPreset(grant.id || grant.instanceServiceId, preset)}
                        onToggleEntities={() => toggleShowEntities(grant.id || grant.instanceServiceId)}
                        onSetEntityFilter={(filter) => setEntityFilter(grant.id || grant.instanceServiceId, filter)}
                        onTogglePermission={(entity, perm) => togglePermission(grant.id || grant.instanceServiceId, entity, perm)}
                        isSaving={savingGrant === grant.id}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Rate Limits Step */}
          {activeTab === 'limits' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rateLimitPerMinute" className="text-sm font-medium">
                    Requests / Minute
                  </Label>
                  <Input
                    id="rateLimitPerMinute"
                    type="number"
                    min={1}
                    max={10000}
                    value={rateLimitPerMinute}
                    onChange={(e) => setRateLimitPerMinute(parseInt(e.target.value) || 60)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">1 - 10,000</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rateLimitPerDay" className="text-sm font-medium">
                    Requests / Day
                  </Label>
                  <Input
                    id="rateLimitPerDay"
                    type="number"
                    min={1}
                    max={1000000}
                    value={rateLimitPerDay}
                    onChange={(e) => setRateLimitPerDay(parseInt(e.target.value) || 10000)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">1 - 1,000,000</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logLevel" className="text-sm font-medium">
                  Logging Level
                </Label>
                <Select
                  value={logLevel || 'inherit'}
                  onValueChange={(v) => setLogLevel(v === 'inherit' ? '' : v as LogLevel)}
                >
                  <SelectTrigger id="logLevel" className="h-11">
                    <SelectValue placeholder="Inherit from organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit from organization</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="extended">Extended</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controls the detail level of request logs
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/20 border-t flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={goToPrevStep}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={isEditMode && apiKey ? `/api-keys/${apiKey.id}` : '/api-keys'}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={loading || aliasConflicts.length > 0 || !name.trim()}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitLabel}
              </Button>
            ) : (
              <Button
                onClick={goToNextStep}
                disabled={!canProceed()}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
