import { TableSkeleton } from '@/components/ui/table-skeleton';
import { Card } from '@/components/ui/card';

export default function LogsLoading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>
      <Card className="overflow-hidden">
        <TableSkeleton columns={8} rows={10} />
      </Card>
    </div>
  );
}
