import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function ApiKeysLoading() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        <div className="h-10 w-36 bg-muted rounded animate-pulse" />
      </div>
      <TableSkeleton columns={5} rows={5} />
    </div>
  );
}
