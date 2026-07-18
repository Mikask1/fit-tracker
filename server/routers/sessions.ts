import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import WorkoutSession, { SessionStatus } from '@/lib/models/WorkoutSession';
import mongoose from 'mongoose';

const setSchema = z.object({
  weight: z.number().min(0).max(9999),
  reps: z.number().min(0).max(999),
});

const sessionLogSchema = z.object({
  movementId: z.string(),
  movementName: z.string(), // Snapshot
  sets: z.array(setSchema).default([]),
  note: z.string().optional(),
  isCompleted: z.boolean().optional(),
  completedAt: z.number().optional(),
});

export const sessionsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        sourceRoutineId: z.string().optional(),
        status: z.nativeEnum(SessionStatus).default(SessionStatus.PLANNED),
        logs: z.array(sessionLogSchema).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await WorkoutSession.create({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        date: input.date,
        sourceRoutineId: input.sourceRoutineId
          ? new mongoose.Types.ObjectId(input.sourceRoutineId)
          : undefined,
        status: input.status,
        logs: input.logs.map((log) => ({
          movementId: new mongoose.Types.ObjectId(log.movementId),
          movementName: log.movementName,
          sets: log.sets,
          note: log.note,
        })),
      });

      return session;
    }),

  listByDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        status: z.nativeEnum(SessionStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filter: any = {
        userId: new mongoose.Types.ObjectId(ctx.userId),
        date: {
          $gte: input.startDate,
          $lte: input.endDate,
        },
      };

      if (input.status) {
        filter.status = input.status;
      }

      const sessions = await WorkoutSession.find(filter)
        .sort({ date: -1 })
        .populate('logs.movementId');

      return sessions;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await WorkoutSession.findOne({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      }).populate('logs.movementId');

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      return session;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(SessionStatus).optional(),
        logs: z.array(sessionLogSchema).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, logs, ...updates } = input;

      const updateData: any = updates;
      if (logs) {
        updateData.logs = logs.map((log) => ({
          movementId: new mongoose.Types.ObjectId(log.movementId),
          movementName: log.movementName,
          sets: log.sets,
          note: log.note,
        }));
      }

      const session = await WorkoutSession.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          userId: new mongoose.Types.ObjectId(ctx.userId),
        },
        updateData,
        { new: true, runValidators: true }
      ).populate('logs.movementId');

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      return session;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await WorkoutSession.findOneAndDelete({
        _id: new mongoose.Types.ObjectId(input.id),
        userId: new mongoose.Types.ObjectId(ctx.userId),
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      return { success: true };
    }),

  // Progressive overload: Get last completed session for a movement
  getLastCompletedForMovement: protectedProcedure
    .input(z.object({ movementId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await WorkoutSession.findOne({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        status: SessionStatus.COMPLETED,
        'logs.movementId': new mongoose.Types.ObjectId(input.movementId),
      })
        .sort({ date: -1 })
        .limit(1);

      if (!session) {
        return null;
      }

      // Find the specific log for this movement
      const log = session.logs.find((l) => l.movementId.toString() === input.movementId);

      return {
        date: session.date,
        log: log || null,
      };
    }),

  // Auto-generate planned sessions based on active schedules
  ensureSessionBuffer: protectedProcedure
    .mutation(async ({ ctx }) => {
      const RoutineSchedule = (await import('@/lib/models/RoutineSchedule')).default;

      // Get date range (today + 7 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 7);

      // Fetch active schedules
      const schedules = await RoutineSchedule.find({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        isActive: true,
      });

      // Fetch existing sessions in range
      const existingSessions = await WorkoutSession.find({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        date: {
          $gte: today,
          $lte: endDate,
        },
      });

      // Create a map of existing session dates (YYYY-MM-DD format)
      const existingDateMap = new Map<string, boolean>();
      existingSessions.forEach((session) => {
        const dateKey = session.date.toISOString().split('T')[0];
        existingDateMap.set(dateKey, true);
      });

      // Generate sessions for each day in range
      let sessionsCreated = 0;

      for (const schedule of schedules) {
        const { daysOfWeek, startDate, endDate: scheduleEndDate } = schedule.recurrenceRule;

        // Iterate through dates in buffer range
        const currentDate = new Date(Math.max(today.getTime(), startDate.getTime()));

        while (currentDate <= endDate) {
          // Check if schedule has ended
          if (scheduleEndDate && currentDate > scheduleEndDate) {
            break;
          }

          const dayOfWeek = currentDate.getDay();
          const dateKey = currentDate.toISOString().split('T')[0];

          // If this day matches schedule and no session exists, create one
          if (daysOfWeek.includes(dayOfWeek) && !existingDateMap.has(dateKey)) {
            await WorkoutSession.create({
              userId: new mongoose.Types.ObjectId(ctx.userId),
              date: new Date(currentDate),
              sourceRoutineId: schedule.routineId,
              status: SessionStatus.PLANNED,
              logs: [],
            });

            sessionsCreated++;
            existingDateMap.set(dateKey, true); // Prevent duplicates
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      return { sessionsCreated };
    }),
});
