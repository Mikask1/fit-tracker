import { create } from 'zustand';

// In-memory connection state. `isOnline` mirrors navigator.onLine (reliable
// only in the "definitely offline" direction); `isHealthy` is the real gate:
// it flips false on any network error / timeout and only flips back after a
// successful /api/health probe, so a slow-but-connected link is treated as
// offline (mutations buffer immediately instead of hanging per tap).
interface ConnectionState {
  isOnline: boolean;
  isHealthy: boolean;
  lastHealthCheckAt: number | null;
  lastSyncAt: number | null;
  isFlushing: boolean;
  /** Sync intentionally paused, e.g. JWT expired mid-offline. */
  syncPaused: 'unauthorized' | null;
  setOnline: (online: boolean) => void;
  markHealthy: () => void;
  markUnhealthy: () => void;
  setFlushing: (flushing: boolean) => void;
  setLastSyncAt: (at: number) => void;
  setSyncPaused: (paused: 'unauthorized' | null) => void;
}

export const useConnectionStore = create<ConnectionState>()((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  // Optimistic until proven otherwise — the first failed request flips it.
  isHealthy: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastHealthCheckAt: null,
  lastSyncAt: null,
  isFlushing: false,
  syncPaused: null,
  setOnline: (isOnline) =>
    set((s) => ({ isOnline, isHealthy: isOnline ? s.isHealthy : false })),
  markHealthy: () => set({ isHealthy: true, lastHealthCheckAt: Date.now() }),
  markUnhealthy: () => set({ isHealthy: false, lastHealthCheckAt: Date.now() }),
  setFlushing: (isFlushing) => set({ isFlushing }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setSyncPaused: (syncPaused) => set({ syncPaused }),
}));
