import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns';
import { DateRangeOption } from '@/types/analytics';

export function calculateDateRange(
  option: DateRangeOption,
  customRange?: { from: Date; to: Date }
): { from: Date; to: Date } {
  const today = new Date();

  switch (option) {
    case 'current-week':
      // Sunday to Saturday
      return {
        from: startOfWeek(today, { weekStartsOn: 0 }),
        to: endOfWeek(today, { weekStartsOn: 0 }),
      };

    case 'past-month':
      return {
        from: startOfDay(subDays(today, 29)),
        to: endOfDay(today),
      };

    case 'current-month':
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };

    case 'custom':
      if (!customRange) {
        throw new Error('Custom range requires from and to dates');
      }
      return {
        from: startOfDay(customRange.from),
        to: endOfDay(customRange.to),
      };

    default:
      // Default to current month
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
  }
}

export function getDateRangeLabel(
  option: DateRangeOption,
  customRange?: { from: Date; to: Date }
): string {
  switch (option) {
    case 'current-week':
      return 'This Week';
    case 'past-month':
      return 'Past 30 Days';
    case 'current-month':
      return 'This Month';
    case 'custom':
      if (!customRange) return 'Custom Range';
      return `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`;
    default:
      return 'Unknown';
  }
}
