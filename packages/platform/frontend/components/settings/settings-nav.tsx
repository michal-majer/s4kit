'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, Shield, User, ChevronRight, KeyRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
}

const settingsNavItems: NavItem[] = [
  {
    href: '/settings/organization',
    label: 'Organization',
    description: 'Manage your organization settings',
    icon: Building2,
    ownerOnly: true,
  },
  {
    href: '/settings/authentication',
    label: 'SAP Authentication',
    description: 'Manage SAP connection credentials',
    icon: KeyRound,
  },
  {
    href: '/settings/security',
    label: 'Security',
    description: 'Authentication and access control',
    icon: Shield,
  },
  {
    href: '/settings/profile',
    label: 'Profile',
    description: 'Your personal account settings',
    icon: User,
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { userRole } = useAuth();
  const isOwner = userRole === 'owner';

  // Filter nav items based on role
  const visibleItems = settingsNavItems.filter(item => !item.ownerOnly || isOwner);

  return (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-4 py-3.5',
              'transition-all duration-200 ease-out',
              isActive
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {/* Active indicator */}
            {isActive && (
              <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" />
            )}

            <div
              className={cn(
                'shrink-0 rounded-lg p-2 transition-all duration-200',
                isActive
                  ? 'bg-primary-foreground/15'
                  : 'bg-muted/50 group-hover:bg-accent/10'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={isActive ? 2.5 : 2} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{item.label}</p>
              <p
                className={cn(
                  'text-xs transition-colors duration-200',
                  isActive
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                )}
              >
                {item.description}
              </p>
            </div>

            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-all duration-200',
                isActive
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
