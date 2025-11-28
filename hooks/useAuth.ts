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

  // Sync server auth status with client store
  useEffect(() => {
    if (user) {
      setAuth(user.userId, user.username);
    } else if (error) {
      clearAuth();
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
