import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client';
import superjson from 'superjson';
import { toast } from 'sonner';
import type { AppRouter } from '@/server/routers/_app';
import { mutationRegistry, remapCachesAfterCreate } from './registry';
import { deepMapTempIds, findTempIds } from './tempId';
import { checkHealth } from './health';
import { getQueryClientRef } from './queryClientRef';
import { useConnectionStore } from '@/store/connectionStore';
import { useOutboxStore, type OutboxEntry } from '@/store/outboxStore';

const FLUSH_LOCK = 'fittrack-flush';
const MUTATE_TIMEOUT_MS = 15000;
const BACKOFF_BASE_MS = 5000;
const BACKOFF_CAP_MS = 10 * 60 * 1000;

// Replays bypass the offline link entirely — a vanilla client on a plain
// httpLink can never re-enqueue its own traffic.
let vanillaClient: ReturnType<typeof createTRPCClient<AppRouter>> | null = null;
function getVanillaClient() {
  vanillaClient ??= createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: '/api/trpc',
        transformer: superjson,
        fetch: (url, options) =>
          fetch(url, {
            ...options,
            signal: AbortSignal.timeout(MUTATE_TIMEOUT_MS),
            cache: 'no-store',
          }),
      }),
    ],
  });
  return vanillaClient;
}

function mutateByPath(path: string, input: unknown): Promise<unknown> {
  const segments = path.split('.');
  let node: unknown = getVanillaClient();
  for (const segment of segments) {
    node = (node as Record<string, unknown>)[segment];
  }
  return (node as { mutate: (input: unknown) => Promise<unknown> }).mutate(input);
}

function isNetworkish(err: unknown): boolean {
  if (!(err instanceof TRPCClientError)) return true;
  const httpStatus: number | undefined = err.data?.httpStatus;
  if (err.data?.code && httpStatus !== undefined && httpStatus < 500) return false;
  return true;
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof TRPCClientError && err.data?.code === 'UNAUTHORIZED';
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRetry(attempts: number) {
  if (retryTimer) clearTimeout(retryTimer);
  const delay = Math.min(BACKOFF_BASE_MS * 2 ** Math.min(attempts, 10), BACKOFF_CAP_MS);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void kickFlush();
  }, delay);
}

function nextEntry(): OutboxEntry | undefined {
  // 'inflight' entries are from a tab killed mid-send; the server may or may
  // not have applied them. Replaying is the least-bad option for a personal
  // tracker (a rare duplicate beats silent data loss).
  return useOutboxStore
    .getState()
    .entries.filter((e) => e.status === 'pending' || e.status === 'inflight')
    .sort((a, b) => a.seq - b.seq)[0];
}

// Fallback single-flight guard for browsers without the Web Locks API.
let flushingWithoutLock = false;

/**
 * Drain the outbox FIFO. Multi-tab safe via Web Locks; stops (with scheduled
 * backoff) on the first network-level failure; hard-fails only entries the
 * server explicitly rejected, and keeps going past them.
 */
export async function kickFlush(): Promise<void> {
  if (typeof window === 'undefined') return;

  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (locks?.request) {
    await locks.request(FLUSH_LOCK, { ifAvailable: true }, async (lock) => {
      if (!lock) return;
      await drain();
    });
  } else {
    if (flushingWithoutLock) return;
    flushingWithoutLock = true;
    try {
      await drain();
    } finally {
      flushingWithoutLock = false;
    }
  }
}

async function drain(): Promise<void> {
  const outbox = useOutboxStore.getState();
  const connection = useConnectionStore.getState();
  await outbox.hydrate();

  if (connection.syncPaused) return;
  if (!nextEntry()) return;

  if (!(await checkHealth())) {
    scheduleRetry(nextEntry()?.attempts ?? 0);
    return;
  }

  connection.setFlushing(true);
  let flushedAny = false;

  try {
    for (;;) {
      const entry = nextEntry();
      if (!entry) break;

      const store = useOutboxStore.getState();
      const input = deepMapTempIds(entry.input, store.idMap);

      // A temp id surviving the rewrite means the create it depended on was
      // rejected by the server — this entry can never succeed. (An entry's own
      // minted tempId never appears in its input; the server assigns the id.)
      const unresolved = findTempIds(input);
      if (unresolved.size > 0) {
        await store.setStatus(
          entry.id,
          'failed',
          'Depends on an item that failed to sync'
        );
        continue;
      }

      await store.setStatus(entry.id, 'inflight');

      try {
        const result = await mutateByPath(entry.path, input);
        if (entry.tempId) {
          const realId = mutationRegistry[entry.path]?.extractRealId?.(result);
          if (realId) {
            await useOutboxStore.getState().resolveTempId(entry.tempId, realId);
            const qc = getQueryClientRef();
            if (qc) remapCachesAfterCreate(qc, entry.path, entry.tempId, realId);
          }
        }
        await useOutboxStore.getState().remove(entry.id);
        flushedAny = true;
      } catch (err) {
        if (isUnauthorized(err)) {
          await useOutboxStore.getState().setStatus(entry.id, 'pending');
          useConnectionStore.getState().setSyncPaused('unauthorized');
          toast.error('Session expired — log in again to sync your offline changes');
          return;
        }
        if (isNetworkish(err)) {
          await useOutboxStore.getState().bumpAttempts(entry.id);
          await useOutboxStore.getState().setStatus(entry.id, 'pending');
          useConnectionStore.getState().markUnhealthy();
          scheduleRetry(entry.attempts + 1);
          return;
        }
        // Real server rejection (validation, CONFLICT, NOT_FOUND) — surface
        // it, keep it inspectable, and continue draining the rest.
        const message = err instanceof Error ? err.message : 'Sync failed';
        await useOutboxStore.getState().setStatus(entry.id, 'failed', message);
        toast.error(`Could not sync a change (${entry.path}): ${message}`);
      }
    }

    if (flushedAny) {
      useConnectionStore.getState().setLastSyncAt(Date.now());
      const qc = getQueryClientRef();
      if (qc) {
        // Server truth replaces every optimistic write in one sweep.
        await qc.invalidateQueries();
      }
      toast.success('All changes synced');
    }
  } finally {
    useConnectionStore.getState().setFlushing(false);
  }
}

/** Resume after a re-login while writes were paused on UNAUTHORIZED. */
export function resumeSyncAfterLogin(): void {
  const connection = useConnectionStore.getState();
  if (connection.syncPaused === 'unauthorized') {
    connection.setSyncPaused(null);
  }
  void kickFlush();
}
