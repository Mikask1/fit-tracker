import mongoose, { Schema, Model, Document } from 'mongoose';

export enum SessionStatus {
  PLANNED = 'Planned',
  COMPLETED = 'Completed',
}

export interface ISet {
  weight: number;
  reps: number;
}

export interface ISessionLog {
  movementId: mongoose.Types.ObjectId;
  movementName: string; // Snapshot for data preservation
  sets: ISet[];
  note?: string; // Optional note for this movement (covers all its sets)
  isCompleted?: boolean;
  completedAt?: number;
}

export interface IWorkoutSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  sourceRoutineId?: mongoose.Types.ObjectId;
  status: SessionStatus;
  logs: ISessionLog[];
  notes?: string; // Optional note for the whole workout
  createdAt: Date;
  updatedAt: Date;
}

const setSchema = new Schema<ISet>(
  {
    weight: {
      type: Number,
      required: true,
      min: [0, 'Weight cannot be negative'],
      max: [9999, 'Weight cannot exceed 9999'],
    },
    reps: {
      type: Number,
      required: true,
      min: [0, 'Reps cannot be negative'],
      max: [999, 'Reps cannot exceed 999'],
    },
  },
  { _id: false }
);

const sessionLogSchema = new Schema<ISessionLog>(
  {
    movementId: {
      type: Schema.Types.ObjectId,
      ref: 'Movement',
      required: true,
    },
    movementName: {
      type: String,
      required: true,
      trim: true,
    },
    sets: {
      type: [setSchema],
      default: [],
    },
    note: {
      type: String,
      required: false,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      required: false,
      default: false,
    },
    completedAt: {
      type: Number,
      required: false,
    },
  },
  { _id: false }
);

const workoutSessionSchema = new Schema<IWorkoutSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    sourceRoutineId: {
      type: Schema.Types.ObjectId,
      ref: 'Routine',
    },
    status: {
      type: String,
      enum: Object.values(SessionStatus),
      default: SessionStatus.PLANNED,
    },
    logs: {
      type: [sessionLogSchema],
      default: [],
    },
    notes: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Critical indexes for efficient queries
workoutSessionSchema.index({ userId: 1, date: -1 }); // Get user sessions by date
workoutSessionSchema.index({ userId: 1, 'logs.movementId': 1, date: -1 }); // Progressive overload tracking
workoutSessionSchema.index({ userId: 1, status: 1, date: -1 }); // Filter by status

const WorkoutSession: Model<IWorkoutSession> =
  mongoose.models.WorkoutSession ||
  mongoose.model<IWorkoutSession>('WorkoutSession', workoutSessionSchema);

export default WorkoutSession;
