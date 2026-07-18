'use client';

import { trpc } from '@/lib/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatVolume } from '@/lib/utils/volumeCalculation';
import { getDrillDownColor } from '@/lib/utils/colorUtils';
import {
  MUSCLE_HIERARCHY,
  getSpecificMuscles,
  MainMuscleGroup,
} from '@/lib/constants/muscleGroups';
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
  drillPath: string[];
  onDrillDown: (segment: string) => void;
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

// Helper function to determine if an item is drillable
function isDrillable(itemName: string, drillPath: string[]): boolean {
  const level = drillPath.length;

  if (level === 0) {
    // Main groups always drillable
    return true;
  } else if (level === 1) {
    // Check if category has specific muscles
    const mainGroup = drillPath[0] as MainMuscleGroup;
    const specifics = getSpecificMuscles(mainGroup, itemName);
    return specifics.length > 0;
  }
  // Level 2 (specific muscles) not drillable
  return false;
}

export function MuscleDistributionChart({
  startDate,
  endDate,
  drillPath,
  onDrillDown,
}: MuscleDistributionChartProps) {
  const { data, isLoading, error } =
    trpc.analytics.getMuscleDistribution.useQuery({
      startDate,
      endDate,
      drillPath,
    });

  if (isLoading) {
    return (
      <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  // Keep showing cached data when a background refetch fails (e.g. offline).
  if (error && !data) {
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

  // Get all item names for color shade generation
  const allItemNames = data.map((d) => d.name);

  // Transform data for Recharts
  const chartData = data.map((item) => {
    const color = getDrillDownColor(
      item.name,
      item.mainGroup,
      drillPath,
      allItemNames,
      MUSCLE_COLORS
    );
    const drillable = isDrillable(item.name, drillPath);

    return {
      name: item.name,
      mainGroup: item.mainGroup,
      value: item.volume,
      percentage: ((item.volume / totalVolume) * 100).toFixed(1),
      color,
      isDrillable: drillable,
    };
  });

  // Click handler for pie slices
  const handleSliceClick = (entry: typeof chartData[0]) => {
    if (entry.isDrillable) {
      onDrillDown(entry.name);
    }
  };

  // Custom label renderer with closer positioning
  const renderCustomLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, name, percentage } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 5; // Reduced distance from pie edge
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: '11px' }}
      >
        {`${name} ${percentage}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color}
              onClick={() => handleSliceClick(entry)}
              cursor={entry.isDrillable ? 'pointer' : 'default'}
              style={{
                opacity: entry.isDrillable ? 1 : 0.95,
              }}
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
