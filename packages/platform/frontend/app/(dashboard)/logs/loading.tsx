import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Card } from '@/components/ui/card';

export default function LogsLoading() {
  return (
    <div className="flex flex-col gap-5 p-5 lg:p-6">
      <div className="space-y-1.5">
        <div className="h-7 w-40 bg-muted animate-pulse rounded" />
        <div className="h-3.5 w-80 bg-muted animate-pulse rounded" />
      </div>
      <Card className="overflow-hidden">
        <TableSkeleton columns={8} rows={10} />
      </Card>
    </div>
  );
}
