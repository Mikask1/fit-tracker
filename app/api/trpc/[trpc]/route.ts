import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    // Browsers heuristically cache GET responses that lack Cache-Control and
    // will serve them from disk cache even while offline — which would feed
    // stale data over the app's IndexedDB offline cache. Never cache.
    responseMeta: () => ({
      headers: { 'Cache-Control': 'no-store' },
    }),
  });

export { handler as GET, handler as POST };
