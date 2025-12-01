import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import Movement from '@/lib/models/Movement';
import mongoose from 'mongoose';

export const movementsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        muscleGroups: z
          .array(
            z.object({
              main: z.string().min(1),
              category: z.string().nullable().optional(),  // NEW - Second level
              specific: z.string().nullable().optional(),  // NEW - Third level
              sub: z.string().nullable().optional(),       // DEPRECATED - backward compat
            })
          )
          .min(1, 'At least one muscle group is required'),
        image: z.union([
          z.string().url('Must be a valid URL'),
          z.literal('')
        ]).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name (case-insensitive)
      const existingMovement = await Movement.findOne({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        name: { $regex: new RegExp(`^${input.name.trim()}$`, 'i') }
      });

      if (existingMovement) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A movement with this name already exists'
        });
      }

      const movement = await Movement.create({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        ...input,
      });

      const movementObj = movement.toObject();
      return {
        ...movementObj,
        _id: movementObj._id.toString(),
        userId: movementObj.userId.toString(),
      };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          muscleGroupMain: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const filter: any = { userId: new mongoose.Types.ObjectId(ctx.userId) };

      if (input?.muscleGroupMain) {
        filter['muscleGroups.main'] = input.muscleGroupMain; // Updated for array
      }

      const movements = await Movement.find(filter).sort({ updatedAt: -1 }).lean();
      return movements.map((movement) => ({
        ...movement,
        _id: movement._id.toString(),
        userId: movement.userId.toString(),
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const movement = await Movement.findOne({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      }).lean();

      if (!movement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Movement not found' });
      }

      return {
        ...movement,
        _id: movement._id.toString(),
        userId: movement.userId.toString(),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        muscleGroups: z
          .array(
            z.object({
              main: z.string().min(1),
              category: z.string().nullable().optional(),  // NEW - Second level
              specific: z.string().nullable().optional(),  // NEW - Third level
              sub: z.string().nullable().optional(),       // DEPRECATED - backward compat
            })
          )
          .min(1, 'At least one muscle group is required')
          .optional(),
        image: z.union([
          z.string().url('Must be a valid URL'),
          z.literal('')
        ]).optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // If name is being updated, check for duplicates
      if (updates.name) {
        const existingMovement = await Movement.findOne({
          userId: new mongoose.Types.ObjectId(ctx.userId),
          name: { $regex: new RegExp(`^${updates.name.trim()}$`, 'i') },
          _id: { $ne: new mongoose.Types.ObjectId(id) }  // Exclude current movement
        });

        if (existingMovement) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A movement with this name already exists'
          });
        }
      }

      const movement = await Movement.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(ctx.userId),
        },
        updates,
        { new: true, runValidators: true, lean: true }
      );

      if (!movement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Movement not found' });
      }

      return {
        ...movement,
        _id: movement._id.toString(),
        userId: movement.userId.toString(),
      };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const movement = await Movement.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      });

      if (!movement) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Movement not found' });
      }

      return { success: true };
    }),
});
