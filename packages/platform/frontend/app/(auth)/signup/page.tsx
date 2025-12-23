'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowRight, Check } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        toast.error(result.error.message || 'Sign up failed');
        setLoading(false);
        return;
      }

      toast.success('Account created! Please check your email to verify.');
      router.push('/login');
    } catch (error: any) {
      toast.error(error.message || 'Sign up failed');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground">
          Get started with S4Kit in minutes
        </p>
      </div>

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
          />
        </div>
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
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
