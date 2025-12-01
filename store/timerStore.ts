import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Lap interface
export interface Lap {
  lapNumber: number;
  lapTime: number; // Time for this lap in milliseconds
  totalTime: number; // Total elapsed time when lap was recorded
  timestamp: number; // When lap was recorded
}

// Timer state interface
export interface TimerState {
  // Timer (countdown)
  timerDuration: number; // Total duration in milliseconds
  timerRemaining: number; // Remaining time in milliseconds
  timerStartTime: number | null; // Timestamp when timer started
  timerIsRunning: boolean;
  timerIsPaused: boolean;

  // Stopwatch (count up)
  stopwatchElapsed: number; // Elapsed time in milliseconds
  stopwatchStartTime: number | null; // Timestamp when stopwatch started
  stopwatchIsRunning: boolean;
  stopwatchIsPaused: boolean;
  stopwatchLaps: Lap[];

  // Timer actions
  setTimerDuration: (duration: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  cancelTimer: () => void;
  updateTimerRemaining: (remaining: number) => void;
  completeTimer: () => void;

  // Stopwatch actions
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  resumeStopwatch: () => void;
  resetStopwatch: () => void;
  updateStopwatchElapsed: (elapsed: number) => void;
  recordLap: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      // Initial state
      timerDuration: 0,
      timerRemaining: 0,
      timerStartTime: null,
      timerIsRunning: false,
      timerIsPaused: false,

      stopwatchElapsed: 0,
      stopwatchStartTime: null,
      stopwatchIsRunning: false,
      stopwatchIsPaused: false,
      stopwatchLaps: [],

      // Timer actions
      setTimerDuration: (duration) => {
        set({
          timerDuration: duration,
          timerRemaining: duration,
        });
      },

      startTimer: () => {
        const state = get();
        const now = Date.now();
        set({
          timerIsRunning: true,
          timerIsPaused: false,
          timerStartTime: now,
          timerRemaining: state.timerDuration, // Reset to full duration when starting
        });
      },

      pauseTimer: () => {
        const state = get();
        set({
          timerIsRunning: false,
          timerIsPaused: true,
          timerStartTime: null,
          // Store remaining time when paused
          timerRemaining: state.timerRemaining,
        });
      },

      resumeTimer: () => {
        const now = Date.now();
        set({
          timerIsRunning: true,
          timerIsPaused: false,
          timerStartTime: now,
        });
      },

      cancelTimer: () => {
        const state = get();
        set({
          timerIsRunning: false,
          timerIsPaused: false,
          timerStartTime: null,
          timerRemaining: state.timerDuration, // Reset to initial duration
        });
      },

      updateTimerRemaining: (remaining) => {
        set({ timerRemaining: Math.max(0, remaining) });
      },

      completeTimer: () => {
        const state = get();
        set({
          timerIsRunning: false,
          timerIsPaused: false,
          timerStartTime: null,
          timerRemaining: state.timerDuration, // Reset to duration so it's ready for next use
        });
      },

      // Stopwatch actions
      startStopwatch: () => {
        const now = Date.now();
        set({
          stopwatchIsRunning: true,
          stopwatchIsPaused: false,
          stopwatchStartTime: now,
          stopwatchElapsed: 0,
          stopwatchLaps: [],
        });
      },

      pauseStopwatch: () => {
        set({
          stopwatchIsRunning: false,
          stopwatchIsPaused: true,
          stopwatchStartTime: null,
        });
      },

      resumeStopwatch: () => {
        const now = Date.now();
        set({
          stopwatchIsRunning: true,
          stopwatchIsPaused: false,
          stopwatchStartTime: now,
        });
      },

      resetStopwatch: () => {
        set({
          stopwatchIsRunning: false,
          stopwatchIsPaused: false,
          stopwatchStartTime: null,
          stopwatchElapsed: 0,
          stopwatchLaps: [],
        });
      },

      updateStopwatchElapsed: (elapsed) => {
        set({ stopwatchElapsed: elapsed });
      },

      recordLap: () => {
        const state = get();
        const totalTime = state.stopwatchElapsed;
        const previousLapTime = state.stopwatchLaps.length > 0
          ? state.stopwatchLaps[state.stopwatchLaps.length - 1].totalTime
          : 0;

        const lap: Lap = {
          lapNumber: state.stopwatchLaps.length + 1,
          lapTime: totalTime - previousLapTime,
          totalTime: totalTime,
          timestamp: Date.now(),
        };

        set({
          stopwatchLaps: [...state.stopwatchLaps, lap],
        });
      },
    }),
    {
      name: 'fittrack-timer-v2',
      // Only persist non-running state
      partialize: (state) => ({
        timerDuration: state.timerDuration,
        timerRemaining: !state.timerIsRunning ? state.timerRemaining : state.timerDuration,
        stopwatchElapsed: !state.stopwatchIsRunning ? state.stopwatchElapsed : 0,
        stopwatchLaps: !state.stopwatchIsRunning ? state.stopwatchLaps : [],
      }),
    }
  )
);
