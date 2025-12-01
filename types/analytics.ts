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

export type DrillPath = string[];

export interface DrillDownState {
  path: DrillPath;
  level: number;  // Derived from path.length (0, 1, 2)
}

export interface MuscleDistribution {
  name: string;         // Display name at current level
  mainGroup: string;    // Main group for color mapping (e.g., "Back")
  category?: string;    // For level 3 grouping (e.g., "Biceps")
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
