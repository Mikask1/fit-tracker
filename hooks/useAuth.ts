'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const router = useRouter();
  const { userId, username, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  // Check authentication status on mount
  const { data: user, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Sync server auth status with client store.
  // Only clear auth when the server explicitly rejects the session — a network
  // failure (offline / flaky connection) must not log the user out, otherwise
  // the app is unusable exactly when the offline cache should carry it.
  useEffect(() => {
    if (user) {
      setAuth(user.userId, user.username);
    } else if (error) {
      const code = error.data?.code;
      if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') {
        clearAuth();
      }
    }
  }, [user, error, setAuth, clearAuth]);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      clearAuth();
      router.push('/login');
      router.refresh();
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user: isAuthenticated && userId && username ? { userId, username } : null,
    isLoading,
    isAuthenticated,
    logout,
  };
}

export function useRequireAuth() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isLoading };
}
