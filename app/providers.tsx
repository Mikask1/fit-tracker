'use client';

import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc, getTRPCClient } from '@/lib/trpc/client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIDBPersister } from '@/lib/offline/persister';
import { OfflineSyncProvider } from '@/components/offline/OfflineSyncProvider';

// How long persisted data stays restorable offline.
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

// Bump to invalidate all persisted caches after breaking schema changes.
const CACHE_BUSTER = 'fittrack-offline-v1';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      // Never gc in-memory: gc'd queries can't be persisted, and a finite
      // value this large would overflow setTimeout's 32-bit ms limit (which
      // makes the timer fire IMMEDIATELY, evicting the whole offline cache).
      // The persister's maxAge below handles long-term pruning instead.
      gcTime: Infinity,
      // Fail refetches FAST while offline instead of letting the retryer
      // park them in 'paused': a paused refetch never settles, so every
      // `await utils.*.invalidate()` in mutation onSuccess handlers would
      // hang and leave buttons stuck in their pending state. Cached data
      // survives the failure; refetchOnReconnect + the post-flush
      // invalidate restore freshness once the connection returns.
      retry: (failureCount) => onlineManager.isOnline() && failureCount < 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      // The offline link buffers on network failure; React Query must not
      // retry mutations on top of that or buffered writes would duplicate.
      retry: false,
    },
  },
});

const persister = typeof window !== 'undefined' ? createIDBPersister() : undefined;

// One-time migration: the query cache used to live in localStorage.
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
  } catch {
    // ignore
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [trpcClient] = useState(() => getTRPCClient());

  if (persister) {
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_BUSTER }}
        >
          <OfflineSyncProvider>{children}</OfflineSyncProvider>
        </PersistQueryClientProvider>
      </trpc.Provider>
    );
  }

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
