import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileSettingsLoading() {
  return (
    <div className="space-y-8">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Form */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>

      {/* Password Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-36" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
