import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function Loading() {
  return (
    <div className="p-5 lg:p-6">
      <CardSkeleton className="mb-5" />
      <div className="grid gap-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
