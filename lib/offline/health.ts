import { useConnectionStore } from '@/store/connectionStore';

const PROBE_TIMEOUT_MS = 4000;

/**
 * Probe the server. "Healthy" means a 2xx from /api/health within 4s —
 * anything slower is treated as offline so the app buffers instead of hanging.
 * Updates connectionStore as a side effect.
 */
export async function checkHealth(): Promise<boolean> {
  const store = useConnectionStore.getState();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    store.markUnhealthy();
    return false;
  }
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (res.ok) {
      store.markHealthy();
      return true;
    }
    store.markUnhealthy();
    return false;
  } catch {
    store.markUnhealthy();
    return false;
  }
}
