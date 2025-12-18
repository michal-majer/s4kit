import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function ApiKeysLoading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36 mt-4 sm:mt-0" />
      </div>
      <TableSkeleton columns={6} rows={5} />
    </div>
  );
}

