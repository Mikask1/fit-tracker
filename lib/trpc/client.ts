import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

// Offline mutation queue
const mutationQueue: Array<{ url: string; options: RequestInit }> = [];

// Check online status
const isOnline = () => typeof window !== 'undefined' && window.navigator.onLine;

// Process queued mutations when back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Back online, processing queued mutations...');
    while (mutationQueue.length > 0) {
      const queued = mutationQueue.shift();
      if (queued) {
        try {
          await fetch(queued.url, queued.options);
        } catch (error) {
          console.error('Failed to sync queued mutation:', error);
          mutationQueue.unshift(queued); // Re-queue on failure
          break;
        }
      }
    }
  });
}

export function getTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
        fetch: async (url, options) => {
          // Queue mutations when offline
          if (!isOnline() && options?.method === 'POST') {
            console.log('Offline: queuing mutation for later sync');
            mutationQueue.push({ url: url.toString(), options });
            throw new Error('OFFLINE_QUEUED');
          }
          return fetch(url, options);
        },
        // Cookies are automatically sent by the browser
        // No need to pass userId in headers anymore
      }),
    ],
  });
}
