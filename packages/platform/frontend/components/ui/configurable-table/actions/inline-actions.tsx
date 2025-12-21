'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InlineActions as InlineActionsConfig } from '../types';
import Link from 'next/link';

interface InlineActionsProps<T> {
  config: InlineActionsConfig<T>;
  item: T;
}

export function InlineActions<T>({ config, item }: InlineActionsProps<T>) {
  const visibleItems = config.items.filter(action =>
    !action.show || action.show(item)
  );

  return (
    <div
      className={cn(
        'flex items-center justify-end gap-1',
        config.showOnHover && 'opacity-0 group-hover:opacity-100 transition-opacity'
      )}
    >
      {visibleItems.map((action, index) => {
        const Icon = action.icon;
        const label = typeof action.label === 'function' ? action.label(item) : action.label;
        const href = action.href
          ? (typeof action.href === 'function' ? action.href(item) : action.href)
          : undefined;

        const buttonContent = (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              action.variant === 'destructive' && 'text-destructive hover:text-destructive hover:bg-destructive/10'
            )}
            onClick={href ? undefined : (e) => {
              e.stopPropagation();
              action.onClick(item);
            }}
            title={label}
          >
            {Icon && <Icon className="h-4 w-4" />}
          </Button>
        );

        if (href) {
          return (
            <Link key={index} href={href} onClick={(e) => e.stopPropagation()}>
              {buttonContent}
            </Link>
          );
        }

        return <span key={index}>{buttonContent}</span>;
      })}
    </div>
  );
}
