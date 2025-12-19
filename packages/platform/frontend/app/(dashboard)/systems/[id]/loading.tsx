import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function Loading() {
  return (
    <div className="p-8">
      <CardSkeleton className="mb-8" />
      <div className="grid gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
