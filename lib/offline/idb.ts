import { createStore, get, set, del, type UseStore } from 'idb-keyval';

// IndexedDB stores backing all offline persistence.
// idb-keyval's createStore cannot add multiple object stores to one database,
// so each concern gets its own tiny database:
// - `fittrack-rq-cache`: the persisted React Query client (the MongoDB data mirror)
// - `fittrack-app-state`: Zustand-persisted offline machinery (mutation outbox, id map)

function makeStore(dbName: string): UseStore | undefined {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return undefined;
  }
  return createStore(dbName, 'keyval');
}

export const rqCacheStore = makeStore('fittrack-rq-cache');
export const appStateStore = makeStore('fittrack-app-state');

export async function idbGet<T>(store: UseStore | undefined, key: string): Promise<T | undefined> {
  if (!store) return undefined;
  try {
    return await get<T>(key, store);
  } catch {
    return undefined;
  }
}

export async function idbSet(store: UseStore | undefined, key: string, value: unknown): Promise<void> {
  if (!store) return;
  try {
    await set(key, value, store);
  } catch {
    // Quota errors etc. — persistence is best-effort; the app keeps working in memory.
  }
}

export async function idbDel(store: UseStore | undefined, key: string): Promise<void> {
  if (!store) return;
  try {
    await del(key, store);
  } catch {
    // best-effort
  }
}
