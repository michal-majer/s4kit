import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-3.5 w-64 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <CardSkeleton />
    </div>
  );
}
