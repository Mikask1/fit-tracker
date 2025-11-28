import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  isToday,
  format,
  isBefore,
  startOfDay,
} from 'date-fns';
import type { IWorkoutSession } from '@/types';

export interface CalendarCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generate a 42-cell calendar grid (7 days × 6 weeks)
 * Starting from Sunday of the week containing the 1st of the month
 */
export function generateCalendarGrid(month: Date): CalendarCell[] {
  const firstDayOfMonth = startOfMonth(month);

  // Start grid on Sunday before month starts
  const gridStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });

  // Generate 42 days (6 weeks)
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    cells.push({
      date,
      isCurrentMonth: isSameMonth(date, month),
      isToday: isToday(date),
    });
  }

  return cells;
}

/**
 * Map sessions to dates for quick lookup
 * Key format: 'yyyy-MM-dd'
 */
export function mapSessionsByDate(
  sessions: IWorkoutSession[] | undefined
): Map<string, IWorkoutSession> {
  const map = new Map<string, IWorkoutSession>();
  sessions?.forEach((session) => {
    const key = format(session.date, 'yyyy-MM-dd');
    map.set(key, session);
  });
  return map;
}

/**
 * Get session for a specific date
 */
export function getSessionForDate(
  date: Date,
  sessionMap: Map<string, IWorkoutSession>
): IWorkoutSession | undefined {
  const key = format(date, 'yyyy-MM-dd');
  return sessionMap.get(key);
}

/**
 * Map scheduled sessions (virtual, from generateSessionsForDateRange) by date
 */
export function mapScheduledSessionsByDate(
  scheduledSessions:
    | Array<{ date: Date; routineId: string; routineName: string }>
    | undefined
): Map<string, { routineId: string; routineName: string }> {
  const map = new Map<string, { routineId: string; routineName: string }>();
  scheduledSessions?.forEach((scheduled) => {
    const key = format(scheduled.date, 'yyyy-MM-dd');
    map.set(key, {
      routineId: scheduled.routineId,
      routineName: scheduled.routineName,
    });
  });
  return map;
}

/**
 * Get scheduled session for a specific date
 */
export function getScheduledSessionForDate(
  date: Date,
  scheduledSessionMap: Map<string, { routineId: string; routineName: string }>
): { routineId: string; routineName: string } | undefined {
  const key = format(date, 'yyyy-MM-dd');
  return scheduledSessionMap.get(key);
}

/**
 * Days of week labels
 */
export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Full days of week for schedule form
 */
export const DAYS_OF_WEEK_FULL = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

/**
 * Check if a date is in the past (before today)
 */
export function isPastDate(date: Date): boolean {
  return isBefore(startOfDay(date), startOfDay(new Date()));
}

/**
 * Check if a date is today
 */
export function isTodayDate(date: Date): boolean {
  return isToday(date);
}

/**
 * Check if a date is in the future (after today)
 */
export function isFutureDate(date: Date): boolean {
  return !isPastDate(date) && !isTodayDate(date);
}
