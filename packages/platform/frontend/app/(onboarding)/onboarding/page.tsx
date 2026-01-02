'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, type OnboardingData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Building2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    // Check if onboarding is already complete
    api.onboarding.getStatus()
      .then((status) => {
        if (status.completed) {
          // Already completed, redirect to dashboard
          router.replace('/');
          return;
        }
        // Pre-fill with current org name if available
        if (status.currentOrganizationName) {
          // Only pre-fill if it looks auto-generated
          if (!status.currentOrganizationName.includes("'s Organization")) {
            setOrganizationName(status.currentOrganizationName);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    setSubmitting(true);

    try {
      const data: OnboardingData = {
        organizationName: organizationName.trim(),
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

  return (
    <div className="space-y-6">
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="organizationName" className="text-sm font-medium">
            Organization name
          </Label>
          <Input
            id="organizationName"
            type="text"
            placeholder="Acme Corporation"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            disabled={submitting}
            autoFocus
            autoComplete="organization"
          />
          <p className="text-xs text-muted-foreground">
            This will be visible to team members you invite.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
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
  );
}
