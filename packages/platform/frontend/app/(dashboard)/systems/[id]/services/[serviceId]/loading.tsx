import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function ServicePreviewLoading() {
  return (
    <div className="p-8 space-y-6">
      <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={2} />
        </CardContent>
      </Card>
    </div>
  );
}
