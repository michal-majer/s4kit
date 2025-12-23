import { StatsCardsSkeleton } from '@/components/ui/card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-3xl border-0 bg-card overflow-hidden shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border/30 p-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <Skeleton className="h-5 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
      </div>
      {/* Chart area */}
      <div className="p-6">
        <Skeleton className="h-[280px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-5 w-96 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <StatsCardsSkeleton />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Full-width Chart */}
      <ChartSkeleton />
    </div>
  );
}
