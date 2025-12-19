import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
      <TableSkeleton columns={4} rows={5} />
    </div>
  );
}
