import { Skeleton } from '@/components/ui/skeleton';

export default function AuthenticationSettingsLoading() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-card">
        <div className="p-6 space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="p-6 pt-0">
          {/* Table header skeleton */}
          <div className="rounded-md border">
            <div className="border-b p-4">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32 hidden md:block" />
                <Skeleton className="h-4 w-20 hidden sm:block" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            </div>
            {/* Table rows skeleton */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b last:border-0 p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-48 hidden md:block" />
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <div className="flex gap-1 ml-auto">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
