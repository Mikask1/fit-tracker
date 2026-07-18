import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, httpLink, splitLink } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';
import superjson from 'superjson';
import { offlineLink } from './links/offlineLink';

export const trpc = createTRPCReact<AppRouter>();

// On a very slow connection a request that will never finish is worse than an
// immediate buffer: abort hard, let the offline link classify it as a network
// failure, and move on. `cache: 'no-store'` keeps the browser HTTP cache from
// serving stale API responses while offline (it happily serves heuristically
// cached GETs without a network round-trip, overwriting optimistic updates).
function fetchWithTimeout(timeoutMs: number) {
  return (url: RequestInfo | URL, options?: RequestInit) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal =
      options?.signal && typeof AbortSignal.any === 'function'
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;
    return fetch(url, { ...options, signal, cache: 'no-store' });
  };
}

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      splitLink({
        condition: (op) => op.type === 'mutation',
        // Mutations run unbatched through the offline link so each one has
        // its own procedure identity (needed for buffering) and timeout.
        true: [
          offlineLink,
          httpLink({
            url: '/api/trpc',
            transformer: superjson,
            fetch: fetchWithTimeout(10000),
          }),
        ],
        false: httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          fetch: fetchWithTimeout(15000),
        }),
      }),
    ],
  });
}
