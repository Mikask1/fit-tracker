import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import RoutineSchedule from '@/lib/models/RoutineSchedule';
import Routine from '@/lib/models/Routine';
import mongoose from 'mongoose';

export const schedulesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        routineId: z.string(),
        daysOfWeek: z.array(z.number().min(0).max(6)),
        startDate: z.date(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify routine exists and belongs to user
      const routine = await Routine.findOne({
        _id: new mongoose.Types.ObjectId(input.routineId),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      });

      if (!routine) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Routine not found' });
      }

      const schedule = await RoutineSchedule.create({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        routineId: new mongoose.Types.ObjectId(input.routineId),
        recurrenceRule: {
          daysOfWeek: input.daysOfWeek,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        isActive: true,
      });

      return schedule;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          activeOnly: z.boolean().default(true),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const filter: any = {
        userId: new mongoose.Types.ObjectId(ctx.userId),
      };

      if (input?.activeOnly) {
        filter.isActive = true;
      }

      const schedules = await RoutineSchedule.find(filter)
        .populate('routineId')
        .sort({ createdAt: -1 });

      return schedules;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const schedule = await RoutineSchedule.findOne({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      }).populate('routineId');

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      return schedule;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, daysOfWeek, startDate, endDate, isActive } = input;

      const updateData: any = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (daysOfWeek || startDate || endDate !== undefined) {
        const schedule = await RoutineSchedule.findOne({
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(ctx.userId),
        });

        if (!schedule) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
        }

        updateData.recurrenceRule = {
          daysOfWeek: daysOfWeek || schedule.recurrenceRule.daysOfWeek,
          startDate: startDate || schedule.recurrenceRule.startDate,
          endDate: endDate !== undefined ? endDate : schedule.recurrenceRule.endDate,
        };
      }

      const schedule = await RoutineSchedule.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(ctx.userId),
        },
        updateData,
        { new: true, runValidators: true }
      ).populate('routineId');

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      return schedule;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const schedule = await RoutineSchedule.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      });

      if (!schedule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      }

      return { success: true };
    }),

  // Generate sessions on-demand for a date range
  generateSessionsForDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const schedules = await RoutineSchedule.find({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        isActive: true,
      }).populate('routineId');

      const generatedSessions: Array<{
        date: Date;
        routineId: string;
        routineName: string;
      }> = [];

      for (const schedule of schedules) {
        const { daysOfWeek, startDate, endDate } = schedule.recurrenceRule;

        // Iterate through dates in range
        const currentDate = new Date(
          Math.max(input.startDate.getTime(), startDate.getTime())
        );
        const rangeEnd = endDate
          ? new Date(Math.min(input.endDate.getTime(), endDate.getTime()))
          : input.endDate;

        while (currentDate <= rangeEnd) {
          const dayOfWeek = currentDate.getDay();

          if (daysOfWeek.includes(dayOfWeek)) {
            generatedSessions.push({
              date: new Date(currentDate),
              routineId: schedule.routineId._id.toString(),
              routineName: (schedule.routineId as any).name,
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      return generatedSessions.sort((a, b) => a.date.getTime() - b.date.getTime());
    }),
});
