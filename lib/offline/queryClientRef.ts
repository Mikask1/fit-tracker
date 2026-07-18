import type { QueryClient } from '@tanstack/react-query';

// The offline link and flush engine need the app QueryClient for optimistic
// cache writes, but importing it from app/providers would be circular.
// Providers registers it here at module init.
let queryClientRef: QueryClient | null = null;

export function setQueryClientRef(client: QueryClient) {
  queryClientRef = client;
}

export function getQueryClientRef(): QueryClient | null {
  return queryClientRef;
}
