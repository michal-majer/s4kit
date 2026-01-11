'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Building2, Mail, LogOut, Loader2 } from 'lucide-react';

export default function NoOrganizationPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // Check for pending invitations in URL (from redirect)
  useEffect(() => {
    // If user came from an invitation flow, the URL might have the invitation ID
    const params = new URLSearchParams(window.location.search);
    const invitationId = params.get('invitation');
    if (invitationId) {
      router.push(`/accept-invitation?id=${invitationId}`);
    }
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">S4Kit</h1>
          <p className="text-muted-foreground mt-1">SAP Integration Platform</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">No Organization</h2>
            <p className="text-muted-foreground mt-2">
              You&apos;re not a member of any organization yet.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Have an invitation?
              </div>
              <p className="text-sm text-muted-foreground">
                Check your email for an invitation link, or ask your team admin to send you one.
              </p>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Sign out
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{' '}
          <Link href="mailto:contact@s4kit.com" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
