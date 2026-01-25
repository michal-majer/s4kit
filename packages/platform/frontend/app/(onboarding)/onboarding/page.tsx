'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, type OnboardingData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Server,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = 'organization' | 'api-hub';

const STEPS = [
  { id: 'organization' as const, label: 'Organization', icon: Building2 },
  { id: 'api-hub' as const, label: 'SAP Sandbox', icon: Server },
];

interface FormData {
  organizationName: string;
  apiHubApiKey: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('organization');
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    apiHubApiKey: '',
  });

  useEffect(() => {
    // Check if onboarding is already complete
    api.onboarding
      .getStatus()
      .then((status) => {
        if (status.completed) {
          // Already completed, redirect to dashboard
          router.replace('/');
          return;
        }
        // Pre-fill with current org name if available
        if (status.currentOrganizationName) {
          // Only pre-fill if it doesn't look auto-generated
          if (!status.currentOrganizationName.includes("'s Organization")) {
            setFormData((prev) => ({
              ...prev,
              organizationName: status.currentOrganizationName,
            }));
          }
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to check onboarding status:', error);
        // If we can't check, assume we need to onboard
        setLoading(false);
      });
  }, [router]);

  const handleContinueToApiHub = () => {
    if (!formData.organizationName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }
    setCurrentStep('api-hub');
  };

  const handleBack = () => {
    setCurrentStep('organization');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organizationName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    setSubmitting(true);

    try {
      const data: OnboardingData = {
        organizationName: formData.organizationName.trim(),
        apiHubApiKey: formData.apiHubApiKey || undefined,
      };

      await api.onboarding.complete(data);
      toast.success('Welcome to S4Kit!');
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete setup';
      toast.error(message);
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      await api.onboarding.skip();
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to skip setup';
      toast.error(message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isComplete = index < currentStepIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all',
                  isActive && 'bg-primary text-primary-foreground',
                  isComplete && 'bg-success/15 text-success',
                  !isActive && !isComplete && 'bg-muted text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full',
                    isActive && 'bg-primary-foreground/20',
                    isComplete && 'bg-success/20',
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn('w-8 h-0.5 mx-2 rounded-full', isComplete ? 'bg-success/40' : 'bg-border')}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Organization */}
      {currentStep === 'organization' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Set up your organization</h2>
            <p className="text-muted-foreground">
              Choose a name for your organization. You can change this later in settings.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleContinueToApiHub();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-medium">
                Organization name
              </Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme Corporation"
                value={formData.organizationName}
                onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
                disabled={submitting}
                autoFocus
                autoComplete="organization"
              />
              <p className="text-xs text-muted-foreground">This will be visible to team members you invite.</p>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11" disabled={submitting}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={submitting}
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: SAP API Hub */}
      {currentStep === 'api-hub' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Connect to SAP Business Accelerator Hub</h2>
            <p className="text-muted-foreground">
              Get started with a pre-configured sandbox environment for S/4HANA APIs.
            </p>
          </div>

          {/* Info Card */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>
                The SAP Business Accelerator Hub provides free access to S/4HANA sandbox APIs for development and
                testing. We&apos;ll create a pre-configured system for you.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiHubApiKey" className="text-sm font-medium">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="apiHubApiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter your SAP API Hub API key"
                  value={formData.apiHubApiKey}
                  onChange={(e) => setFormData((prev) => ({ ...prev, apiHubApiKey: e.target.value }))}
                  disabled={submitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://api.sap.com/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  api.sap.com/settings
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="h-11" disabled={submitting} onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1 h-11" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={submitting}
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
