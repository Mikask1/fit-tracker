'use client';

import { useState, useMemo, useEffect } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, subDays, addDays } from 'date-fns';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { SessionDrawer } from '@/components/calendar/SessionDrawer';
import { WeeklyStats } from '@/components/calendar/WeeklyStats';
import { generateCalendarGrid, mapSessionsByDate, mapScheduledSessionsByDate, getSessionForDate, getScheduledSessionForDate } from '@/lib/utils/calendar';
import { trpc } from '@/lib/trpc/client';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useEnsureSessionBuffer } from '@/lib/utils/session-generator';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const utils = trpc.useUtils();

  // Auto-generate sessions on mount
  const { mutate: generateSessions } = useEnsureSessionBuffer();

  useEffect(() => {
    generateSessions(undefined, {
      onSuccess: () => {
        // Refetch sessions after auto-generation
        utils.sessions.listByDateRange.invalidate();
      },
    });
  }, [generateSessions, utils]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  // Calculate date ranges for fetching
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const bufferStart = subDays(monthStart, 7);
  const bufferEnd = addDays(monthEnd, 7);

  // Fetch sessions for visible month + buffer
  const { data: sessions, isLoading: sessionsLoading, error: sessionsError } = trpc.sessions.listByDateRange.useQuery({
    startDate: bufferStart,
    endDate: bufferEnd,
  });

  // Fetch virtual scheduled sessions (not yet persisted)
  const { data: scheduledSessions } = trpc.schedules.generateSessionsForDateRange.useQuery({
    startDate: monthStart,
    endDate: monthEnd,
  });

  // Generate calendar grid
  const calendarCells = useMemo(() => generateCalendarGrid(currentMonth), [currentMonth]);

  // Map sessions by date for quick lookup
  const sessionMap = useMemo(() => mapSessionsByDate(sessions), [sessions]);
  const scheduledSessionMap = useMemo(() => mapScheduledSessionsByDate(scheduledSessions), [scheduledSessions]);

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSessionDrawerOpen(true);
  };

  // Get session and scheduled session for selected date
  const selectedSession = useMemo(() => {
    if (!selectedDate) return null;
    return getSessionForDate(selectedDate, sessionMap);
  }, [selectedDate, sessionMap]);

  const selectedScheduledSession = useMemo(() => {
    if (!selectedDate) return null;
    return getScheduledSessionForDate(selectedDate, scheduledSessionMap);
  }, [selectedDate, scheduledSessionMap]);

  // Loading state
  if (sessionsLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <LoadingState />
      </div>
    );
  }

  // Error state
  // Only surface the error when there is no cached data to show — a failed
  // background refetch while offline must not hide the persisted calendar.
  if (sessionsError && !sessions) {
    return (
      <div className="container mx-auto px-4 py-6">
        <ErrorState message={sessionsError.message} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">

        {/* Calendar Header (Month Navigation) */}
        <CalendarHeader
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
        />

        {/* Weekly Stats */}
        <WeeklyStats />
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        cells={calendarCells}
        sessionMap={sessionMap}
        scheduledSessionMap={scheduledSessionMap}
        onDateClick={handleDateClick}
      />

      {/* Session Drawer */}
      {selectedDate && (
        <SessionDrawer
          open={sessionDrawerOpen}
          onOpenChange={setSessionDrawerOpen}
          date={selectedDate}
          sessionId={selectedSession?._id?.toString() || null}
          scheduledRoutineId={selectedScheduledSession?.routineId}
          onSuccess={() => {
            setSessionDrawerOpen(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}
