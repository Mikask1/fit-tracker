import { router } from '../trpc';
import { authRouter } from './auth';
import { movementsRouter } from './movements';
import { routinesRouter } from './routines';
import { sessionsRouter } from './sessions';
import { schedulesRouter } from './schedules';
import { analyticsRouter } from './analytics';

export const appRouter = router({
  auth: authRouter,
  movements: movementsRouter,
  routines: routinesRouter,
  sessions: sessionsRouter,
  schedules: schedulesRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
