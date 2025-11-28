import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMuscleGroup {
  main: string;
  sub: string | null; // null = all sub-groups
}

export interface IMovement extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  muscleGroups: IMuscleGroup[]; // Changed to array
  youtubeLink?: string;
  image?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const muscleGroupSchema = new Schema<IMuscleGroup>(
  {
    main: {
      type: String,
      required: [true, 'Main muscle group is required'],
      trim: true,
    },
    sub: {
      type: String,
      required: false, // Allow null for "all sub-groups"
      trim: true,
      default: null,
    },
  },
  { _id: false } // Don't create _id for subdocuments
);

const movementSchema = new Schema<IMovement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Movement name is required'],
      trim: true,
    },
    muscleGroups: {
      type: [muscleGroupSchema], // Changed to array
      required: [true, 'At least one muscle group is required'],
      validate: {
        validator: function (v: IMuscleGroup[]) {
          return v && v.length > 0;
        },
        message: 'At least one muscle group is required',
      },
    },
    youtubeLink: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(v);
        },
        message: 'Invalid YouTube URL',
      },
    },
    image: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user-specific queries
movementSchema.index({ userId: 1, name: 1 });
movementSchema.index({ userId: 1, 'muscleGroups.main': 1 }); // Updated for array

const Movement: Model<IMovement> =
  mongoose.models.Movement || mongoose.model<IMovement>('Movement', movementSchema);

export default Movement;
