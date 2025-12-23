'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  UserPlus,
  UserMinus,
  Key,
  Settings,
  Shield,
  Server,
  Trash2,
  Edit,
  LogIn,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type AuditAction =
  | 'member.invited'
  | 'member.removed'
  | 'member.role_changed'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'api_key.rotated'
  | 'system.created'
  | 'system.updated'
  | 'system.deleted'
  | 'organization.updated'
  | '2fa.enabled'
  | '2fa.disabled'
  | 'session.login'
  | 'session.logout';

interface AuditEntry {
  id: string;
  action: AuditAction;
  actor: {
    name: string;
    email: string;
  };
  target?: string;
  metadata?: Record<string, string>;
  ipAddress: string;
  timestamp: string;
}

// Mock data
const mockAuditLog: AuditEntry[] = [
  {
    id: '1',
    action: 'api_key.created',
    actor: { name: 'John Doe', email: 'john@example.com' },
    target: 'Production API Key',
    ipAddress: '192.168.1.1',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    action: 'member.invited',
    actor: { name: 'John Doe', email: 'john@example.com' },
    target: 'jane@example.com',
    metadata: { role: 'admin' },
    ipAddress: '192.168.1.1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    action: 'system.created',
    actor: { name: 'Jane Smith', email: 'jane@example.com' },
    target: 'ERP Production',
    ipAddress: '10.0.0.1',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    action: '2fa.enabled',
    actor: { name: 'John Doe', email: 'john@example.com' },
    ipAddress: '192.168.1.1',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    action: 'session.login',
    actor: { name: 'Bob Wilson', email: 'bob@example.com' },
    metadata: { device: 'Chrome on MacOS' },
    ipAddress: '172.16.0.1',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    action: 'api_key.revoked',
    actor: { name: 'John Doe', email: 'john@example.com' },
    target: 'Test API Key',
    ipAddress: '192.168.1.1',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const actionConfig: Record<AuditAction, {
  label: string;
  icon: LucideIcon;
  color: string;
}> = {
  'member.invited': {
    label: 'Invited member',
    icon: UserPlus,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/50',
  },
  'member.removed': {
    label: 'Removed member',
    icon: UserMinus,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/50',
  },
  'member.role_changed': {
    label: 'Changed role',
    icon: Settings,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50',
  },
  'api_key.created': {
    label: 'Created API key',
    icon: Key,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50',
  },
  'api_key.revoked': {
    label: 'Revoked API key',
    icon: Key,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/50',
  },
  'api_key.rotated': {
    label: 'Rotated API key',
    icon: Key,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50',
  },
  'system.created': {
    label: 'Created system',
    icon: Server,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50',
  },
  'system.updated': {
    label: 'Updated system',
    icon: Edit,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/50',
  },
  'system.deleted': {
    label: 'Deleted system',
    icon: Trash2,
    color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950/50',
  },
  'organization.updated': {
    label: 'Updated organization',
    icon: Settings,
    color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/50',
  },
  '2fa.enabled': {
    label: 'Enabled 2FA',
    icon: Shield,
    color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50',
  },
  '2fa.disabled': {
    label: 'Disabled 2FA',
    icon: Shield,
    color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50',
  },
  'session.login': {
    label: 'Signed in',
    icon: LogIn,
    color: 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800',
  },
  'session.logout': {
    label: 'Signed out',
    icon: LogOut,
    color: 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800',
  },
};

export function AuditLog() {
  const [entries] = useState<AuditEntry[]>(mockAuditLog);
  const [showAll, setShowAll] = useState(false);

  const displayedEntries = showAll ? entries : entries.slice(0, 5);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Recent activity in your organization
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-0">
            {displayedEntries.map((entry, index) => {
              const config = actionConfig[entry.action];
              const Icon = config.icon;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'relative flex gap-4 pb-6',
                    index === displayedEntries.length - 1 && 'pb-0'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 shrink-0 rounded-full p-2',
                      config.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{entry.actor.name}</span>
                          {' '}
                          <span className="text-muted-foreground">
                            {config.label.toLowerCase()}
                          </span>
                          {entry.target && (
                            <>
                              {' '}
                              <span className="font-medium">{entry.target}</span>
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground cursor-default">
                                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(entry.timestamp), 'PPpp')}
                            </TooltipContent>
                          </Tooltip>
                          <span className="text-xs text-muted-foreground">
                            &middot;
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {entry.ipAddress}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Show more */}
        {entries.length > 5 && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show less' : `Show ${entries.length - 5} more`}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
