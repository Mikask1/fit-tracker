import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import Routine from '@/lib/models/Routine';
import mongoose from 'mongoose';

const alternativeMovementSchema = z.object({
  movementId: z.string(),
  order: z.number().min(0),
});

const exerciseSchema = z.object({
  movementId: z.string(),
  alternativeMovements: z.array(alternativeMovementSchema)
    .max(5, 'Cannot have more than 5 alternative movements')
    .optional()
    .default([])
    .refine(
      (alternatives) => {
        if (!alternatives || alternatives.length === 0) return true;
        const ids = alternatives.map(a => a.movementId);
        return ids.length === new Set(ids).size;
      },
      { message: 'Alternative movements must be unique' }
    ),
  targetSets: z.number().min(1).max(20),
  targetReps: z.number().min(1).max(999),
  targetWeight: z.number().min(0).max(9999).default(0),
  order: z.number().min(0),
});

export const routinesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        exercises: z.array(exerciseSchema).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const routine = await Routine.create({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        name: input.name,
        exercises: input.exercises.map((ex) => ({
          ...ex,
          movementId: new mongoose.Types.ObjectId(ex.movementId),
          alternativeMovements: ex.alternativeMovements?.map(alt => ({
            movementId: new mongoose.Types.ObjectId(alt.movementId),
            order: alt.order,
          })) || [],
        })),
      });

      return routine;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const routines = await Routine.find({
      userId: new mongoose.Types.ObjectId(ctx.userId),
    })
      .populate('exercises.movementId')
      .populate('exercises.alternativeMovements.movementId')
      .sort({ name: 1 });

    return routines;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const routine = await Routine.findOne({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      })
        .populate('exercises.movementId')
        .populate('exercises.alternativeMovements.movementId');

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      return routine;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        exercises: z.array(exerciseSchema).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, exercises, ...updates } = input;

      const updateData: any = updates;
      if (exercises) {
        updateData.exercises = exercises.map((ex) => ({
          ...ex,
          movementId: new mongoose.Types.ObjectId(ex.movementId),
          alternativeMovements: ex.alternativeMovements?.map(alt => ({
            movementId: new mongoose.Types.ObjectId(alt.movementId),
            order: alt.order,
          })) || [],
        }));
      }

      const routine = await Routine.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(ctx.userId),
        },
        updateData,
        { new: true, runValidators: true }
      )
        .populate('exercises.movementId')
        .populate('exercises.alternativeMovements.movementId');

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      return routine;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const routine = await Routine.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      });

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      return { success: true };
    }),
});
