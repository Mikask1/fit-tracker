import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import superjson from 'superjson';
import { rqCacheStore, idbGet, idbSet, idbDel } from './idb';

// React Query cache persister backed by IndexedDB.
// superjson (already the tRPC transformer) keeps Dates intact across the
// serialize/deserialize round-trip — the old localStorage persister silently
// rehydrated Dates as strings.
export function createIDBPersister() {
  return createAsyncStoragePersister({
    storage: {
      getItem: (key: string) => idbGet<string>(rqCacheStore, key).then((v) => v ?? null),
      setItem: (key: string, value: string) => idbSet(rqCacheStore, key, value),
      removeItem: (key: string) => idbDel(rqCacheStore, key),
    },
    serialize: superjson.stringify,
    deserialize: superjson.parse,
    // Coalesce rapid cache changes into one IDB write.
    throttleTime: 1000,
  });
}
