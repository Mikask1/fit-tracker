'use client';

import { ReactNode } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import { LoadingState } from './LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useRequireAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  return <>{children}</>;
}
