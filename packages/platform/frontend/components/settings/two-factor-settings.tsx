'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TwoFactorSettingsProps {
  enabled?: boolean;
}

export function TwoFactorSettings({ enabled: initialEnabled = false }: TwoFactorSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mock secret for demo
  const mockSecret = 'JBSWY3DPEHPK3PXP';
  const mockQRCode = `otpauth://totp/S4Kit:user@example.com?secret=${mockSecret}&issuer=S4Kit`;

  const handleToggle = () => {
    if (enabled) {
      setShowDisableDialog(true);
    } else {
      setShowSetupDialog(true);
    }
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(mockSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable2FA = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: API call to verify and enable 2FA
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEnabled(true);
      setShowSetupDialog(false);
      setVerificationCode('');
      toast.success('Two-factor authentication enabled');
    } catch {
      toast.error('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    try {
      // TODO: API call to disable 2FA
      await new Promise((resolve) => setTimeout(resolve, 800));
      setEnabled(false);
      setShowDisableDialog(false);
      toast.success('Two-factor authentication disabled');
    } catch {
      toast.error('Failed to disable 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div
        className={cn(
          'flex items-center justify-between rounded-xl border p-4',
          enabled
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'rounded-lg p-2',
              enabled
                ? 'bg-emerald-100 dark:bg-emerald-900/50'
                : 'bg-amber-100 dark:bg-amber-900/50'
            )}
          >
            {enabled ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {enabled ? '2FA is enabled' : '2FA is not enabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? 'Your account is protected with two-factor authentication.'
                : 'Add an extra layer of security to your account.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            aria-label="Toggle two-factor authentication"
          />
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p>
              Two-factor authentication adds an additional layer of security by
              requiring a code from your authenticator app when signing in.
            </p>
            <p className="mt-2">
              We recommend using apps like Google Authenticator, Authy, or 1Password.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the
              verification code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* QR Code Placeholder */}
            <div className="flex justify-center">
              <div className="rounded-xl border bg-white p-4">
                <div className="h-40 w-40 bg-muted flex items-center justify-center rounded-lg">
                  <div className="text-center text-sm text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2" />
                    QR Code
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Or enter this code manually:
              </Label>
              <div className="flex gap-2">
                <code className="flex-1 rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
                  {mockSecret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Verification Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center font-mono text-lg tracking-widest"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnable2FA} disabled={isLoading || verificationCode.length !== 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra layer of security from your account. You
              can re-enable it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
