'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function WorkoutCalendarHeatmap() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  const {
    data: dailyWorkouts,
    isLoading,
    error,
  } = trpc.analytics.getDailyWorkouts.useQuery({
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="w-full h-[120px] sm:h-[140px]" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  // Create a map of dates to workout data
  const workoutMap = new Map<string, { workoutCount: number; maxWeight: number }>();
  dailyWorkouts?.forEach((workout: any) => {
    const dateKey = format(new Date(workout.date), 'yyyy-MM-dd');
    workoutMap.set(dateKey, {
      workoutCount: workout.workoutCount,
      maxWeight: workout.maxWeight,
    });
  });

  // Generate all days in the range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Get the maximum weight for color scaling
  const maxWeightValue = Math.max(
    ...(dailyWorkouts?.map((w: any) => w.maxWeight) || [0]),
    1
  );

  // Determine intensity level (0-4) based on max weight
  const getIntensityLevel = (weight: number): number => {
    if (weight === 0) return 0;
    const normalized = weight / maxWeightValue;
    if (normalized <= 0.25) return 1;
    if (normalized <= 0.5) return 2;
    if (normalized <= 0.75) return 3;
    return 4;
  };

  // Get color class based on intensity
  const getColorClass = (level: number): string => {
    switch (level) {
      case 0:
        return 'bg-muted hover:bg-muted/80';
      case 1:
        return 'bg-green-200 hover:bg-green-300 dark:bg-green-900 dark:hover:bg-green-800';
      case 2:
        return 'bg-green-400 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600';
      case 3:
        return 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500';
      case 4:
        return 'bg-green-800 hover:bg-green-900 dark:bg-green-400 dark:hover:bg-green-300';
      default:
        return 'bg-muted';
    }
  };

  // Group days by week
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Add empty cells for days before the first day (to align with Sunday start)
  const firstDayOfWeek = getDay(allDays[0]);
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null as any);
  }

  allDays.forEach((day) => {
    currentWeek.push(day);
    if (getDay(day) === 6) { // Saturday, end of week
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Add remaining days to last week
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Get the month name from the start date
  const monthName = format(currentMonth, 'MMMM yyyy');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-medium min-w-[180px] text-center">
          {monthName} Activity
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <TooltipProvider>
        <div className="flex justify-center">
          <div className="inline-flex flex-col gap-1">
            {/* Day labels */}
            <div className="flex gap-1 mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div
                  key={i}
                  className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {/* Day cells */}
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${dayIndex}`}
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                    );
                  }

                  const dateKey = format(day, 'yyyy-MM-dd');
                  const workoutData = workoutMap.get(dateKey);
                  const weight = workoutData?.maxWeight || 0;
                  const intensity = getIntensityLevel(weight);
                  const colorClass = getColorClass(intensity);

                  return (
                    <Tooltip key={dateKey}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-sm border border-border cursor-pointer transition-colors ${colorClass}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p className="font-semibold">{format(day, 'MMM dd, yyyy')}</p>
                          {workoutData ? (
                            <>
                              <p className="text-muted-foreground mt-1">
                                Max Weight: {weight} kg
                              </p>
                              <p className="text-green-600 dark:text-green-400">
                                Workout completed
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground mt-1">No workout</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
