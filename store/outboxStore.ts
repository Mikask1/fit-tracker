import { create } from 'zustand';
import { appStateStore, idbGet, idbSet } from '@/lib/offline/idb';
import { deepMapTempIds } from '@/lib/offline/tempId';

export type OutboxEntryStatus = 'pending' | 'inflight' | 'failed';

export interface OutboxEntry {
  id: string;
  /** Monotonic FIFO order — local intent order, never wall clock. */
  seq: number;
  /** tRPC procedure path, e.g. 'sessions.update'. */
  path: string;
  /** Raw mutation input. Stored via structured clone, so Dates survive. */
  input: unknown;
  /** Temp id minted for this entry's created document (creates only). */
  tempId?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  status: OutboxEntryStatus;
}

interface PersistedOutbox {
  entries: OutboxEntry[];
  idMap: Record<string, string>;
  nextSeq: number;
}

interface OutboxState extends PersistedOutbox {
  hasHydrated: boolean;
  hydrate: () => Promise<void>;
  enqueue: (path: string, input: unknown, tempId?: string) => Promise<OutboxEntry>;
  remove: (id: string) => Promise<void>;
  setStatus: (id: string, status: OutboxEntryStatus, lastError?: string) => Promise<void>;
  bumpAttempts: (id: string) => Promise<void>;
  /** Record a resolved temp id and rewrite it inside all remaining entries. */
  resolveTempId: (tempId: string, realId: string) => Promise<void>;
  retryFailed: (id: string) => Promise<void>;
  discardFailed: (id: string) => Promise<void>;
}

const IDB_KEY = 'fittrack-outbox';

// Paths where a newer queued write fully supersedes an older one for the same
// document — the older entry is dropped at enqueue time.
const COALESCE_PATHS = new Set(['sessions.update', 'auth.updatePreferences']);

function entryDocId(entry: { path: string; input: unknown }): string | undefined {
  const input = entry.input as { id?: unknown } | undefined;
  return typeof input?.id === 'string' ? input.id : undefined;
}

function inputKeys(input: unknown): string[] {
  return input && typeof input === 'object' ? Object.keys(input as object) : [];
}

async function persist(state: PersistedOutbox): Promise<void> {
  await idbSet(appStateStore, IDB_KEY, {
    entries: state.entries,
    idMap: state.idMap,
    nextSeq: state.nextSeq,
  });
}

let hydrationPromise: Promise<void> | null = null;

export const useOutboxStore = create<OutboxState>()((set, get) => ({
  entries: [],
  idMap: {},
  nextSeq: 1,
  hasHydrated: false,

  hydrate: () => {
    // Re-hydration merges IDB state (possibly written by another tab) with
    // memory by entry id, so a flush never misses entries and never
    // resurrects ones this tab already removed... except entries created by
    // the other tab, which is the point.
    hydrationPromise ??= (async () => {
      const stored = await idbGet<PersistedOutbox>(appStateStore, IDB_KEY);
      if (stored) {
        set((s) => {
          const byId = new Map(stored.entries.map((e) => [e.id, e] as const));
          for (const e of s.entries) byId.set(e.id, e);
          const entries = [...byId.values()].sort((a, b) => a.seq - b.seq);
          return {
            entries,
            idMap: { ...stored.idMap, ...s.idMap },
            nextSeq: Math.max(stored.nextSeq, s.nextSeq, ...entries.map((e) => e.seq + 1)),
            hasHydrated: true,
          };
        });
      } else {
        set({ hasHydrated: true });
      }
    })();
    return hydrationPromise;
  },

  enqueue: async (path, input, tempId) => {
    await get().hydrate();
    const state = get();
    const entry: OutboxEntry = {
      id: `obx_${state.nextSeq}_${Math.random().toString(36).slice(2, 8)}`,
      seq: state.nextSeq,
      path,
      input,
      tempId,
      createdAt: Date.now(),
      attempts: 0,
      status: 'pending',
    };

    let entries = state.entries;
    if (COALESCE_PATHS.has(path)) {
      const docId = entryDocId(entry);
      const newKeys = new Set(inputKeys(input));
      entries = entries.filter((e) => {
        if (e.path !== path || e.status !== 'pending') return true;
        if (entryDocId(e) !== docId) return true;
        // Drop the older write only if the new one covers every field it set.
        return !inputKeys(e.input).every((k) => newKeys.has(k));
      });
    }

    const next = { entries: [...entries, entry], idMap: state.idMap, nextSeq: state.nextSeq + 1 };
    set(next);
    // Await the IDB write so the buffered mutation is durable before the
    // caller's optimistic success resolves.
    await persist(next);
    return entry;
  },

  remove: async (id) => {
    const state = get();
    const next = { ...pick(state), entries: state.entries.filter((e) => e.id !== id) };
    set(next);
    await persist(next);
  },

  setStatus: async (id, status, lastError) => {
    const state = get();
    const next = {
      ...pick(state),
      entries: state.entries.map((e) => (e.id === id ? { ...e, status, lastError } : e)),
    };
    set(next);
    await persist(next);
  },

  bumpAttempts: async (id) => {
    const state = get();
    const next = {
      ...pick(state),
      entries: state.entries.map((e) => (e.id === id ? { ...e, attempts: e.attempts + 1 } : e)),
    };
    set(next);
    await persist(next);
  },

  resolveTempId: async (tempId, realId) => {
    const state = get();
    const idMap = { ...state.idMap, [tempId]: realId };
    const next = {
      entries: state.entries.map((e) => ({ ...e, input: deepMapTempIds(e.input, idMap) })),
      idMap,
      nextSeq: state.nextSeq,
    };
    set(next);
    await persist(next);
  },

  retryFailed: async (id) => {
    const state = get();
    const next = {
      ...pick(state),
      entries: state.entries.map((e) =>
        e.id === id && e.status === 'failed' ? { ...e, status: 'pending' as const, attempts: 0 } : e
      ),
    };
    set(next);
    await persist(next);
  },

  discardFailed: async (id) => {
    const state = get();
    const next = {
      ...pick(state),
      entries: state.entries.filter((e) => !(e.id === id && e.status === 'failed')),
    };
    set(next);
    await persist(next);
  },
}));

function pick(state: PersistedOutbox): PersistedOutbox {
  return { entries: state.entries, idMap: state.idMap, nextSeq: state.nextSeq };
}

/** Entries still waiting to reach the server (excludes hard-failed ones). */
export function pendingOutboxCount(): number {
  return useOutboxStore.getState().entries.filter((e) => e.status !== 'failed').length;
}
