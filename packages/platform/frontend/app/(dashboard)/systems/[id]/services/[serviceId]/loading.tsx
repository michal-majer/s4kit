import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function ServicePreviewLoading() {
  return (
    <div className="p-5 lg:p-6 space-y-4">
      <div className="h-7 w-56 bg-muted animate-pulse rounded" />
      <Card>
        <CardHeader>
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={2} />
        </CardContent>
      </Card>
    </div>
  );
}
