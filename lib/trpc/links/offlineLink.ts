import { TRPCClientError, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { toast } from 'sonner';
import type { AppRouter } from '@/server/routers/_app';
import { mutationRegistry } from '@/lib/offline/registry';
import { mintTempId } from '@/lib/offline/tempId';
import { getQueryClientRef } from '@/lib/offline/queryClientRef';
import { useConnectionStore } from '@/store/connectionStore';
import { useOutboxStore, pendingOutboxCount } from '@/store/outboxStore';

/**
 * A tRPC application error (validation, CONFLICT, NOT_FOUND, auth…) is a real
 * server verdict and must reject normally. Anything else — fetch failure,
 * abort/timeout, 5xx — means the connection (or server) is unusable, so the
 * mutation gets buffered instead.
 */
function isNetworkish(err: unknown): boolean {
  if (!(err instanceof TRPCClientError)) return true;
  const httpStatus: number | undefined = err.data?.httpStatus;
  if (err.data?.code && httpStatus !== undefined && httpStatus < 500) return false;
  return true;
}

// One "saved offline" toast per burst of buffered mutations, not one per tap.
let lastOfflineToastAt = 0;
function offlineToast() {
  const now = Date.now();
  if (now - lastOfflineToastAt > 5000) {
    lastOfflineToastAt = now;
    toast.info('Saved offline — will sync when connection returns');
  }
}

/**
 * Terminating-adjacent link for mutations. While the connection is healthy it
 * passes through; when unhealthy (or when older writes are still queued, to
 * preserve FIFO) it durably enqueues the mutation, applies it optimistically
 * to the query cache, and resolves as a success so every existing onSuccess
 * handler (toasts, navigation, invalidation) works unchanged.
 */
export const offlineLink: TRPCLink<AppRouter> = () => {
  return ({ op, next }) => {
    if (op.type !== 'mutation') {
      return next(op);
    }

    return observable((observer) => {
      let passthroughUnsub: { unsubscribe: () => void } | null = null;
      let settled = false;

      const enqueueAndResolve = async () => {
        const meta = mutationRegistry[op.path];
        const qc = getQueryClientRef();
        const tempId = meta?.mintsTempId ? mintTempId() : undefined;

        // Durable first: the entry is in IndexedDB before the caller sees
        // success, so a reload cannot lose an acknowledged write.
        await useOutboxStore.getState().enqueue(op.path, op.input, tempId);

        let result: unknown = { success: true };
        if (qc && meta?.buildOptimisticResult) {
          result = meta.buildOptimisticResult(op.input, tempId, qc);
        }
        if (qc && meta?.applyToCache) {
          meta.applyToCache(qc, op.input, result);
        }

        offlineToast();
        if (!settled) {
          settled = true;
          observer.next({ result: { data: result } } as never);
          observer.complete();
        }
      };

      (async () => {
        const meta = mutationRegistry[op.path];
        const connection = useConnectionStore.getState();

        // Unregistered mutations always pass through untouched.
        if (!meta || meta.mode === 'network-only') {
          passthroughUnsub = next(op).subscribe(observer);
          return;
        }

        await useOutboxStore.getState().hydrate();

        if (meta.mode === 'network-only-silent') {
          if (connection.isHealthy) {
            passthroughUnsub = next(op).subscribe(observer);
          } else {
            observer.next({ result: { data: meta.offlineResult } } as never);
            observer.complete();
          }
          return;
        }

        // queueable: anything already buffered must reach the server first —
        // sending this write directly would reorder it ahead of the queue.
        if (connection.isHealthy && pendingOutboxCount() === 0) {
          passthroughUnsub = next(op).subscribe({
            next: (value) => observer.next(value),
            complete: () => {
              settled = true;
              observer.complete();
            },
            error: (err) => {
              if (isNetworkish(err)) {
                useConnectionStore.getState().markUnhealthy();
                void enqueueAndResolve().catch(() => observer.error(err));
              } else {
                settled = true;
                observer.error(err);
              }
            },
          });
        } else {
          await enqueueAndResolve();
        }
      })().catch((err) => {
        if (!settled) {
          settled = true;
          observer.error(TRPCClientError.from(err as Error));
        }
      });

      return () => {
        passthroughUnsub?.unsubscribe();
      };
    });
  };
};
