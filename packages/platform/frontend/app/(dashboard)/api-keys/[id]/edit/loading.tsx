import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <CardSkeleton />
    </div>
  );
}
