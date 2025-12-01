import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/store/timerStore';

export function useStopwatch() {
  const {
    stopwatchElapsed,
    stopwatchStartTime,
    stopwatchIsRunning,
    stopwatchIsPaused,
    stopwatchLaps,
    updateStopwatchElapsed,
  } = useTimerStore();

  const animationFrameRef = useRef<number | undefined>(undefined);
  const pausedElapsedRef = useRef<number>(0);

  // Update loop using requestAnimationFrame
  const updateStopwatch = useCallback(() => {
    if (!stopwatchIsRunning || !stopwatchStartTime) return;

    const now = Date.now();
    const sessionElapsed = now - stopwatchStartTime;
    const totalElapsed = pausedElapsedRef.current + sessionElapsed;

    updateStopwatchElapsed(totalElapsed);
    animationFrameRef.current = requestAnimationFrame(updateStopwatch);
  }, [stopwatchIsRunning, stopwatchStartTime, updateStopwatchElapsed]);

  // Sync paused elapsed when stopwatch is paused
  useEffect(() => {
    if (stopwatchIsPaused) {
      pausedElapsedRef.current = stopwatchElapsed;
    } else if (!stopwatchIsRunning) {
      pausedElapsedRef.current = 0;
    }
  }, [stopwatchIsPaused, stopwatchIsRunning, stopwatchElapsed]);

  // Start/stop animation loop
  useEffect(() => {
    if (stopwatchIsRunning) {
      animationFrameRef.current = requestAnimationFrame(updateStopwatch);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stopwatchIsRunning, updateStopwatch]);

  // Handle page visibility changes to recalculate time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && stopwatchIsRunning && stopwatchStartTime) {
        // Tab became visible - recalculate elapsed time
        const now = Date.now();
        const sessionElapsed = now - stopwatchStartTime;
        const totalElapsed = pausedElapsedRef.current + sessionElapsed;
        updateStopwatchElapsed(totalElapsed);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopwatchIsRunning, stopwatchStartTime, updateStopwatchElapsed]);

  return {
    stopwatchElapsed,
    stopwatchIsRunning,
    stopwatchIsPaused,
    stopwatchLaps,
  };
}
