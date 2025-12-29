'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn("rounded-xl border-0 bg-card overflow-hidden shadow-sm", className)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5 flex-1">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-lg" />
            <Skeleton className="h-2.5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
