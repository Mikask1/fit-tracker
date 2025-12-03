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
  isCompleted?: boolean;
  completedAt?: number;
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
  markExerciseCompleted: (sessionId: string, logIndex: number, isCompleted: boolean) => void;
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

      markExerciseCompleted: (sessionId, logIndex, isCompleted) => {
        set((state) => {
          const draft = state.drafts[sessionId];
          if (!draft || !draft.logs[logIndex]) {
            return state;
          }

          const updatedLogs = [...draft.logs];
          updatedLogs[logIndex] = {
            ...updatedLogs[logIndex],
            isCompleted,
            completedAt: isCompleted ? Date.now() : undefined,
          };

          return {
            drafts: {
              ...state.drafts,
              [sessionId]: {
                ...draft,
                logs: updatedLogs,
                timestamp: Date.now(),
              },
            },
          };
        });
      },
    }),
    {
      name: 'fittrack-session-drafts',
    }
  )
);
