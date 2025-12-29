import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 bg-muted animate-pulse rounded" />
          <div className="h-3.5 w-56 bg-muted animate-pulse rounded mt-1.5" />
        </div>
        <div className="h-9 w-28 bg-muted animate-pulse rounded" />
      </div>
      <TableSkeleton columns={4} rows={5} />
    </div>
  );
}
