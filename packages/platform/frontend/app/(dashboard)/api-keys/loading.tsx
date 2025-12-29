import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApiKeysLoading() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-32 mt-3 sm:mt-0" />
      </div>
      <TableSkeleton columns={6} rows={5} />
    </div>
  );
}


