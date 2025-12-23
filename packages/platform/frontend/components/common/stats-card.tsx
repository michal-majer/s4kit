'use client';

import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Server,
  Key,
  Activity,
  BarChart3,
  Users,
  Shield,
  Zap,
  Database,
  Globe,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  type LucideIcon,
} from "lucide-react";

type StatsCardVariant = 'default' | 'lavender' | 'mint' | 'purple' | 'pink' | 'gradient';

type IconName = 'server' | 'key' | 'activity' | 'bar-chart' | 'users' | 'shield' | 'zap' | 'database' | 'globe' | 'settings' | 'check-circle' | 'x-circle' | 'clock';

const iconMap: Record<IconName, LucideIcon> = {
  'server': Server,
  'key': Key,
  'activity': Activity,
  'bar-chart': BarChart3,
  'users': Users,
  'shield': Shield,
  'zap': Zap,
  'database': Database,
  'globe': Globe,
  'settings': Settings,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'clock': Clock,
};

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: IconName;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: StatsCardVariant;
  className?: string;
}

const variantStyles: Record<StatsCardVariant, {
  bg: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  subtextColor: string;
}> = {
  default: {
    bg: 'bg-card',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    textColor: 'text-card-foreground',
    subtextColor: 'text-muted-foreground',
  },
  lavender: {
    bg: 'bg-[oklch(0.94_0.05_300)] dark:bg-[oklch(0.28_0.08_290)]',
    iconBg: 'bg-[oklch(0.85_0.1_290)] dark:bg-[oklch(0.4_0.12_290)]',
    iconColor: 'text-[oklch(0.45_0.2_290)] dark:text-[oklch(0.85_0.15_290)]',
    textColor: 'text-[oklch(0.25_0.1_290)] dark:text-white',
    subtextColor: 'text-[oklch(0.45_0.08_290)] dark:text-[oklch(0.75_0.05_290)]',
  },
  mint: {
    bg: 'bg-[oklch(0.94_0.06_175)] dark:bg-[oklch(0.28_0.08_175)]',
    iconBg: 'bg-[oklch(0.85_0.12_175)] dark:bg-[oklch(0.4_0.14_175)]',
    iconColor: 'text-[oklch(0.4_0.18_175)] dark:text-[oklch(0.85_0.18_175)]',
    textColor: 'text-[oklch(0.2_0.1_175)] dark:text-white',
    subtextColor: 'text-[oklch(0.4_0.08_175)] dark:text-[oklch(0.75_0.08_175)]',
  },
  purple: {
    bg: 'bg-[oklch(0.92_0.08_280)] dark:bg-[oklch(0.26_0.1_280)]',
    iconBg: 'bg-[oklch(0.82_0.14_280)] dark:bg-[oklch(0.38_0.14_280)]',
    iconColor: 'text-[oklch(0.4_0.2_280)] dark:text-[oklch(0.85_0.15_280)]',
    textColor: 'text-[oklch(0.22_0.12_280)] dark:text-white',
    subtextColor: 'text-[oklch(0.42_0.1_280)] dark:text-[oklch(0.72_0.06_280)]',
  },
  pink: {
    bg: 'bg-[oklch(0.94_0.06_340)] dark:bg-[oklch(0.28_0.1_340)]',
    iconBg: 'bg-[oklch(0.85_0.12_340)] dark:bg-[oklch(0.4_0.14_340)]',
    iconColor: 'text-[oklch(0.45_0.2_340)] dark:text-[oklch(0.85_0.15_340)]',
    textColor: 'text-[oklch(0.25_0.12_340)] dark:text-white',
    subtextColor: 'text-[oklch(0.45_0.1_340)] dark:text-[oklch(0.75_0.08_340)]',
  },
  gradient: {
    bg: 'bg-gradient-to-br from-[oklch(0.5_0.2_280)] to-[oklch(0.45_0.22_320)]',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    textColor: 'text-white',
    subtextColor: 'text-white/70',
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const Icon = icon ? iconMap[icon] : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border-0 p-6",
        "shadow-sm transition-all duration-300 ease-out",
        "hover:shadow-xl hover:-translate-y-1",
        styles.bg,
        className
      )}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          <p className={cn(
            "text-[13px] font-semibold uppercase tracking-wider",
            styles.subtextColor
          )}>
            {title}
          </p>
          <div className="flex items-baseline gap-3">
            <p className={cn(
              "text-4xl font-bold tracking-tight tabular-nums",
              styles.textColor
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                  trend.isPositive
                    ? "bg-accent text-accent-foreground"
                    : "bg-destructive/90 text-white"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {description && (
            <p className={cn(
              "text-sm leading-relaxed",
              styles.subtextColor
            )}>
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "shrink-0 rounded-2xl p-3.5 transition-all duration-300",
            "group-hover:scale-110",
            styles.iconBg
          )}>
            <Icon className={cn("h-6 w-6", styles.iconColor)} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}
