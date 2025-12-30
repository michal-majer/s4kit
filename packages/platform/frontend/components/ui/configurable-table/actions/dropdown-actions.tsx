'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownActions as DropdownActionsConfig } from '../types';
import Link from 'next/link';

interface DropdownActionsProps<T> {
  config: DropdownActionsConfig<T>;
  item: T;
}

export function DropdownActions<T>({ config, item }: DropdownActionsProps<T>) {
  const TriggerIcon = config.triggerIcon || MoreHorizontal;

  const visibleItems = config.items.filter(action =>
    !action.show || action.show(item)
  );

  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => e.stopPropagation()}
        >
          <TriggerIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleItems.map((action, index) => {
          const Icon = action.icon;
          const label = typeof action.label === 'function' ? action.label(item) : action.label;
          const href = action.href
            ? (typeof action.href === 'function' ? action.href(item) : action.href)
            : undefined;

          return (
            <div key={index}>
              {action.separator && index > 0 && <DropdownMenuSeparator />}
              {href ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'cursor-pointer',
                      action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                    )}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(item);
                  }}
                  className={cn(
                    'cursor-pointer',
                    action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                  )}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {label}
                </DropdownMenuItem>
              )}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
