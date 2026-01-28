'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, X } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { useTimer } from '@/hooks/useTimer';
import { TimePicker } from './TimePicker';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';

// Format milliseconds dynamically based on duration
function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000); // Round up to show time remaining
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Show HH:MM:SS if >= 1 hour
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Show MM:SS if < 1 hour
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function TimerTab() {
  const {
    setTimerDuration,
    startTimer,
    pauseTimer,
    resumeTimer,
    cancelTimer,
  } = useTimerStore();

  const { timerDuration, timerRemaining, timerIsRunning, timerIsPaused } = useTimer();

  // Initialize with 5 minutes if no duration set
  useEffect(() => {
    if (timerDuration === 0) {
      setTimerDuration(5 * 60 * 1000); // 5 minutes default
    }
  }, [timerDuration, setTimerDuration]);

  const handleStart = async () => {
    if (timerDuration === 0) {
      return; // Don't start if no time set
    }

    // Request notification permission if not already granted
    const permission = getNotificationPermission();
    if (permission === 'default') {
      const granted = await requestNotificationPermission();
      if (granted) {
        toast.success('Notifications enabled! You\'ll be notified when timer completes.', {
          duration: 3000,
        });
      } else {
        toast.info('Enable notifications in settings to get alerts when timer completes.', {
          duration: 5000,
        });
      }
    }

    startTimer();
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleResume = () => {
    resumeTimer();
  };

  const handleCancel = () => {
    cancelTimer();
  };

  const handlePreset = (minutes: number) => {
    setTimerDuration(minutes * 60 * 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      {/* Display area */}
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {!timerIsRunning && !timerIsPaused ? (
          <>
            {/* Time Picker (not running) */}
            <TimePicker
              value={timerDuration}
              onChange={setTimerDuration}
              disabled={timerIsRunning}
            />

            {/* Preset Timer Buttons */}
            <div className="grid sm:grid-cols-4 grid-cols-2 gap-3 w-full">
              <Button
                onClick={() => handlePreset(1)}
                variant="outline"
                size="sm"
                className="min-h-10 px-6"
              >
                1 min
              </Button>
              <Button
                onClick={() => handlePreset(2)}
                variant="outline"
                size="sm"
                className="min-h-10 px-6"
              >
                2 min
              </Button>
              <Button
                onClick={() => handlePreset(3)}
                variant="outline"
                size="sm"
                className="min-h-10 px-6"
              >
                3 min
              </Button>
              <Button
                onClick={() => handlePreset(5)}
                variant="outline"
                size="sm"
                className="min-h-10 px-6"
              >
                5 min
              </Button>
            </div>

            {/* Start button */}
            <Button
              onClick={handleStart}
              disabled={timerDuration === 0}
              size="lg"
              className="w-full min-h-14 text-lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Start
            </Button>
          </>
        ) : (
          <>
            {/* Time Display (running or paused) */}
            <div className="text-8xl font-light tabular-nums">
              {formatTime(timerRemaining)}
            </div>

            {/* Pause/Resume button */}
            <Button
              onClick={timerIsRunning ? handlePause : handleResume}
              size="lg"
              className="w-full min-h-14 text-lg"
            >
              {timerIsRunning ? (
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

            {/* Cancel button */}
            <Button
              onClick={handleCancel}
              variant="outline"
              size="lg"
              className="w-full min-h-14 text-lg"
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
