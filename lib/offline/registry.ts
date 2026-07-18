/* eslint-disable @typescript-eslint/no-explicit-any --
 * This module patches cached tRPC query data, which arrives as populated
 * Mongo documents the same untyped way the pages consume it. */
import type { QueryClient } from '@tanstack/react-query';
import { SessionStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';

// Per-mutation offline behavior. `queueable` procedures are buffered in the
// outbox when the connection is unhealthy and applied optimistically to the
// React Query cache so the UI reflects them immediately.
export type ProcedureMode = 'queueable' | 'network-only' | 'network-only-silent';

export interface ProcedureMeta {
  mode: ProcedureMode;
  /** Creates mint a temp id that later gets swapped for the server ObjectId. */
  mintsTempId?: boolean;
  /** What the caller's `await mutateAsync()` resolves to while offline. */
  buildOptimisticResult?: (input: any, tempId: string | undefined, qc: QueryClient) => unknown;
  /** Mirror the mutation into the cached query data (offline optimistic write). */
  applyToCache?: (qc: QueryClient, input: any, result: unknown) => void;
  /** Pull the server-minted id out of a create's real result at flush time. */
  extractRealId?: (serverResult: any) => string | undefined;
  /** Resolved value for network-only-silent procedures while offline. */
  offlineResult?: unknown;
}

type AnyRecord = Record<string, any>;

const nowIso = () => new Date();

function currentUserId(): string {
  return useAuthStore.getState().userId ?? 'offline-user';
}

// ---------------------------------------------------------------------------
// Query-cache helpers. tRPC v11 react-query keys look like:
//   [['sessions','listByDateRange'], { input: {...}, type: 'query' }]
// A one-element key array is a prefix that fuzzy-matches every input variant.
// ---------------------------------------------------------------------------

function procKey(path: string): [string[]] {
  return [path.split('.')];
}

function keyInput(queryKey: readonly unknown[]): AnyRecord | undefined {
  const meta = queryKey[1] as { input?: AnyRecord } | undefined;
  return meta?.input;
}

function updateListCaches(
  qc: QueryClient,
  path: string,
  update: (old: any[], input: AnyRecord | undefined) => any[] | undefined
) {
  const queries = qc.getQueriesData<any[]>({ queryKey: procKey(path) });
  for (const [queryKey, data] of queries) {
    if (!Array.isArray(data)) continue;
    const next = update(data, keyInput(queryKey));
    if (next) qc.setQueryData(queryKey, next);
  }
}

function detailKey(path: string, id: string) {
  return [path.split('.'), { input: { id }, type: 'query' }];
}

function setDetailCache(qc: QueryClient, path: string, id: string, value: unknown) {
  qc.setQueryData(detailKey(path, id), value);
}

/**
 * Seed a detail cache only when nothing is there yet. Idempotent re-applies
 * (the rebase pass) must NOT replace an existing entry: a fresh object
 * reference retriggers page effects keyed on the query data — the session
 * logging page resets its form when the session object changes.
 */
function seedDetailCache(qc: QueryClient, path: string, id: string, value: unknown) {
  if (qc.getQueryData(detailKey(path, id)) === undefined) {
    qc.setQueryData(detailKey(path, id), value);
  }
}

function patchDetailCache(qc: QueryClient, path: string, id: string, patch: (old: any) => any) {
  const key = detailKey(path, id);
  const old = qc.getQueryData<any>(key);
  if (old) qc.setQueryData(key, patch(old));
}

function docId(doc: any): string {
  const raw = doc?._id;
  return typeof raw === 'object' && raw !== null ? String(raw) : String(raw ?? '');
}

/**
 * Server list queries return populated movement refs (full objects). Offline
 * we "fake-populate" from the cached movements list; when the movement isn't
 * cached we fall back to the raw id string, which every consumer already
 * handles via the `typeof x === 'object' ? x._id : x` idiom.
 */
function fakePopulateMovement(qc: QueryClient, movementId: string): any {
  const lists = qc.getQueriesData<any[]>({ queryKey: procKey('movements.list') });
  for (const [, data] of lists) {
    const hit = Array.isArray(data) ? data.find((m) => docId(m) === movementId) : undefined;
    if (hit) return hit;
  }
  const detail = qc.getQueryData<any>(detailKey('movements.getById', movementId));
  return detail ?? movementId;
}

function fakePopulateRoutine(qc: QueryClient, routineId: string): any {
  const lists = qc.getQueriesData<any[]>({ queryKey: procKey('routines.list') });
  for (const [, data] of lists) {
    const hit = Array.isArray(data) ? data.find((r) => docId(r) === routineId) : undefined;
    if (hit) return hit;
  }
  return routineId;
}

function populateExercises(qc: QueryClient, exercises: any[]): any[] {
  return exercises.map((ex) => ({
    ...ex,
    movementId: fakePopulateMovement(qc, ex.movementId),
    alternativeMovements: (ex.alternativeMovements ?? []).map((alt: any) => ({
      ...alt,
      movementId: fakePopulateMovement(qc, alt.movementId),
    })),
  }));
}

function populateLogs(qc: QueryClient, logs: any[]): any[] {
  return logs.map((log) => ({
    ...log,
    movementId: fakePopulateMovement(qc, log.movementId),
  }));
}

function dateInRange(date: Date, input: AnyRecord | undefined): boolean {
  const start = input?.startDate instanceof Date ? input.startDate : undefined;
  const end = input?.endDate instanceof Date ? input.endDate : undefined;
  if (!start || !end) return false;
  const t = new Date(date).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

// ---------------------------------------------------------------------------
// Optimistic document builders
// ---------------------------------------------------------------------------

function buildMovement(input: AnyRecord, tempId: string | undefined): AnyRecord {
  return {
    _id: tempId,
    userId: currentUserId(),
    name: input.name,
    muscleGroups: input.muscleGroups,
    image: input.image,
    note: input.note,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function buildRoutine(qc: QueryClient, input: AnyRecord, tempId: string | undefined): AnyRecord {
  return {
    _id: tempId,
    userId: currentUserId(),
    name: input.name,
    exercises: populateExercises(qc, input.exercises ?? []),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function buildSession(qc: QueryClient, input: AnyRecord, tempId: string | undefined): AnyRecord {
  return {
    _id: tempId,
    userId: currentUserId(),
    date: input.date,
    sourceRoutineId: input.sourceRoutineId,
    status: input.status ?? SessionStatus.PLANNED,
    logs: populateLogs(qc, input.logs ?? []),
    notes: undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function buildSchedule(qc: QueryClient, input: AnyRecord, tempId: string | undefined): AnyRecord {
  return {
    _id: tempId,
    userId: currentUserId(),
    routineId: fakePopulateRoutine(qc, input.routineId),
    recurrenceRule: {
      daysOfWeek: input.daysOfWeek,
      startDate: input.startDate,
      endDate: input.endDate,
    },
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const mutationRegistry: Record<string, ProcedureMeta> = {
  // ----- movements -----
  'movements.create': {
    mode: 'queueable',
    mintsTempId: true,
    buildOptimisticResult: (input, tempId) => buildMovement(input, tempId),
    extractRealId: (r) => (r?._id != null ? String(r._id) : undefined),
    applyToCache: (qc, input, result) => {
      updateListCaches(qc, 'movements.list', (old, listInput) => {
        const filter = listInput?.muscleGroupMain;
        if (filter && !input.muscleGroups?.some((g: any) => g.main === filter)) return undefined;
        if (old.some((m) => docId(m) === docId(result))) return undefined; // idempotent re-apply
        return [result, ...old];
      });
      seedDetailCache(qc, 'movements.getById', docId(result), result);
    },
  },
  'movements.update': {
    mode: 'queueable',
    buildOptimisticResult: (input, _tempId, qc) => {
      const existing = fakePopulateMovement(qc, input.id);
      const base = typeof existing === 'object' ? existing : { _id: input.id, userId: currentUserId() };
      const { id: _id, ...updates } = input;
      void _id;
      return { ...base, ...updates, updatedAt: nowIso() };
    },
    applyToCache: (qc, input) => {
      const { id, ...updates } = input;
      const patch = (m: any) => ({ ...m, ...updates, updatedAt: nowIso() });
      updateListCaches(qc, 'movements.list', (old) =>
        old.some((m) => docId(m) === id) ? old.map((m) => (docId(m) === id ? patch(m) : m)) : undefined
      );
      patchDetailCache(qc, 'movements.getById', id, patch);
    },
  },
  'movements.delete': {
    mode: 'queueable',
    buildOptimisticResult: () => ({ success: true }),
    applyToCache: (qc, input) => {
      updateListCaches(qc, 'movements.list', (old) => old.filter((m) => docId(m) !== input.id));
      qc.removeQueries({ queryKey: detailKey('movements.getById', input.id) });
      // Mirror the server-side cascade: the movement is pulled out of every
      // routine's exercises array.
      const dropExercise = (r: any) => ({
        ...r,
        exercises: (r.exercises ?? []).filter((ex: any) => {
          const exId = typeof ex.movementId === 'object' ? docId(ex.movementId) : String(ex.movementId);
          return exId !== input.id;
        }),
      });
      updateListCaches(qc, 'routines.list', (old) => old.map(dropExercise));
      const routineDetails = qc.getQueriesData<any>({ queryKey: procKey('routines.getById') });
      for (const [key, data] of routineDetails) {
        if (data) qc.setQueryData(key, dropExercise(data));
      }
    },
  },

  // ----- routines -----
  'routines.create': {
    mode: 'queueable',
    mintsTempId: true,
    buildOptimisticResult: (input, tempId, qc) => buildRoutine(qc, input, tempId),
    extractRealId: (r) => (r?._id != null ? String(r._id) : undefined),
    applyToCache: (qc, _input, result: any) => {
      updateListCaches(qc, 'routines.list', (old) => {
        if (old.some((r) => docId(r) === docId(result))) return undefined; // idempotent re-apply
        return [...old, result].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      });
      seedDetailCache(qc, 'routines.getById', docId(result), result);
    },
  },
  'routines.update': {
    mode: 'queueable',
    buildOptimisticResult: (input, _tempId, qc) => {
      const existing = fakePopulateRoutine(qc, input.id);
      const base = typeof existing === 'object' ? existing : { _id: input.id, userId: currentUserId() };
      return {
        ...base,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.exercises ? { exercises: populateExercises(qc, input.exercises) } : {}),
        updatedAt: nowIso(),
      };
    },
    applyToCache: (qc, input) => {
      const patch = (r: any) => ({
        ...r,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.exercises ? { exercises: populateExercises(qc, input.exercises) } : {}),
        updatedAt: nowIso(),
      });
      updateListCaches(qc, 'routines.list', (old) =>
        old.some((r) => docId(r) === input.id)
          ? old.map((r) => (docId(r) === input.id ? patch(r) : r))
          : undefined
      );
      patchDetailCache(qc, 'routines.getById', input.id, patch);
    },
  },
  'routines.delete': {
    mode: 'queueable',
    buildOptimisticResult: () => ({ success: true }),
    applyToCache: (qc, input) => {
      updateListCaches(qc, 'routines.list', (old) => old.filter((r) => docId(r) !== input.id));
      qc.removeQueries({ queryKey: detailKey('routines.getById', input.id) });
    },
  },

  // ----- sessions -----
  'sessions.create': {
    mode: 'queueable',
    mintsTempId: true,
    buildOptimisticResult: (input, tempId, qc) => buildSession(qc, input, tempId),
    extractRealId: (r) => (r?._id != null ? String(r._id) : undefined),
    applyToCache: (qc, input, result: any) => {
      updateListCaches(qc, 'sessions.listByDateRange', (old, listInput) => {
        if (!dateInRange(input.date, listInput)) return undefined;
        if (listInput?.status && listInput.status !== result.status) return undefined;
        if (old.some((s) => docId(s) === docId(result))) return undefined; // idempotent re-apply
        return [...old, result].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });
      // Makes "create session → navigate to /calendar/session/<id>" work
      // offline: the logging page's getById query hits this seeded entry.
      seedDetailCache(qc, 'sessions.getById', docId(result), result);
    },
  },
  'sessions.update': {
    mode: 'queueable',
    buildOptimisticResult: (input, _tempId, qc) => {
      const existing = qc.getQueryData<any>(detailKey('sessions.getById', input.id));
      const base = existing ?? { _id: input.id, userId: currentUserId(), logs: [] };
      return applySessionPatch(qc, base, input);
    },
    applyToCache: (qc, input) => {
      const patch = (s: any) => applySessionPatch(qc, s, input);
      updateListCaches(qc, 'sessions.listByDateRange', (old, listInput) => {
        if (!old.some((s) => docId(s) === input.id)) return undefined;
        let next = old.map((s) => (docId(s) === input.id ? patch(s) : s));
        if (listInput?.status) {
          next = next.filter((s) => docId(s) !== input.id || s.status === listInput.status);
        }
        return next;
      });
      patchDetailCache(qc, 'sessions.getById', input.id, patch);
    },
  },
  'sessions.delete': {
    mode: 'queueable',
    buildOptimisticResult: () => ({ success: true }),
    applyToCache: (qc, input) => {
      updateListCaches(qc, 'sessions.listByDateRange', (old) =>
        old.filter((s) => docId(s) !== input.id)
      );
      qc.removeQueries({ queryKey: detailKey('sessions.getById', input.id) });
    },
  },
  'sessions.ensureSessionBuffer': {
    // Server-side generation over schedules — meaningless to buffer (it would
    // run against the same state after sync anyway) and safe to skip offline.
    mode: 'network-only-silent',
    offlineResult: { sessionsCreated: 0 },
  },

  // ----- schedules -----
  'schedules.create': {
    mode: 'queueable',
    mintsTempId: true,
    buildOptimisticResult: (input, tempId, qc) => buildSchedule(qc, input, tempId),
    extractRealId: (r) => (r?._id != null ? String(r._id) : undefined),
    applyToCache: (qc, _input, result: any) => {
      updateListCaches(qc, 'schedules.list', (old) => {
        if (old.some((s) => docId(s) === docId(result))) return undefined; // idempotent re-apply
        return [result, ...old];
      });
      seedDetailCache(qc, 'schedules.getById', docId(result), result);
    },
  },
  'schedules.update': {
    mode: 'queueable',
    buildOptimisticResult: (input, _tempId, qc) => {
      const existing = qc.getQueryData<any>(detailKey('schedules.getById', input.id));
      return applySchedulePatch(existing ?? { _id: input.id, recurrenceRule: {} }, input);
    },
    applyToCache: (qc, input) => {
      const patch = (s: any) => applySchedulePatch(s, input);
      updateListCaches(qc, 'schedules.list', (old, listInput) => {
        if (!old.some((s) => docId(s) === input.id)) return undefined;
        let next = old.map((s) => (docId(s) === input.id ? patch(s) : s));
        if (listInput?.activeOnly !== false && input.isActive === false) {
          next = next.filter((s) => docId(s) !== input.id);
        }
        return next;
      });
      patchDetailCache(qc, 'schedules.getById', input.id, patch);
    },
  },
  'schedules.delete': {
    mode: 'queueable',
    buildOptimisticResult: () => ({ success: true }),
    applyToCache: (qc, input) => {
      updateListCaches(qc, 'schedules.list', (old) => old.filter((s) => docId(s) !== input.id));
      qc.removeQueries({ queryKey: detailKey('schedules.getById', input.id) });
    },
  },

  // ----- auth -----
  'auth.updatePreferences': {
    mode: 'queueable',
    buildOptimisticResult: (input, _tempId, qc) => {
      const me = qc.getQueryData<any>([['auth', 'me'], { type: 'query' }]);
      return {
        userId: me?.userId ?? currentUserId(),
        username: me?.username ?? useAuthStore.getState().username,
        expectedWorkoutsPerWeek: input.expectedWorkoutsPerWeek,
      };
    },
    applyToCache: (qc, input) => {
      const key = [['auth', 'me'], { type: 'query' }];
      const me = qc.getQueryData<any>(key);
      if (me) {
        qc.setQueryData(key, { ...me, expectedWorkoutsPerWeek: input.expectedWorkoutsPerWeek });
      }
    },
  },
  // Auth session changes require the server — they fail fast offline with a
  // clear message instead of being buffered.
  'auth.login': { mode: 'network-only' },
  'auth.register': { mode: 'network-only' },
  'auth.logout': { mode: 'network-only' },
};

function applySessionPatch(qc: QueryClient, session: any, input: AnyRecord): any {
  return {
    ...session,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.logs ? { logs: populateLogs(qc, input.logs) } : {}),
    // Keeps sessionDraftStore's `draft.timestamp > session.updatedAt` restore
    // check honest for data written offline.
    updatedAt: nowIso(),
  };
}

function applySchedulePatch(schedule: any, input: AnyRecord): any {
  const rule = schedule.recurrenceRule ?? {};
  return {
    ...schedule,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    recurrenceRule: {
      daysOfWeek: input.daysOfWeek ?? rule.daysOfWeek,
      startDate: input.startDate ?? rule.startDate,
      endDate: input.endDate !== undefined ? input.endDate : rule.endDate,
    },
    updatedAt: nowIso(),
  };
}

/**
 * Rebase: re-apply every still-pending outbox entry on top of the current
 * cache. Called after fresh server data lands while writes are buffered —
 * without this, a refetch that sneaks through on a flaky connection would
 * show server truth (which lacks the buffered changes) and the user's edits
 * would visibly vanish until the next flush. All appliers are idempotent.
 */
export function reapplyOutboxToCache(
  qc: QueryClient,
  entries: Array<{ path: string; input: unknown; tempId?: string; seq: number; status: string }>
) {
  const pending = entries
    .filter((e) => e.status !== 'failed')
    .sort((a, b) => a.seq - b.seq);
  for (const entry of pending) {
    const meta = mutationRegistry[entry.path];
    if (!meta?.applyToCache) continue;
    const result = meta.buildOptimisticResult
      ? meta.buildOptimisticResult(entry.input, entry.tempId, qc)
      : undefined;
    meta.applyToCache(qc, entry.input, result);
  }
}

/**
 * After a flushed create returns the server ObjectId, swap the temp id for
 * the real one everywhere in the cache: re-key detail queries and deep-replace
 * inside list data, so a user sitting on /calendar/session/temp_… keeps a
 * working view (temp-keyed alias retained until the final invalidate).
 */
export function remapCachesAfterCreate(qc: QueryClient, path: string, tempId: string, realId: string) {
  const detailPath = `${path.split('.')[0]}.getById`;
  const tempDetail = qc.getQueryData<any>(detailKey(detailPath, tempId));
  const idMap = { [tempId]: realId };

  const all = qc.getQueriesData<any>({});
  for (const [key, data] of all) {
    if (data === undefined) continue;
    const rewritten = deepReplace(data, idMap);
    if (rewritten !== data) qc.setQueryData(key, rewritten);
  }

  if (tempDetail) {
    setDetailCache(qc, detailPath, realId, deepReplace(tempDetail, idMap));
  }
}

function deepReplace(value: any, idMap: Record<string, string>): any {
  if (typeof value === 'string') return idMap[value] ?? value;
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((v) => {
      const r = deepReplace(v, idMap);
      if (r !== v) changed = true;
      return r;
    });
    return changed ? next : value;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    let changed = false;
    const next: AnyRecord = {};
    for (const [k, v] of Object.entries(value)) {
      const r = deepReplace(v, idMap);
      if (r !== v) changed = true;
      next[k] = r;
    }
    return changed ? next : value;
  }
  return value;
}
