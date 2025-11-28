import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRecurrenceRule {
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  startDate: Date;
  endDate?: Date; // Optional, null means ongoing
}

export interface IRoutineSchedule extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  routineId: mongoose.Types.ObjectId;
  recurrenceRule: IRecurrenceRule;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const recurrenceRuleSchema = new Schema<IRecurrenceRule>(
  {
    daysOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          return v.length > 0 && v.every((day) => day >= 0 && day <= 6);
        },
        message: 'Days of week must be between 0-6',
      },
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
  },
  { _id: false }
);

const routineScheduleSchema = new Schema<IRoutineSchedule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routineId: {
      type: Schema.Types.ObjectId,
      ref: 'Routine',
      required: true,
    },
    recurrenceRule: {
      type: recurrenceRuleSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active schedule queries
routineScheduleSchema.index({ userId: 1, isActive: 1 });
routineScheduleSchema.index({ userId: 1, routineId: 1 });

const RoutineSchedule: Model<IRoutineSchedule> =
  mongoose.models.RoutineSchedule ||
  mongoose.model<IRoutineSchedule>('RoutineSchedule', routineScheduleSchema);

export default RoutineSchedule;
