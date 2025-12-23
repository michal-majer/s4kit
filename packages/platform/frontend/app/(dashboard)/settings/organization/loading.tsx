import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function OrganizationSettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Organization Details Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <div className="flex">
              <Skeleton className="h-10 w-24 rounded-r-none" />
              <Skeleton className="h-10 flex-1 rounded-l-none" />
            </div>
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="divide-y divide-border rounded-xl border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
