// Session Status Enum (duplicated to avoid importing Mongoose in client)
export enum SessionStatus {
  PLANNED = 'Planned',
  COMPLETED = 'Completed',
}

// Type definitions (without importing the actual Mongoose models)
export interface IUser {
  _id: any;
  username: string;
  password: string;
  expectedWorkoutsPerWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMuscleGroup {
  main: string;
  category: string | null;  // NEW - Second level
  specific: string | null;  // NEW - Third level
  sub: string | null;       // DEPRECATED - Keep for backward compatibility
}

export interface IMovement {
  _id: any;
  userId: any;
  name: string;
  muscleGroups: IMuscleGroup[];
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAlternativeMovement {
  movementId: any;
  order: number;
}

export interface IExercise {
  movementId: any;
  alternativeMovements?: IAlternativeMovement[];
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  order: number;
}

export interface IRoutine {
  _id: any;
  userId: any;
  name: string;
  exercises: IExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISet {
  weight: number;
  reps: number;
}

export interface ISessionLog {
  movementId: any;
  movementName: string;
  sets: ISet[];
}

export interface IWorkoutSession {
  _id: any;
  userId: any;
  date: Date;
  sourceRoutineId?: any;
  status: SessionStatus;
  logs: ISessionLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecurrenceRule {
  daysOfWeek: number[];
  startDate: Date;
  endDate?: Date;
}

export interface IRoutineSchedule {
  _id: any;
  userId: any;
  routineId: any;
  recurrenceRule: IRecurrenceRule;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Client-side types for forms and UI
export interface MovementFormData {
  name: string;
  muscleGroups: Array<{
    main: string;
    category: string | null;  // NEW - Second level
    specific: string | null;  // NEW - Third level
  }>;
  image?: string;
}

export interface RoutineFormData {
  name: string;
  exercises: Array<{
    movementId: string;
    alternativeMovements?: Array<{
      movementId: string;
      order: number;
    }>;
    targetSets: number;
    targetReps: number;
    targetWeight: number;
    order: number;
  }>;
}

export interface SessionFormData {
  date: Date;
  sourceRoutineId?: string;
  status: 'Planned' | 'Completed';
  logs: Array<{
    movementId: string;
    movementName: string;
    sets: Array<{
      weight: number;
      reps: number;
    }>;
  }>;
}

export interface ScheduleFormData {
  routineId: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate?: Date;
}
