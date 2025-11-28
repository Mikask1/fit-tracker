import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson, // Allows Date objects and other complex types
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to check authentication
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      userId: ctx.userId, // userId is now guaranteed to be defined
    },
  });
});

// Protected procedure requires authentication
export const protectedProcedure = t.procedure.use(isAuthed);
