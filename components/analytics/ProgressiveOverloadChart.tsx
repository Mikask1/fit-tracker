'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProgressiveOverloadChartProps {
  startDate: Date;
  endDate: Date;
}

const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f43f5e', // rose-500
  '#6366f1', // indigo-500
];

export function ProgressiveOverloadChart({
  startDate,
  endDate,
}: ProgressiveOverloadChartProps) {
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Query all movements
  const {
    data: movements,
    isLoading: isLoadingMovements,
    error: movementsError,
  } = trpc.analytics.getAllMovements.useQuery();

  // Query progression data
  const {
    data: progressionData,
    isLoading: isLoadingProgression,
    error: progressionError,
  } = trpc.analytics.getProgressiveOverload.useQuery(
    {
      movementIds: selectedMovementIds,
      startDate,
      endDate,
    },
    { enabled: selectedMovementIds.length > 0 }
  );

  const handleToggleMovement = (movementId: string) => {
    setSelectedMovementIds((prev) =>
      prev.includes(movementId)
        ? prev.filter((id) => id !== movementId)
        : [...prev, movementId]
    );
  };

  const handleSelectAll = () => {
    if (movements) {
      setSelectedMovementIds(movements.map((m) => m._id));
    }
  };

  const handleClearAll = () => {
    setSelectedMovementIds([]);
  };

  if (isLoadingMovements) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-full sm:w-[300px]" />
        <Skeleton className="w-full h-[300px] sm:h-[400px]" />
      </div>
    );
  }

  if (movementsError) {
    return <ErrorState message={movementsError.message} />;
  }

  if (!movements || movements.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No movements found in your library</p>
        <p className="text-sm mt-2">
          Create movements first to track your progress
        </p>
      </div>
    );
  }

  // Transform data for chart
  const chartData: any[] = [];
  if (progressionData && progressionData.length > 0) {
    // Get all unique dates
    const allDates = new Set<string>();
    progressionData.forEach((movement: any) => {
      movement.data.forEach((point: any) => {
        allDates.add(format(new Date(point.date), 'yyyy-MM-dd'));
      });
    });

    // Create data points for each date
    Array.from(allDates)
      .sort()
      .forEach((dateStr: string) => {
        const dataPoint: any = { date: dateStr };
        progressionData.forEach((movement: any) => {
          const point = movement.data.find(
            (p: any) => format(new Date(p.date), 'yyyy-MM-dd') === dateStr
          );
          dataPoint[movement.movementName] = point?.weight || null;
        });
        chartData.push(dataPoint);
      });
  }

  return (
    <div className="space-y-4">
      {/* Multi-Select Dropdown */}
      <div className="flex items-center gap-3">
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[300px] justify-between min-h-11"
            >
              <span>
                {selectedMovementIds.length === 0
                  ? 'Select movements'
                  : `${selectedMovementIds.length} movement${selectedMovementIds.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <div className="p-3 border-b flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
                className="flex-1"
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                className="flex-1"
              >
                Clear All
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="p-3 space-y-2">
                {movements.map((movement) => (
                  <div
                    key={movement._id}
                    className="flex items-center space-x-2 min-h-11"
                  >
                    <Checkbox
                      id={movement._id}
                      checked={selectedMovementIds.includes(movement._id)}
                      onCheckedChange={() => handleToggleMovement(movement._id)}
                    />
                    <label
                      htmlFor={movement._id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {movement.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Chart */}
      {selectedMovementIds.length === 0 ? (
        <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
          Select movements to view progression
        </div>
      ) : isLoadingProgression ? (
        <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center">
          <Skeleton className="w-full h-full" />
        </div>
      ) : progressionError ? (
        <ErrorState message={progressionError.message} />
      ) : !progressionData || progressionData.length === 0 || chartData.length === 0 ? (
        <div className="w-full h-[300px] sm:h-[400px] flex items-center justify-center text-muted-foreground border rounded-lg">
          No completed sessions for selected movements
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
              className="text-xs"
            />
            <YAxis
              tickFormatter={(value) => `${value} kg`}
              className="text-xs"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length && label) {
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <p className="font-semibold mb-2">
                        {format(new Date(label as string), 'MMM dd, yyyy')}
                      </p>
                      {payload.map((entry, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>{entry.name}:</span>
                          <span className="font-semibold">
                            {entry.value} kg
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={100}
              formatter={(value) => (
                <span className="text-sm">{value}</span>
              )}
            />
            {progressionData.map((movement, index) => (
              <Line
                key={movement.movementId}
                type="monotone"
                dataKey={movement.movementName}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
