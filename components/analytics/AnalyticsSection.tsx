'use client';

import { useState } from 'react';
import { DateRangeOption, DateRange } from '@/types/analytics';
import { calculateDateRange } from '@/lib/utils/dateRange';
import { DateRangeSelector } from './DateRangeSelector';
import { ConsistencyMetrics } from './ConsistencyMetrics';
import { MuscleDistributionChart } from './MuscleDistributionChart';
import { ProgressiveOverloadChart } from './ProgressiveOverloadChart';
import { Card, CardContent } from '@/components/ui/card';
import { startOfWeek, endOfWeek } from 'date-fns';

export function AnalyticsSection() {
  const [dateRange, setDateRange] = useState<DateRange>({
    option: 'current-week',
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date()),
  });

  const handleRangeChange = (
    option: DateRangeOption,
    customRange?: { from: Date; to: Date }
  ) => {
    const range = calculateDateRange(option, customRange);
    setDateRange({
      option,
      from: range.from,
      to: range.to,
    });
  };

  return (
    <div className="space-y-6 mt-6">
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <h2 className="text-2xl font-bold">Analytics</h2>
        {/* Date Range Selector */}
        <DateRangeSelector
          selectedRange={dateRange.option}
          onRangeChange={handleRangeChange}
        />
      </div>

      {/* Consistency Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Consistency</h3>
        <ConsistencyMetrics startDate={dateRange.from} endDate={dateRange.to} />
      </div>

      {/* Muscle Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          Muscle Group Distribution
        </h3>
        <Card>
          <CardContent className="pt-6">
            <MuscleDistributionChart
              startDate={dateRange.from}
              endDate={dateRange.to}
            />
          </CardContent>
        </Card>
      </div>

      {/* Progressive Overload */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Progressive Overload</h3>
        <Card>
          <CardContent className="pt-3">
            <ProgressiveOverloadChart
              startDate={dateRange.from}
              endDate={dateRange.to}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
