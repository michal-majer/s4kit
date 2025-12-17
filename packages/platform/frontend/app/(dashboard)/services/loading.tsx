import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function ServicesLoading() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      <TableSkeleton columns={6} rows={5} />
    </div>
  );
}
