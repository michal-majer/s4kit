'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type InvitationDetails } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Mail, Building2, UserPlus, Clock } from 'lucide-react';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionLoading } = useSession();

  const invitationId = searchParams.get('id');

  const [loading, setLoading] = useState(() => !!invitationId);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(() =>
    invitationId ? null : 'No invitation ID provided'
  );

  useEffect(() => {
    if (!invitationId) return;

    api.invitations.get(invitationId)
      .then((inv) => {
        setInvitation(inv);
        if (inv.error) {
          setError(inv.error);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load invitation');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invitationId]);

  const handleAccept = async () => {
    if (!invitationId) return;

    setAccepting(true);
    try {
      const result = await api.invitations.accept(invitationId);
      toast.success(result.message);
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      toast.error(message);
      setAccepting(false);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-xl border shadow-lg p-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'This invitation link is not valid.'}
            </p>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Expired or already used
  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-xl border shadow-lg p-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {invitation.status === 'expired' ? 'Invitation Expired' : 'Invitation Already Used'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {invitation.status === 'expired'
                ? 'This invitation has expired. Please ask for a new invitation.'
                : 'This invitation has already been accepted.'}
            </p>
            <Button asChild>
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Valid invitation - show details
  const isLoggedIn = !!session?.user;
  const emailMatches = session?.user?.email?.toLowerCase() === invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">S4Kit</h1>
          <p className="text-muted-foreground mt-1">SAP Integration Platform</p>
        </div>

        {/* Invitation Card */}
        <div className="bg-card rounded-xl border shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold">You&apos;re Invited!</h2>
          </div>

          {/* Invitation Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{invitation.organizationName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Invited as</p>
                <p className="font-medium capitalize">{invitation.role}</p>
              </div>
            </div>

            {invitation.inviterName && (
              <p className="text-sm text-muted-foreground text-center">
                Invited by <span className="font-medium text-foreground">{invitation.inviterName}</span>
              </p>
            )}
          </div>

          {/* Actions based on login state */}
          {isLoggedIn ? (
            emailMatches ? (
              <div className="space-y-4">
                <Button
                  className="w-full h-11"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Accept Invitation
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Logged in as {session.user.email}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-900">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This invitation was sent to <strong>{invitation.email}</strong>, but you&apos;re logged in as <strong>{session.user.email}</strong>.
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/login?redirect=${encodeURIComponent(`/accept-invitation?id=${invitationId}`)}`}>
                    Sign in with different account
                  </Link>
                </Button>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {invitation.userExists ? (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in with <strong>{invitation.email}</strong> to accept this invitation.
                  </p>
                  <Button asChild className="w-full h-11">
                    <Link href={`/login?redirect=${encodeURIComponent(`/accept-invitation?id=${invitationId}`)}`}>
                      Sign In
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Create an account to join <strong>{invitation.organizationName}</strong>.
                  </p>
                  <Button asChild className="w-full h-11">
                    <Link href={`/signup?email=${encodeURIComponent(invitation.email)}&redirect=${encodeURIComponent(`/accept-invitation?id=${invitationId}`)}`}>
                      Create Account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
