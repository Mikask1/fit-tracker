interface CurrentLapDisplayProps {
  currentLapTime: number;
  isRunning: boolean;
}

// Format milliseconds dynamically based on duration
function formatLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  // Show hours only if >= 1 hour
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  // Show minutes:seconds if >= 1 minute
  if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  // Show only seconds if < 1 minute
  return `${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

export function CurrentLapDisplay({ currentLapTime, isRunning }: CurrentLapDisplayProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold w-28">
            Current Lap
          </span>
          <span className="text-2xl font-mono tabular-nums">
            {formatLapTime(currentLapTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
