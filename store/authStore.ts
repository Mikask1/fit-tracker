import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;
  setAuth: (userId: string, username: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      username: null,
      isAuthenticated: false,
      setAuth: (userId, username) =>
        set({
          userId,
          username,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          userId: null,
          username: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'fittrack-auth',
    }
  )
);
