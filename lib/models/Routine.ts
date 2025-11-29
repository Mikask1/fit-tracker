import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IExercise {
  movementId: mongoose.Types.ObjectId;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  order: number;
}

export interface IRoutine extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  exercises: IExercise[];
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    movementId: {
      type: Schema.Types.ObjectId,
      ref: 'Movement',
      required: true,
    },
    targetSets: {
      type: Number,
      required: true,
      min: [1, 'Must have at least 1 set'],
      max: [20, 'Cannot exceed 20 sets'],
    },
    targetReps: {
      type: Number,
      required: true,
      min: [1, 'Must have at least 1 rep'],
      max: [999, 'Cannot exceed 999 reps'],
    },
    targetWeight: {
      type: Number,
      required: false,
      min: [0, 'Weight cannot be negative'],
      max: [9999, 'Cannot exceed 9999 kg'],
      default: 0,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const routineSchema = new Schema<IRoutine>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Routine name is required'],
      trim: true,
    },
    exercises: {
      type: [exerciseSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for user-specific routine queries
routineSchema.index({ userId: 1 });

const Routine: Model<IRoutine> =
  mongoose.models.Routine || mongoose.model<IRoutine>('Routine', routineSchema);

export default Routine;
