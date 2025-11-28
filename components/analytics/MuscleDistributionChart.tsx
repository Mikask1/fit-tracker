'use client';

import { trpc } from '@/lib/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatVolume } from '@/lib/utils/volumeCalculation';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface MuscleDistributionChartProps {
  startDate: Date;
  endDate: Date;
}

const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#3b82f6', // blue-500
  Back: '#10b981', // green-500
  Legs: '#f59e0b', // amber-500
  Shoulders: '#8b5cf6', // violet-500
  Arms: '#ec4899', // pink-500
  Core: '#14b8a6', // teal-500
  Cardio: '#f43f5e', // rose-500
};

export function MuscleDistributionChart({
  startDate,
  endDate,
}: MuscleDistributionChartProps) {
  const { data, isLoading, error } =
    trpc.analytics.getMuscleDistribution.useQuery({
      startDate,
      endDate,
    });

  if (isLoading) {
    return (
      <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center text-muted-foreground">
        No completed workouts in this period
      </div>
    );
  }

  // Calculate total volume for percentages
  const totalVolume = data.reduce((sum, item) => sum + item.volume, 0);

  // Transform data for Recharts
  const chartData = data.map((item) => ({
    name: item.muscleGroup,
    value: item.volume,
    percentage: ((item.volume / totalVolume) * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry: any) => `${entry.name} ${entry.percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={MUSCLE_COLORS[entry.name] || '#6b7280'}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg shadow-lg p-3">
                  <p className="font-semibold">{data.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Volume: {formatVolume(data.value)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.percentage}% of total
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-sm">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
