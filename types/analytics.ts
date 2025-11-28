export type DateRangeOption =
  | 'current-week'
  | 'past-month'
  | 'current-month'
  | 'custom';

export interface DateRange {
  option: DateRangeOption;
  from: Date;
  to: Date;
}

export interface MuscleDistribution {
  muscleGroup: string;
  volume: number;
}

export interface ProgressionDataPoint {
  date: Date;
  weight: number;
}

export interface MovementProgression {
  movementId: string;
  movementName: string;
  data: ProgressionDataPoint[];
}

export interface ConsistencyMetrics {
  totalPlanned: number;
  totalCompleted: number;
  completionRate: number;
  missedDays: number;
}

export interface DailyWorkout {
  date: Date;
  workoutCount: number;
  maxWeight: number;
}
