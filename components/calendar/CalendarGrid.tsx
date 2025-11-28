'use client';

import { format } from 'date-fns';
import { CalendarDay } from './CalendarDay';
import { DAYS_OF_WEEK } from '@/lib/utils/calendar';
import type { CalendarCell } from '@/lib/utils/calendar';
import type { IWorkoutSession } from '@/types';

interface CalendarGridProps {
  cells: CalendarCell[];
  sessionMap: Map<string, IWorkoutSession>;
  scheduledSessionMap: Map<string, { routineId: string; routineName: string }>;
  onDateClick: (date: Date) => void;
}

export function CalendarGrid({
  cells,
  sessionMap,
  scheduledSessionMap,
  onDateClick,
}: CalendarGridProps) {
  // Helper to get session/scheduled session for a cell
  const getSessionForCell = (cell: CalendarCell) => {
    const dateKey = format(cell.date, 'yyyy-MM-dd'); // Use local timezone
    return sessionMap.get(dateKey);
  };

  const getScheduledSessionForCell = (cell: CalendarCell) => {
    const dateKey = format(cell.date, 'yyyy-MM-dd'); // Use local timezone
    return scheduledSessionMap.get(dateKey);
  };

  return (
    <div className="w-full">
      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid (42 cells = 6 weeks × 7 days) */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => (
          <CalendarDay
            key={`${cell.date.toISOString()}-${index}`}
            date={cell.date}
            isCurrentMonth={cell.isCurrentMonth}
            isToday={cell.isToday}
            session={getSessionForCell(cell)}
            scheduledSession={getScheduledSessionForCell(cell)}
            onClick={onDateClick}
          />
        ))}
      </div>
    </div>
  );
}
