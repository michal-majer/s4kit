import { StatsCardsSkeleton } from '@/components/ui/card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border-0 bg-card overflow-hidden shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/30 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-40 rounded-lg" />
        </div>
      </div>
      {/* Chart area */}
      <div className="p-4">
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <StatsCardsSkeleton />

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Full-width Chart */}
      <ChartSkeleton />
    </div>
  );
}
