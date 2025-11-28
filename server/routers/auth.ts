import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import User from '@/lib/models/User';
import { comparePassword } from '@/lib/utils/password';
import { generateToken, getTokenExpirationSeconds } from '@/lib/utils/jwt';

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(30),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingUser = await User.findOne({ username: input.username });

      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already exists',
        });
      }

      const user = await User.create({
        username: input.username,
        password: input.password, // Will be hashed by pre-save hook
      });

      // Generate JWT token
      const token = generateToken({
        userId: user._id.toString(),
        username: user.username,
      });

      // Set httpOnly cookie
      const maxAge = getTokenExpirationSeconds();
      const isProduction = process.env.NODE_ENV === 'production';
      ctx.resHeaders.set(
        'Set-Cookie',
        `fittrack-token=${token}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Lax; Path=/; Max-Age=${maxAge}`
      );

      return {
        userId: user._id.toString(),
        username: user.username,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await User.findOne({ username: input.username });

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      const isValid = await comparePassword(input.password, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      // Generate JWT token
      const token = generateToken({
        userId: user._id.toString(),
        username: user.username,
      });

      // Set httpOnly cookie
      const maxAge = getTokenExpirationSeconds();
      const isProduction = process.env.NODE_ENV === 'production';
      ctx.resHeaders.set(
        'Set-Cookie',
        `fittrack-token=${token}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Lax; Path=/; Max-Age=${maxAge}`
      );

      return {
        userId: user._id.toString(),
        username: user.username,
      };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    // Clear the cookie by setting it to expire immediately
    const isProduction = process.env.NODE_ENV === 'production';
    ctx.resHeaders.set(
      'Set-Cookie',
      `fittrack-token=; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Lax; Path=/; Max-Age=0`
    );

    return { success: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await User.findById(ctx.userId);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      userId: user._id.toString(),
      username: user.username,
      expectedWorkoutsPerWeek: user.expectedWorkoutsPerWeek || 3,
    };
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        expectedWorkoutsPerWeek: z.number().min(1).max(7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await User.findByIdAndUpdate(
        ctx.userId,
        { expectedWorkoutsPerWeek: input.expectedWorkoutsPerWeek },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return {
        userId: user._id.toString(),
        username: user.username,
        expectedWorkoutsPerWeek: user.expectedWorkoutsPerWeek,
      };
    }),
});
