'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Key,
  FileText,
  Layers,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Hexagon,
  Cloud,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/auth-provider';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { api, type PlatformInfo } from '@/lib/api';

interface SidebarUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/systems', label: 'Systems', icon: Server },
  { href: '/services', label: 'Services', icon: Layers },
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/logs', label: 'Request Logs', icon: FileText },
];

const secondaryNavItems: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  user: SidebarUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const { organizationName } = useAuth();

  useEffect(() => {
    setMounted(true);
    // Fetch platform info
    api.platform.getInfo()
      .then(setPlatformInfo)
      .catch(() => {
        // Silently fail - standalone is the default
      });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-sidebar-border/50 bg-sidebar">
      {/* Logo Section */}
      <div className="flex h-[56px] items-center gap-3 border-b border-sidebar-border/50 px-4">
        <div className="relative flex h-9 w-9 items-center justify-center">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-accent/60 opacity-20" />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Hexagon className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-bold tracking-tight">S4Kit</span>
          {platformInfo && platformInfo.platform !== 'standalone' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 px-2 py-0.5 transition-all hover:from-sky-500/30 hover:to-blue-500/30">
                  <Cloud className="h-3 w-3 text-sky-500" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    {platformInfo.platform === 'sap-btp' ? 'SAP BTP' : 'Cloud Foundry'}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">
                    {platformInfo.platform === 'sap-btp' ? 'Running on SAP Business Technology Platform' : 'Running on Cloud Foundry'}
                  </span>
                  {(platformInfo.space || platformInfo.organization) && (
                    <span className="text-muted-foreground">
                      {platformInfo.organization && platformInfo.space
                        ? `${platformInfo.organization} / ${platformInfo.space}`
                        : platformInfo.space || platformInfo.organization}
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Platform
            </span>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Navigation
          </span>
        </div>
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                )}
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300',
                  active ? 'bg-white/20' : 'bg-sidebar-accent/50 group-hover:bg-sidebar-accent'
                )}>
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      !active && 'group-hover:scale-110'
                    )}
                    strokeWidth={active ? 2 : 1.75}
                  />
                </div>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {item.badge}
                  </span>
                )}
                {!active && (
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-50" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-sidebar-border" />

        {/* Secondary Navigation */}
        <div className="mb-2 px-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Account
          </span>
        </div>
        <div className="space-y-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-300',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
                )}
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-300',
                  active ? 'bg-white/20' : 'bg-sidebar-accent/50 group-hover:bg-sidebar-accent'
                )}>
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      !active && 'group-hover:scale-110'
                    )}
                    strokeWidth={active ? 2 : 1.75}
                  />
                </div>
                <span className="flex-1">{item.label}</span>
                {!active && (
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-50" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border/50 p-3">
        {/* Organization Badge */}
        <div className="mb-2 px-2">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-[11px] font-semibold text-muted-foreground truncate">
              {organizationName}
            </span>
          </div>
        </div>

        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-all duration-300 hover:bg-sidebar-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                <Avatar className="h-8 w-8 ring-2 ring-sidebar-border/50 transition-all duration-300 group-hover:ring-accent/50">
                  <AvatarImage src={user.image || undefined} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-[10px] font-bold text-primary-foreground">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" sideOffset={8} className="w-52 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-lg">
                <Link href="/settings/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer rounded-lg text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex w-full items-center gap-2.5 rounded-xl p-2.5">
            <Avatar className="h-8 w-8 ring-2 ring-sidebar-border/50">
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-[10px] font-bold text-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>
    </aside>
  );
}
