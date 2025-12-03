'use client';

import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Plus } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { useStopwatch } from '@/hooks/useStopwatch';
import { LapsList } from './LapsList';
import { CurrentLapDisplay } from './CurrentLapDisplay';

// Format milliseconds to MM:SS.CS (centiseconds)
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function StopwatchTab() {
  const {
    startStopwatch,
    pauseStopwatch,
    resumeStopwatch,
    resetStopwatch,
    recordLap,
  } = useTimerStore();

  const { stopwatchElapsed, stopwatchIsRunning, stopwatchIsPaused, stopwatchLaps, currentLapTime } = useStopwatch();

  const handleStart = () => {
    startStopwatch();
  };

  const handlePause = () => {
    pauseStopwatch();
  };

  const handleResume = () => {
    resumeStopwatch();
  };

  const handleReset = () => {
    resetStopwatch();
  };

  const handleLap = () => {
    recordLap();
  };

  const isActive = stopwatchIsRunning || stopwatchIsPaused;

  return (
    <div className="flex flex-col h-full px-4 py-8 space-y-6">
      {/* Time display */}
      <div className="flex items-center justify-center py-8">
        <div className="text-6xl font-light tabular-nums">
          {formatTime(stopwatchElapsed)}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex gap-3 w-full max-w-sm mx-auto">
        {!isActive ? (
          // Start button (full width when not active)
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full min-h-14 text-lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Start
          </Button>
        ) : (
          <>
            {/* Pause/Resume button */}
            <Button
              onClick={stopwatchIsRunning ? handlePause : handleResume}
              size="lg"
              className="flex-1 min-h-14 text-lg"
            >
              {stopwatchIsRunning ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Resume
                </>
              )}
            </Button>

            {/* Lap button (only show when running) */}
            {stopwatchIsRunning && (
              <Button
                onClick={handleLap}
                variant="outline"
                size="lg"
                className="flex-1 min-h-14 text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Lap
              </Button>
            )}

            {/* Reset button (only show when paused) */}
            {stopwatchIsPaused && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="flex-1 min-h-14 text-lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset
              </Button>
            )}
          </>
        )}
      </div>

      {/* Current lap + Laps list */}
      {(stopwatchIsRunning || stopwatchIsPaused || stopwatchLaps.length > 0) && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <h3 className="text-lg font-semibold mb-3">Laps</h3>

          {/* Current lap display - show while running or if laps exist */}
          {(stopwatchIsRunning || stopwatchLaps.length > 0) && (
            <CurrentLapDisplay
              currentLapTime={currentLapTime}
              isRunning={stopwatchIsRunning}
            />
          )}

          {/* Recorded laps */}
          {stopwatchLaps.length > 0 && <LapsList laps={stopwatchLaps} />}
        </div>
      )}
    </div>
  );
}
