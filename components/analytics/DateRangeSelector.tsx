'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRangeOption } from '@/types/analytics';
import { calculateDateRange, getDateRangeLabel } from '@/lib/utils/dateRange';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';

interface DateRangeSelectorProps {
  selectedRange: DateRangeOption;
  onRangeChange: (
    option: DateRangeOption,
    customRange?: { from: Date; to: Date }
  ) => void;
}

export function DateRangeSelector({
  selectedRange,
  onRangeChange,
}: DateRangeSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>();

  const handleSelectChange = (value: DateRangeOption) => {
    if (value === 'custom') {
      setIsCalendarOpen(true);
    } else {
      onRangeChange(value);
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setCalendarRange(range);
  };

  const handleApplyCustomRange = () => {
    if (calendarRange?.from && calendarRange?.to) {
      onRangeChange('custom', {
        from: calendarRange.from,
        to: calendarRange.to,
      });
      setIsCalendarOpen(false);
    }
  };

  const displayLabel =
    selectedRange === 'custom' && calendarRange?.from && calendarRange?.to
      ? getDateRangeLabel('custom', {
          from: calendarRange.from,
          to: calendarRange.to,
        })
      : getDateRangeLabel(selectedRange);

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start justify-end sm:items-center">
      <div className="flex gap-2 w-full sm:w-auto">
        <Select value={selectedRange} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full sm:w-[200px] min-h-11 border-black" iconClassName='text-black'>
            <SelectValue>{displayLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-week">This Week</SelectItem>
            <SelectItem value="past-month">Past 30 Days</SelectItem>
            <SelectItem value="current-month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {selectedRange === 'custom' && (
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-h-11">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={calendarRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
                className="rounded-md border"
              />
              <div className="p-3 border-t flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCalendarOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyCustomRange}
                  disabled={!calendarRange?.from || !calendarRange?.to}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
