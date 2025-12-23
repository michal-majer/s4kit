'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { api, type UserSession } from '@/lib/api';

type DeviceType = 'desktop' | 'mobile' | 'tablet';

const deviceIcons: Record<DeviceType, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

// Parse user agent to get device info
function parseUserAgent(userAgent?: string): { device: string; browser: string; deviceType: DeviceType } {
  if (!userAgent) {
    return { device: 'Unknown Device', browser: 'Unknown Browser', deviceType: 'desktop' };
  }

  // Detect device type
  let deviceType: DeviceType = 'desktop';
  let device = 'Desktop';

  if (/iPad/.test(userAgent)) {
    deviceType = 'tablet';
    device = 'iPad';
  } else if (/iPhone/.test(userAgent)) {
    deviceType = 'mobile';
    device = 'iPhone';
  } else if (/Android.*Mobile/.test(userAgent)) {
    deviceType = 'mobile';
    device = 'Android Phone';
  } else if (/Android/.test(userAgent)) {
    deviceType = 'tablet';
    device = 'Android Tablet';
  } else if (/Mac/.test(userAgent)) {
    device = 'Mac';
  } else if (/Windows/.test(userAgent)) {
    device = 'Windows PC';
  } else if (/Linux/.test(userAgent)) {
    device = 'Linux';
  }

  // Detect browser
  let browser = 'Unknown Browser';
  if (/Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent)) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    browser = `Chrome ${match?.[1] || ''}`.trim();
  } else if (/Firefox/.test(userAgent)) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    browser = `Firefox ${match?.[1] || ''}`.trim();
  } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
    const match = userAgent.match(/Version\/(\d+)/);
    browser = `Safari ${match?.[1] || ''}`.trim();
  } else if (/Edge|Edg/.test(userAgent)) {
    const match = userAgent.match(/(?:Edge|Edg)\/(\d+)/);
    browser = `Edge ${match?.[1] || ''}`.trim();
  }

  return { device, browser, deviceType };
}

interface SessionsListProps {
  initialSessions: UserSession[];
}

export function SessionsList({ initialSessions }: SessionsListProps) {
  const [sessions, setSessions] = useState<UserSession[]>(initialSessions);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const router = useRouter();

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await api.sessions.revoke(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session revoked');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setIsRevokingAll(true);
    try {
      const result = await api.sessions.revokeAll();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(`${result.revokedCount} session${result.revokedCount !== 1 ? 's' : ''} revoked`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke sessions');
    } finally {
      setIsRevokingAll(false);
      setShowRevokeAll(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
        </p>
        {otherSessionsCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevokeAll(true)}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out other sessions
          </Button>
        )}
      </div>

      {/* Sessions List */}
      <div className="divide-y divide-border rounded-xl border bg-card">
        {sessions.map((session) => {
          const { device, browser, deviceType } = parseUserAgent(session.userAgent);
          const DeviceIcon = deviceIcons[deviceType];
          const isRevoking = revokingId === session.id;

          return (
            <div
              key={session.id}
              className={cn(
                'flex items-center justify-between gap-4 p-4',
                'transition-colors hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={cn(
                    'shrink-0 rounded-lg p-2.5',
                    session.isCurrent
                      ? 'bg-emerald-100 dark:bg-emerald-950/50'
                      : 'bg-muted'
                  )}
                >
                  <DeviceIcon
                    className={cn(
                      'h-5 w-5',
                      session.isCurrent
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    )}
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {device} &middot; {browser}
                    </p>
                    {session.isCurrent && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      >
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {session.ipAddress && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.ipAddress}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.isCurrent
                      ? 'Active now'
                      : `Last active ${formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}`}
                  </p>
                </div>
              </div>

              {!session.isCurrent && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={isRevoking}
                    >
                      {isRevoking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Revoke session
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {/* Revoke All Dialog */}
      <AlertDialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of {otherSessionsCount} other{' '}
              {otherSessionsCount === 1 ? 'session' : 'sessions'}. You will remain
              signed in on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOthers}
              disabled={isRevokingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevokingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign out all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
