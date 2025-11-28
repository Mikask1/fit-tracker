'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { IWorkoutSession } from '@/types';
import { SessionStatus } from '@/types';
import { isPastDate, isFutureDate } from '@/lib/utils/calendar';

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  session?: IWorkoutSession;
  scheduledSession?: { routineId: string; routineName: string };
  onClick: (date: Date) => void;
}

export function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  session,
  scheduledSession,
  onClick,
}: CalendarDayProps) {
  const dayNumber = format(date, 'd');

  // Determine visual state
  const isCompleted = session?.status === SessionStatus.COMPLETED;
  const isPlanned = session?.status === SessionStatus.PLANNED;
  const hasSchedule = !session && scheduledSession && isFutureDate(date);

  return (
    <button
      type="button"
      onClick={() => onClick(date)}
      className={cn(
        // Base styles
        'min-h-11 md:min-h-[60px] lg:min-h-20',
        'flex flex-col items-center justify-center',
        'border rounded-md cursor-pointer',
        'transition-colors',
        'hover:bg-accent',
        // Current month vs overflow
        !isCurrentMonth && 'opacity-40',
        // Today highlight
        isToday && 'border-primary border-2',
        // Status-based styling
        isCompleted && 'bg-green-100 border-green-500 dark:bg-green-950 dark:border-green-700',
        hasSchedule && 'border-blue-300 border-dashed dark:border-blue-700'
      )}
    >
      {/* Day Number */}
      <span
        className={cn(
          'text-sm font-medium',
          isCompleted && 'text-green-700 dark:text-green-300',
        )}
      >
        {dayNumber}
      </span>

      {/* Status Indicators */}
      <div className="flex gap-1 mt-1">
        {/* Planned indicator (blue dot) */}
        {isPlanned && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        )}

        {/* Scheduled indicator (light blue dot) */}
        {hasSchedule && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-600" />
        )}
      </div>
    </button>
  );
}
