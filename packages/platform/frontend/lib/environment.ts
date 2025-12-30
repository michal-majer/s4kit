import type { InstanceEnvironment } from './api';

export const envLabels: Record<InstanceEnvironment, string> = {
  sandbox: 'Sandbox',
  dev: 'Development',
  quality: 'Quality',
  preprod: 'Pre-Production',
  production: 'Production',
};

export const envShortLabels: Record<InstanceEnvironment, string> = {
  sandbox: 'SBX',
  dev: 'DEV',
  quality: 'QA',
  preprod: 'PRE',
  production: 'PROD',
};

export const envColors: Record<InstanceEnvironment, string> = {
  sandbox: 'bg-purple-500',
  dev: 'bg-blue-500',
  quality: 'bg-amber-500',
  preprod: 'bg-orange-500',
  production: 'bg-red-500',
};

export const envBorderColors: Record<InstanceEnvironment, string> = {
  sandbox: 'border-t-purple-500',
  dev: 'border-t-blue-500',
  quality: 'border-t-amber-500',
  preprod: 'border-t-orange-500',
  production: 'border-t-red-500',
};

export const envBorderLeftColors: Record<InstanceEnvironment, string> = {
  sandbox: 'border-l-purple-500',
  dev: 'border-l-blue-500',
  quality: 'border-l-amber-500',
  preprod: 'border-l-orange-500',
  production: 'border-l-red-500',
};

export const envBorderAllColors: Record<InstanceEnvironment, string> = {
  sandbox: 'border-purple-200 dark:border-purple-800',
  dev: 'border-blue-200 dark:border-blue-800',
  quality: 'border-amber-200 dark:border-amber-800',
  preprod: 'border-orange-200 dark:border-orange-800',
  production: 'border-red-200 dark:border-red-800',
};

export const envBgColors: Record<InstanceEnvironment, string> = {
  sandbox: 'bg-purple-50 dark:bg-purple-950/30',
  dev: 'bg-blue-50 dark:bg-blue-950/30',
  quality: 'bg-amber-50 dark:bg-amber-950/30',
  preprod: 'bg-orange-50 dark:bg-orange-950/30',
  production: 'bg-red-50 dark:bg-red-950/30',
};

export const envBadgeVariant: Record<InstanceEnvironment, 'outline' | 'secondary' | 'default'> = {
  sandbox: 'outline',
  dev: 'outline',
  quality: 'secondary',
  preprod: 'secondary',
  production: 'default',
};

// Badge colors for compact display (logs, tables)
export const envBadgeColors: Record<InstanceEnvironment, string> = {
  sandbox: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  dev: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  quality: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  preprod: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
  production: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
};

// Lifecycle order for sorting instances
export const envOrder: Record<InstanceEnvironment, number> = {
  sandbox: 0,
  dev: 1,
  quality: 2,
  preprod: 3,
  production: 4,
};

// Total number of available environments
export const TOTAL_ENVIRONMENTS = Object.keys(envOrder).length;

// All environments in order
export const allEnvironments: InstanceEnvironment[] = ['sandbox', 'dev', 'quality', 'preprod', 'production'];
