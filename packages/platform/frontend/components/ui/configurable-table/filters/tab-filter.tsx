'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TabFilter as TabFilterConfig } from '../types';

interface TabFilterProps<T> {
  config: TabFilterConfig<T>;
  value: string;
  onChange: (value: string) => void;
  data: T[];
}

export function TabFilter<T>({ config, value, onChange, data }: TabFilterProps<T>) {
  const optionsWithCounts = useMemo(() => {
    const baseOptions = typeof config.options === 'function'
      ? config.options(data)
      : config.options;

    return baseOptions.map(opt => ({
      ...opt,
      count: data.filter(item => config.getItemValue(item) === opt.value).length,
    }));
  }, [config, data]);

  const allOptions = useMemo(() => {
    if (config.showAllOption) {
      return [
        { value: 'all', label: config.allLabel || 'All', count: data.length },
        ...optionsWithCounts,
      ];
    }
    return optionsWithCounts;
  }, [config.showAllOption, config.allLabel, optionsWithCounts, data.length]);

  return (
    <div className="flex items-center gap-2">
      {allOptions.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            {opt.label}
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background/60'
              )}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
