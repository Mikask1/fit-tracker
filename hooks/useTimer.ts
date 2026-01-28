import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/store/timerStore';
import { toast } from 'sonner';
import { sendNotification, vibrate } from '@/lib/notifications';

export function useTimer() {
  const {
    timerDuration,
    timerRemaining,
    timerStartTime,
    timerIsRunning,
    timerIsPaused,
    updateTimerRemaining,
    completeTimer,
  } = useTimerStore();

  const animationFrameRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasCompletedRef = useRef<boolean>(false);

  // Update loop using requestAnimationFrame
  const updateTimer = useCallback(() => {
    if (!timerIsRunning || !timerStartTime) return;

    const now = Date.now();
    const elapsed = now - timerStartTime;
    const remaining = timerDuration - elapsed; // Use timerDuration instead of timerRemaining

    if (remaining <= 0) {
      // Timer completed
      updateTimerRemaining(0);
      completeTimer();

      // Only show notification once
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;

        // Play sound
        if (audioRef.current) {
          audioRef.current.play().catch(err => console.error('Audio play failed:', err));
        }

        // Vibrate device (mobile)
        vibrate([200, 100, 200, 100, 200]);

        // Show in-app toast
        toast.success('Timer completed!', {
          duration: 5000,
        });

        // Send system notification (works even when app is backgrounded)
        sendNotification({
          title: '⏱️ Timer Completed!',
          body: 'Your workout timer has finished',
          tag: 'timer-complete',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
        }).catch(err => console.error('Failed to send notification:', err));
      }

      return;
    }

    updateTimerRemaining(remaining);
    animationFrameRef.current = requestAnimationFrame(updateTimer);
  }, [timerIsRunning, timerStartTime, timerDuration, updateTimerRemaining, completeTimer]);

  // Start/stop animation loop
  useEffect(() => {
    if (timerIsRunning) {
      hasCompletedRef.current = false; // Reset completion flag
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [timerIsRunning, updateTimer]);

  // Initialize audio
  useEffect(() => {
    // Create a simple beep using Web Audio API (no external file needed)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      gainNode.gain.value = 0.3; // Volume

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3); // Duration of beep
    };

    // Store the beep function in a way that mimics HTMLAudioElement.play()
    audioRef.current = {
      play: () => {
        try {
          playBeep();
          return Promise.resolve();
        } catch (err) {
          return Promise.reject(err);
        }
      }
    } as any;
  }, []);

  // Handle page visibility changes to recalculate time
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timerIsRunning && timerStartTime) {
        // Tab became visible - recalculate remaining time
        const now = Date.now();
        const elapsed = now - timerStartTime;
        const remaining = timerDuration - elapsed; // Use timerDuration instead of timerRemaining
        updateTimerRemaining(Math.max(0, remaining));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerIsRunning, timerStartTime, timerDuration, updateTimerRemaining]);

  return {
    timerDuration,
    timerRemaining,
    timerIsRunning,
    timerIsPaused,
  };
}
