'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ChartCardProps {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  icon: Icon,
  children,
  action,
  className,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl border-0 bg-card',
        'shadow-sm transition-all duration-300 ease-out',
        'hover:shadow-xl hover:-translate-y-0.5',
        className
      )}
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/30 p-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                </div>
              )}
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
          </div>
          {action && (
            <div className="shrink-0">{action}</div>
          )}
        </div>

        {/* Chart Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
