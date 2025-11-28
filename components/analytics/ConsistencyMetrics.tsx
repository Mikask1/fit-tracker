'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';

interface ConsistencyMetricsProps {
  startDate: Date;
  endDate: Date;
}

export function ConsistencyMetrics({
  startDate,
  endDate,
}: ConsistencyMetricsProps) {
  const { data, isLoading, error } =
    trpc.analytics.getConsistencyMetrics.useQuery({
      startDate,
      endDate,
    });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-20 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-20 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data || data.totalPlanned === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          No data in this period
        </CardContent>
      </Card>
    );
  }

  // Determine colors based on values
  const completionRateColor =
    data.completionRate >= 80
      ? 'text-green-600'
      : data.completionRate >= 50
        ? 'text-yellow-600'
        : 'text-red-600';

  const missedDaysColor = data.missedDays > 0 ? 'text-red-600' : 'text-green-600';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Completion Rate Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${completionRateColor}`}>
            {data.completionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.totalCompleted} of {data.totalPlanned} workouts completed
          </p>
        </CardContent>
      </Card>

      {/* Missed Days Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Missed Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${missedDaysColor}`}>
            {data.missedDays}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.missedDays === 0
              ? 'Perfect consistency!'
              : 'planned workouts not completed'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
