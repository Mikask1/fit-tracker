'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setQueryClientRef } from '@/lib/offline/queryClientRef';
import { checkHealth } from '@/lib/offline/health';
import { kickFlush } from '@/lib/offline/flush';
import { reapplyOutboxToCache } from '@/lib/offline/registry';
import { useConnectionStore } from '@/store/connectionStore';
import { useOutboxStore } from '@/store/outboxStore';

// Wires the offline sync engine into the app lifecycle: exposes the
// QueryClient to the non-React offline modules, tracks navigator.onLine,
// and flushes the outbox whenever connectivity plausibly returned.
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  setQueryClientRef(queryClient);
  if (typeof window !== 'undefined') {
    // Debug handle for inspecting the live cache (DevTools / e2e scripts).
    (window as unknown as Record<string, unknown>).__fittrackQueryClient = queryClient;
  }

  useEffect(() => {
    // Rebase buffered writes on top of any fresh server data. On a flaky
    // connection a query refetch can succeed while mutations are still
    // buffered; the response won't contain those changes yet, so re-apply
    // them (idempotently) or the user's edits would visibly vanish.
    let rebaseScheduled = false;
    let rebasing = false;
    const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
      if (rebasing || event.type !== 'updated') return;
      const action = (event as { action?: { type?: string; manual?: boolean } }).action;
      if (action?.type !== 'success' || action.manual) return; // only real fetches
      const { entries } = useOutboxStore.getState();
      if (entries.length === 0 || rebaseScheduled) return;
      rebaseScheduled = true;
      queueMicrotask(() => {
        rebaseScheduled = false;
        rebasing = true;
        try {
          reapplyOutboxToCache(queryClient, useOutboxStore.getState().entries);
        } finally {
          rebasing = false;
        }
      });
    });

    const setOnline = useConnectionStore.getState().setOnline;

    const tryFlush = async () => {
      if (await checkHealth()) {
        void kickFlush();
      }
    };

    const handleOnline = () => {
      setOnline(true);
      void tryFlush();
    };
    const handleOffline = () => setOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void tryFlush();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    // App start: hydrate the durable outbox, then flush anything a previous
    // session left behind.
    void useOutboxStore
      .getState()
      .hydrate()
      .then(() => {
        if (useOutboxStore.getState().entries.length > 0) {
          void tryFlush();
        }
      });

    return () => {
      unsubscribeCache();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [queryClient]);

  return <>{children}</>;
}
