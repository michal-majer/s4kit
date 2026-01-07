'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Mail } from 'lucide-react';

type PlatformFeatures = {
  signup: boolean;
  socialLogin: boolean;
  billing: boolean;
  multiOrg: boolean;
  xsuaaEnabled: boolean;
  xsuaaOnly: boolean;
};

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [features, setFeatures] = useState<PlatformFeatures | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [showResendOption, setShowResendOption] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyPending = searchParams.get('verify') === 'pending';
  const redirectUrl = searchParams.get('redirect');

  useEffect(() => {
    api.platformInfo.get()
      .then((info) => setFeatures(info.features))
      .catch(() => {
        // Default to selfhost if can't fetch
        setFeatures({ signup: false, socialLogin: false, billing: false, multiOrg: false, xsuaaEnabled: false, xsuaaOnly: false });
      })
      .finally(() => setFeaturesLoading(false));
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendOption(false);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        const errorMessage = result.error.message?.toLowerCase() || '';
        const errorCode = result.error.code?.toLowerCase() || '';

        // Check for email not verified errors
        const isEmailNotVerified =
          errorCode.includes('email_not_verified') ||
          errorCode.includes('not_verified') ||
          errorMessage.includes('email is not verified') ||
          errorMessage.includes('email not verified') ||
          errorMessage.includes('verify your email') ||
          errorMessage.includes('account is inactive');

        if (isEmailNotVerified) {
          setShowResendOption(true);
          toast.error('Please verify your email address to continue');
        } else {
          toast.error(result.error.message || 'Login failed');
        }
        setLoading(false);
        return;
      }

      toast.success('Welcome back!');
      router.push(redirectUrl || '/');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
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

  const handleXsuaaLogin = async () => {
    try {
      await signIn.oauth2({
        providerId: 'xsuaa',
        callbackURL: redirectUrl || window.location.origin,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with SAP';
      toast.error(message);
    }
  };

  // Show loading skeleton while fetching platform features
  if (featuresLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-12 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Email Verification Pending Banner */}
      {verifyPending && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Check your email
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                We&apos;ve sent you a verification link. Please check your inbox and click the link to verify your account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Not Verified - Resend Option */}
      {showResendOption && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Email not verified
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Your email address hasn&apos;t been verified yet. Check your inbox for the verification link, or request a new one.
                </p>
              </div>
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
                Resend verification email
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* SAP BTP Login - only show if XSUAA is enabled */}
      {features?.xsuaaEnabled && (
        <>
          <Button
            type="button"
            onClick={handleXsuaaLogin}
            disabled={loading}
            className="w-full h-12 bg-[#0070f2] hover:bg-[#0058c4] text-white font-medium shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span>Sign in with</span>
              <div className="bg-white/20 rounded px-1.5 py-0.5">
                <span className="text-xs font-bold tracking-wide">SAP</span>
              </div>
            </div>
          </Button>

          {/* Divider - only show if there are other login options */}
          {!features?.xsuaaOnly && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Or
              </span>
            </div>
          </div>
          )}
        </>
      )}

      {/* Social Login Buttons - only show if enabled */}
      {features?.socialLogin && (
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

      {/* Email Login Form - hide when xsuaaOnly */}
      {!features?.xsuaaOnly && (
      <form onSubmit={handleEmailLogin} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link
              href="/forgot-password"
              tabIndex={-1}
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full h-11" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      )}

      {/* Footer - only show signup link if enabled */}
      {features?.signup && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={redirectUrl ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/signup'}
            className="font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Create an account
          </Link>
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="h-11 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
