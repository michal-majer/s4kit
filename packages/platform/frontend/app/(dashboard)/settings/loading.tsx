import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Card skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="p-6 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="p-6 pt-0 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
