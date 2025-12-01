import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TimePickerProps {
  value: number; // Duration in milliseconds
  onChange: (duration: number) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const hours = Math.floor(value / 3600000);
  const minutes = Math.floor((value % 3600000) / 60000);
  const seconds = Math.floor((value % 60000) / 1000);

  const handleChange = (h: number, m: number, s: number) => {
    // Prevent setting all values to 0 (invalid timer)
    if (h === 0 && m === 0 && s === 0) {
      toast.error('Please set a duration greater than 0', { duration: 3000 });
      return; // Don't allow all zeros
    }
    const totalMs = h * 3600000 + m * 60000 + s * 1000;
    onChange(totalMs);
  };

  return (
    <div className="flex items-center justify-center gap-2 text-6xl font-light tabular-nums">
      {/* Hours - only show if >= 1 hour */}
      <select
        value={hours}
        onChange={(e) => handleChange(Number(e.target.value), minutes, seconds)}
        disabled={disabled}
        className={cn(
          'bg-transparent border-none text-center appearance-none cursor-pointer',
          'focus:outline-none focus:ring-0',
          'w-24',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, '0')}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">:</span>

      <>
        <select
          value={minutes}
          onChange={(e) => handleChange(hours, Number(e.target.value), seconds)}
          disabled={disabled}
          className={cn(
            'bg-transparent border-none text-center appearance-none cursor-pointer',
            'focus:outline-none focus:ring-0',
            'w-24',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {Array.from({ length: 60 }, (_, i) => (
            <option key={i} value={i}>
              {String(i).padStart(2, '0')}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground">:</span>
      </>
      
      <select
        value={seconds}
        onChange={(e) => handleChange(hours, minutes, Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'bg-transparent border-none text-center appearance-none cursor-pointer',
          'focus:outline-none focus:ring-0',
          'w-24',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {Array.from({ length: 60 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, '0')}
          </option>
        ))}
      </select>
    </div>
  );
}
