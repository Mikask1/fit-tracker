import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LogSet {
  weight: number;
  reps: number;
}

export interface LogEntry {
  movementId: string;
  movementName: string;
  sets: LogSet[];
}

export interface SessionDraft {
  sessionId: string;
  logs: LogEntry[];
  timestamp: number;
}

interface SessionDraftState {
  drafts: Record<string, SessionDraft>;
  saveDraft: (sessionId: string, logs: LogEntry[]) => void;
  getDraft: (sessionId: string) => SessionDraft | undefined;
  clearDraft: (sessionId: string) => void;
  clearAllDrafts: () => void;
}

export const useSessionDraftStore = create<SessionDraftState>()(
  persist(
    (set, get) => ({
      drafts: {},

      saveDraft: (sessionId, logs) => {
        set((state) => ({
          drafts: {
            ...state.drafts,
            [sessionId]: {
              sessionId,
              logs,
              timestamp: Date.now(),
            },
          },
        }));
      },

      getDraft: (sessionId) => {
        return get().drafts[sessionId];
      },

      clearDraft: (sessionId) => {
        set((state) => {
          const { [sessionId]: _, ...remainingDrafts } = state.drafts;
          return { drafts: remainingDrafts };
        });
      },

      clearAllDrafts: () => {
        set({ drafts: {} });
      },
    }),
    {
      name: 'fittrack-session-drafts',
    }
  )
);
