import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function SecuritySettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Active Sessions Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-44" />
          </div>
          <div className="divide-y divide-border rounded-xl border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-40" />
                      {i === 0 && <Skeleton className="h-5 w-16 rounded-full" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                {i !== 0 && <Skeleton className="h-8 w-8" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
