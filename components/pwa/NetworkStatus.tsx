'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff, RefreshCw, CloudUpload, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConnectionStore } from '@/store/connectionStore';
import { useOutboxStore } from '@/store/outboxStore';
import { kickFlush } from '@/lib/offline/flush';

const noopSubscribe = () => () => {};

export function NetworkStatus() {
  // Avoid hydration mismatch: connection/outbox state is client-only, so
  // render nothing during SSR and the first client render.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const isHealthy = useConnectionStore((s) => s.isHealthy);
  const isFlushing = useConnectionStore((s) => s.isFlushing);
  const syncPaused = useConnectionStore((s) => s.syncPaused);
  const entries = useOutboxStore((s) => s.entries);

  if (!mounted) return null;

  const pending = entries.filter((e) => e.status !== 'failed');
  const failed = entries.filter((e) => e.status === 'failed');

  if (isHealthy && !isFlushing && failed.length === 0 && syncPaused === null) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 space-y-2">
      {!isHealthy && (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
          <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            {pending.length > 0
              ? `You're offline — ${pending.length} change${pending.length === 1 ? '' : 's'} saved and will sync automatically.`
              : "You're offline. Your data is available and changes will be saved."}
          </AlertDescription>
        </Alert>
      )}

      {isFlushing && (
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <CloudUpload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Syncing {pending.length > 0 ? `${pending.length} change${pending.length === 1 ? '' : 's'}` : 'changes'}…
          </AlertDescription>
        </Alert>
      )}

      {syncPaused === 'unauthorized' && (
        <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Session expired — log in again to sync {pending.length} saved change{pending.length === 1 ? '' : 's'}.
          </AlertDescription>
        </Alert>
      )}

      {failed.map((entry) => (
        <Alert
          key={entry.id}
          className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <span className="block">
              A change could not sync ({entry.path}): {entry.lastError ?? 'Unknown error'}
            </span>
            <span className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => {
                  void useOutboxStore
                    .getState()
                    .retryFailed(entry.id)
                    .then(() => kickFlush());
                }}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => void useOutboxStore.getState().discardFailed(entry.id)}
              >
                Discard
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
