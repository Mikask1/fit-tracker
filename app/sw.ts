import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkFirst,
  NetworkOnly,
  ExpirationPlugin,
} from "serwist";

// Declare SW types
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Initialize Serwist
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
  runtimeCaching: [
    // Connectivity probe - must NEVER be served from cache, or a dead
    // connection would look healthy to the offline sync engine
    {
      matcher: ({ url }) => url.pathname === "/api/health",
      handler: new NetworkOnly(),
    },
    // Google Fonts (gstatic.com) - CacheFirst
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
    // Google Fonts (googleapis.com) - StaleWhileRevalidate
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
          }),
        ],
      }),
    },
    // Static assets (images, SVG) - StaleWhileRevalidate
    // Match by request destination to catch all image requests regardless of URL pattern
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // JS and CSS assets - StaleWhileRevalidate
    {
      matcher: /\.(?:js|css)$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "static-js-css-assets",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
          }),
        ],
      }),
    },
    // Next.js data files - StaleWhileRevalidate
    {
      matcher: /\/_next\/data\/.+\/.+\.json$/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
      }),
    },
    // tRPC API calls - NetworkOnly. Data-layer offline caching lives in the
    // app's IndexedDB-persisted React Query cache; if the SW served stale
    // HTTP responses here, offline refetches would overwrite the optimistic
    // updates applied by the mutation outbox.
    {
      matcher: ({ request }) => request.url.includes("/api/trpc"),
      handler: new NetworkOnly(),
    },
    // HTML pages - NetworkFirst with offline fallback
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
        networkTimeoutSeconds: 10,
      }),
    },
    // Use default caching for everything else
    ...defaultCache,
  ],
});

// Start listening to fetch events
serwist.addEventListeners();

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      // Get all windows
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If a window is already open, focus it
      for (const client of allClients) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus();
        }
      }

      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/timer');
      }
    })()
  );
});
