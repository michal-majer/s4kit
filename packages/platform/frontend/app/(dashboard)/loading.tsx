import { StatsCardsSkeleton } from '@/components/ui/card-skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-8">
      <div className="h-9 w-32 bg-muted rounded mb-8 animate-pulse" />
      <StatsCardsSkeleton />
    </div>
  );
}
