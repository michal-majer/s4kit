'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, Key, FileText, Layers, Zap, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/systems', label: 'Systems', icon: Server },
  { href: '/services', label: 'Services', icon: Layers },
  { href: '/api-keys', label: 'API Keys', icon: Key },
  { href: '/logs', label: 'Logs', icon: FileText },
];

const secondaryNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      {/* Logo Section */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">S4Kit</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Main Menu
        </p>
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                  isActive && 'text-primary-foreground'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="border-t p-4">
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                  isActive && 'text-primary-foreground'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}


