/**
 * Session Auto-Generation Utilities
 *
 * Ensures a rolling 7-day buffer of planned workout sessions
 * based on active recurring schedules.
 */

import { trpc } from '@/lib/trpc/client';

/**
 * Hook to trigger session auto-generation
 *
 * Usage:
 * ```tsx
 * const { mutate: generateSessions } = useEnsureSessionBuffer();
 *
 * // Call after schedule changes or on page mount
 * useEffect(() => {
 *   generateSessions();
 * }, []);
 * ```
 */
export function useEnsureSessionBuffer() {
  return trpc.sessions.ensureSessionBuffer.useMutation({
    onSuccess: (data) => {
      if (data.sessionsCreated > 0) {
        console.log(`Auto-generated ${data.sessionsCreated} workout session(s)`);
      }
    },
    onError: (error) => {
      console.error('Failed to auto-generate sessions:', error.message);
    },
  });
}
