'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signUp, signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Check, Lock, Mail } from 'lucide-react';
import { api } from '@/lib/api';

type PlatformFeatures = {
  signup: boolean;
  socialLogin: boolean;
  billing: boolean;
  multiOrg: boolean;
};

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const [resending, setResending] = useState(false);
  const [features, setFeatures] = useState<PlatformFeatures | null>(null);

  // Check for pre-filled email from invitation
  const invitedEmail = searchParams.get('email');
  const redirectUrl = searchParams.get('redirect');
  const isInvitation = !!invitedEmail;

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  useEffect(() => {
    api.platformInfo.get()
      .then((info) => setFeatures(info.features))
      .catch(() => {
        setFeatures({ signup: false, socialLogin: false, billing: false, multiOrg: false });
      });
  }, []);

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
  ];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setShowResendOption(false);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        const errorMessage = result.error.message?.toLowerCase() || '';
        const errorCode = result.error.code?.toLowerCase() || '';

        // Check for email already exists errors
        const isEmailExists =
          errorCode.includes('user_already_exists') ||
          errorCode.includes('email_exists') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('already registered') ||
          errorMessage.includes('email is already in use') ||
          errorMessage.includes('user with this email');

        if (isEmailExists) {
          setShowResendOption(true);
          toast.error('An account with this email already exists');
        } else {
          toast.error(result.error.message || 'Sign up failed');
        }
        setLoading(false);
        return;
      }

      // For invitation signups, auto sign-in and redirect to dashboard
      // (user is auto-verified and auto-joined to org in backend)
      // For regular signups, show verification message
      if (isInvitation) {
        // Wait briefly for the async database hooks to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Sign in with the same credentials
        const signInResult = await signIn.email({ email, password });

        if (signInResult.error) {
          // If auto sign-in fails, redirect to login as fallback
          toast.success('Account created! Sign in to continue.');
          router.push('/login');
        } else {
          toast.success('Welcome to S4Kit!');
          router.push('/');
          router.refresh();
        }
      } else {
        toast.success('Account created! Please check your email to verify.');
        router.push('/login?verify=pending');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setResending(true);
    try {
      const result = await api.auth.resendVerification(email);
      if (result.success) {
        toast.success('Verification email sent! Please check your inbox.');
        setShowResendOption(false);
        router.push('/login?verify=pending');
      } else {
        toast.error(result.error || 'Failed to send verification email');
      }
    } catch (error) {
      toast.error('Failed to send verification email');
    } finally {
      setResending(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      await signIn.social({
        provider,
        callbackURL: redirectUrl || window.location.origin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to sign in with ${provider}`;
      toast.error(message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">
          {isInvitation
            ? 'Complete your account to accept the invitation'
            : 'Get started with S4Kit in minutes'}
        </p>
      </div>

      {/* Social Login Buttons - only show if enabled and not an invitation */}
      {features?.socialLogin && !isInvitation && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleSocialLogin('github')}
              disabled={loading}
              className="h-11"
            >
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="h-11"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or continue with email
              </span>
            </div>
          </div>
        </>
      )}

      {/* Email Already Exists - Resend Option */}
      {showResendOption && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Account already exists
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  An account with this email already exists. If you haven&apos;t verified your email yet, you can request a new verification link.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                >
                  {resending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Resend verification
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
                >
                  Go to login
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sign Up Form */}
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
            autoComplete="name"
            autoFocus
          />
        </div>

        {/* Email field - locked when from invitation */}
        {isInvitation ? (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email address
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={email}
                readOnly
                disabled
                className="pr-10 bg-muted"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              This email was specified in your invitation
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          {password && (
            <div className="mt-2 space-y-1.5">
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                      req.met
                        ? 'bg-success/20 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {req.met && <Check className="h-3 w-3" />}
                  </div>
                  <span className={req.met ? 'text-success' : 'text-muted-foreground'}>
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive mt-1">Passwords do not match</p>
          )}
        </div>
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Terms */}
      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy Policy
        </Link>
      </p>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
