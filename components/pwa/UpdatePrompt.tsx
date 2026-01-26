'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function UpdatePrompt() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      const waitingServiceWorker = registration.waiting;

      if (waitingServiceWorker) {
        toast('New version available!', {
          description: 'Click to update and refresh',
          action: {
            label: 'Update',
            onClick: () => {
              waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            },
          },
          duration: Infinity,
        });

        waitingServiceWorker.addEventListener('statechange', (event) => {
          const sw = event.target as ServiceWorker;
          if (sw.state === 'activated') {
            window.location.reload();
          }
        });
      }
    };

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              handleUpdate(registration);
            }
          });
        }
      });
    });

    // Check for updates every hour
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update();
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
