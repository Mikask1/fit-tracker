import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import WorkoutSession, { SessionStatus } from '@/lib/models/WorkoutSession';
import Movement from '@/lib/models/Movement';
import mongoose from 'mongoose';

export const analyticsRouter = router({
  // Get muscle group distribution by volume
  getMuscleDistribution: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        drillPath: z.array(z.string()).optional().default([]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, drillPath } = input;
      const level = drillPath.length;

      // Base pipeline stages (common to all levels)
      const pipeline: any[] = [
        // Match user and date range, only completed sessions
        {
          $match: {
            userId: new mongoose.Types.ObjectId(ctx.userId),
            date: { $gte: startDate, $lte: endDate },
            status: SessionStatus.COMPLETED,
          },
        },
        { $unwind: '$logs' },
        { $unwind: '$logs.sets' },
        {
          $lookup: {
            from: 'movements',
            localField: 'logs.movementId',
            foreignField: '_id',
            as: 'movement',
          },
        },
        { $unwind: '$movement' },
        { $unwind: '$movement.muscleGroups' },
        {
          $addFields: {
            volume: {
              $multiply: ['$logs.sets.weight', '$logs.sets.reps'],
            },
          },
        },
      ];

      // Add filtering based on drill path
      if (level > 0) {
        const matchStage: any = {
          'movement.muscleGroups.main': drillPath[0],
        };

        if (level > 1) {
          matchStage.$or = [
            { 'movement.muscleGroups.category': drillPath[1] },
            { 'movement.muscleGroups.sub': drillPath[1] },
          ];
        }

        pipeline.push({ $match: matchStage });
      }

      // Add grouping and projection based on drill level
      if (level === 0) {
        // Level 0: Group by main muscle group
        pipeline.push(
          {
            $group: {
              _id: '$movement.muscleGroups.main',
              totalVolume: { $sum: '$volume' },
            },
          },
          {
            $project: {
              name: '$_id',
              mainGroup: '$_id',
              volume: '$totalVolume',
              _id: 0,
            },
          }
        );
      } else if (level === 1) {
        // Level 1: Group by category
        pipeline.push(
          {
            $group: {
              _id: {
                main: '$movement.muscleGroups.main',
                category: {
                  $ifNull: [
                    '$movement.muscleGroups.category',
                    '$movement.muscleGroups.sub',
                  ],
                },
              },
              totalVolume: { $sum: '$volume' },
            },
          },
          {
            $project: {
              name: '$_id.category',
              mainGroup: '$_id.main',
              volume: '$totalVolume',
              _id: 0,
            },
          }
        );
      } else {
        // Level 2: Group by specific muscle
        pipeline.push(
          // Filter out null specific values
          {
            $match: {
              'movement.muscleGroups.specific': { $ne: null, $exists: true },
            },
          },
          {
            $group: {
              _id: {
                main: '$movement.muscleGroups.main',
                category: {
                  $ifNull: [
                    '$movement.muscleGroups.category',
                    '$movement.muscleGroups.sub',
                  ],
                },
                specific: '$movement.muscleGroups.specific',
              },
              totalVolume: { $sum: '$volume' },
            },
          },
          {
            $project: {
              name: '$_id.specific',
              mainGroup: '$_id.main',
              category: '$_id.category',
              volume: '$totalVolume',
              _id: 0,
            },
          }
        );
      }

      pipeline.push({ $sort: { volume: -1 } });

      const result = await WorkoutSession.aggregate(pipeline);

      return result;
    }),

  // Get progressive overload data for selected movements
  getProgressiveOverload: protectedProcedure
    .input(
      z.object({
        movementIds: z.array(z.string()),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.movementIds.length === 0) {
        return [];
      }

      const movementObjectIds = input.movementIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );

      const result = await WorkoutSession.aggregate([
        // Match user, date range, and completed sessions
        {
          $match: {
            userId: new mongoose.Types.ObjectId(ctx.userId),
            date: { $gte: input.startDate, $lte: input.endDate },
            status: SessionStatus.COMPLETED,
            'logs.movementId': { $in: movementObjectIds },
          },
        },
        // Unwind logs to work with individual movements
        { $unwind: '$logs' },
        // Filter only selected movements
        {
          $match: {
            'logs.movementId': { $in: movementObjectIds },
          },
        },
        // Get max weight for each log
        {
          $addFields: {
            maxWeight: {
              $max: '$logs.sets.weight',
            },
          },
        },
        // Group by movement and date
        {
          $group: {
            _id: {
              movementId: '$logs.movementId',
              movementName: '$logs.movementName',
              date: '$date',
            },
            maxWeight: { $max: '$maxWeight' },
          },
        },
        // Sort by date
        { $sort: { '_id.date': 1 } },
        // Group by movement to create array of data points
        {
          $group: {
            _id: '$_id.movementId',
            movementName: { $first: '$_id.movementName' },
            data: {
              $push: {
                date: '$_id.date',
                weight: '$maxWeight',
              },
            },
          },
        },
        // Project final shape
        {
          $project: {
            movementId: { $toString: '$_id' },
            movementName: 1,
            data: 1,
            _id: 0,
          },
        },
      ]);

      return result;
    }),

  // Get consistency metrics based on user's expectedWorkoutsPerWeek
  getConsistencyMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Import User model
      const User = (await import('@/lib/models/User')).default;

      // Get user's expected workouts per week setting
      const user = await User.findById(ctx.userId);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      // Calculate number of days in date range (inclusive)
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const timeDiff = input.endDate.getTime() - input.startDate.getTime();
      const numberOfDays = Math.round(timeDiff / millisecondsPerDay) + 1; // +1 to include both start and end dates

      // Calculate expected workouts based on user's goal
      // Formula: (days / 7) * workoutsPerWeek, rounded to nearest integer
      const expectedWorkouts = Math.round((numberOfDays / 7) * user.expectedWorkoutsPerWeek);

      // Count actual completed sessions in date range
      const totalCompleted = await WorkoutSession.countDocuments({
        userId: new mongoose.Types.ObjectId(ctx.userId),
        date: { $gte: input.startDate, $lte: input.endDate },
        status: SessionStatus.COMPLETED,
      });

      // Calculate metrics
      const completionRate = expectedWorkouts > 0
        ? (totalCompleted / expectedWorkouts) * 100
        : 0;

      // Missed workouts = expected - completed (never negative)
      const missedWorkouts = Math.max(0, expectedWorkouts - totalCompleted);

      return {
        totalPlanned: expectedWorkouts, // Now represents expected workouts, not PLANNED sessions
        totalCompleted,
        completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
        missedDays: missedWorkouts,
      };
    }),

  // Get all movements for dropdown (simplified list)
  getAllMovements: protectedProcedure.query(async ({ ctx }) => {
    const movements = await Movement.find({
      userId: new mongoose.Types.ObjectId(ctx.userId),
    })
      .select('_id name')
      .sort({ name: 1 })
      .lean();

    return movements.map((m) => ({
      _id: m._id.toString(),
      name: m.name,
    }));
  }),

  // Get daily workout data for calendar heatmap
  getDailyWorkouts: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await WorkoutSession.aggregate([
        // Match user and date range, only completed sessions
        {
          $match: {
            userId: new mongoose.Types.ObjectId(ctx.userId),
            date: { $gte: input.startDate, $lte: input.endDate },
            status: SessionStatus.COMPLETED,
          },
        },
        // Unwind logs and sets to get max weight
        { $unwind: '$logs' },
        { $unwind: '$logs.sets' },
        // Group by date to get daily max weight
        {
          $group: {
            _id: '$date',
            workoutCount: { $sum: 1 }, // Count sets as indicator of workout intensity
            maxWeight: { $max: '$logs.sets.weight' },
          },
        },
        // Project final shape
        {
          $project: {
            date: '$_id',
            workoutCount: 1,
            maxWeight: 1,
            _id: 0,
          },
        },
        // Sort by date
        { $sort: { date: 1 } },
      ]);

      return result;
    }),
});
