'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Link, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

type Provider = 'github' | 'google';

interface ConnectedAccount {
  provider: Provider;
  email?: string;
  username?: string;
  connectedAt: string;
}

// Provider configuration
const providers: Record<Provider, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  github: {
    name: 'GitHub',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    color: 'text-zinc-900 dark:text-white',
    bgColor: 'bg-zinc-100 dark:bg-zinc-800',
  },
  google: {
    name: 'Google',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    color: 'text-zinc-900 dark:text-white',
    bgColor: 'bg-white dark:bg-zinc-800 border',
  },
};

// Mock data
const mockConnectedAccounts: ConnectedAccount[] = [
  {
    provider: 'github',
    username: 'johndoe',
    connectedAt: '2024-01-15',
  },
];

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(mockConnectedAccounts);
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<Provider | null>(null);

  const isConnected = (provider: Provider) =>
    accounts.some((a) => a.provider === provider);

  const getAccount = (provider: Provider) =>
    accounts.find((a) => a.provider === provider);

  const handleConnect = async (provider: Provider) => {
    setLoadingProvider(provider);
    try {
      // TODO: Redirect to OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Connected to ${providers[provider].name}`);
      setAccounts((prev) => [
        ...prev,
        {
          provider,
          username: 'newuser',
          connectedAt: new Date().toISOString(),
        },
      ]);
    } catch {
      toast.error(`Failed to connect to ${providers[provider].name}`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectProvider) return;

    setLoadingProvider(disconnectProvider);
    try {
      // TODO: API call to disconnect
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success(`Disconnected from ${providers[disconnectProvider].name}`);
      setAccounts((prev) => prev.filter((a) => a.provider !== disconnectProvider));
    } catch {
      toast.error(`Failed to disconnect from ${providers[disconnectProvider].name}`);
    } finally {
      setLoadingProvider(null);
      setDisconnectProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect your accounts for easier sign-in and enhanced features.
      </p>

      <div className="divide-y divide-border rounded-xl border bg-card">
        {(Object.keys(providers) as Provider[]).map((provider) => {
          const config = providers[provider];
          const connected = isConnected(provider);
          const account = getAccount(provider);
          const isLoading = loadingProvider === provider;

          return (
            <div
              key={provider}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'shrink-0 rounded-lg p-2.5',
                    config.bgColor
                  )}
                >
                  {config.icon}
                </div>
                <div>
                  <p className="font-medium">{config.name}</p>
                  {connected && account ? (
                    <p className="text-sm text-muted-foreground">
                      {account.username || account.email}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>

              {connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisconnectProvider(provider)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="mr-2 h-4 w-4" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConnect(provider)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link className="mr-2 h-4 w-4" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Disconnect confirmation */}
      <AlertDialog
        open={!!disconnectProvider}
        onOpenChange={(open) => !open && setDisconnectProvider(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to sign in using your{' '}
              {disconnectProvider && providers[disconnectProvider].name} account.
              Make sure you have another way to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
