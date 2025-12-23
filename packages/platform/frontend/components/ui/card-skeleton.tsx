'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn("rounded-3xl border-0 bg-card overflow-hidden shadow-sm", className)}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-10 w-16 rounded-xl" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
          <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
