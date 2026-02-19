import { create } from 'zustand';

interface FocusSession {
  id: number | null;
  taskId: number | null;
  startTime: number;
  plannedDuration: number; // seconds
  sessionType: string;
  isActive: boolean;
  isPaused: boolean;
}

interface FocusStore {
  // State
  activeSession: FocusSession | null;
  timerSeconds: number;
  elapsedSeconds: number;

  // Actions
  startSession: (taskId: number | null, duration: number, sessionType: string) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: (completed: boolean) => Promise<void>;
  tick: () => void;
  loadActiveSession: () => Promise<void>;
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  // Initial state
  activeSession: null,
  timerSeconds: 0,
  elapsedSeconds: 0,

  // Start a new focus session
  startSession: async (taskId, duration, sessionType = 'pomodoro') => {
    try {
      const energyScore = 70; // TODO: Get from energy store

      const result = await window.electron.startFocusSession({
        taskId,
        plannedDuration: duration,
        energyAtStart: energyScore,
        sessionType,
      });

      const session: FocusSession = {
        id: result.sessionId,
        taskId,
        startTime: Date.now(),
        plannedDuration: duration,
        sessionType,
        isActive: true,
        isPaused: false,
      };

      set({
        activeSession: session,
        timerSeconds: duration,
        elapsedSeconds: 0,
      });

      console.log('[FocusStore] Session started:', result.sessionId);
    } catch (error) {
      console.error('[FocusStore] Failed to start session:', error);
    }
  },

  // Pause the current session
  pauseSession: () => {
    set((state) => {
      if (!state.activeSession) return state;

      return {
        activeSession: {
          ...state.activeSession,
          isPaused: true,
        },
      };
    });
  },

  // Resume paused session
  resumeSession: () => {
    set((state) => {
      if (!state.activeSession) return state;

      return {
        activeSession: {
          ...state.activeSession,
          isPaused: false,
        },
      };
    });
  },

  // End the current session
  endSession: async (completed: boolean) => {
    const { activeSession } = get();

    if (!activeSession || !activeSession.id) return;

    try {
      const energyScore = 65; // TODO: Get from energy store

      await window.electron.endFocusSession(activeSession.id, {
        energyAtEnd: energyScore,
        completed,
      });

      set({
        activeSession: null,
        timerSeconds: 0,
        elapsedSeconds: 0,
      });

      console.log('[FocusStore] Session ended:', activeSession.id);
    } catch (error) {
      console.error('[FocusStore] Failed to end session:', error);
    }
  },

  // Tick function (called every second)
  tick: () => {
    set((state) => {
      if (!state.activeSession || state.activeSession.isPaused) {
        return state;
      }

      const elapsed = Math.floor((Date.now() - state.activeSession.startTime) / 1000);
      const remaining = Math.max(0, state.activeSession.plannedDuration - elapsed);

      // Auto-end when timer reaches 0
      if (remaining === 0 && state.timerSeconds > 0) {
        // Will be handled by component
      }

      return {
        timerSeconds: remaining,
        elapsedSeconds: elapsed,
      };
    });
  },

  // Load active session from backend (on app start)
  loadActiveSession: async () => {
    try {
      const session = await window.electron.getActiveFocusSession();

      if (session) {
        const startTime = new Date(session.start_time).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, session.planned_duration - elapsed);

        set({
          activeSession: {
            id: session.id,
            taskId: session.task_id,
            startTime,
            plannedDuration: session.planned_duration,
            sessionType: session.session_type,
            isActive: true,
            isPaused: false,
          },
          timerSeconds: remaining,
          elapsedSeconds: elapsed,
        });
      }
    } catch (error) {
      console.error('[FocusStore] Failed to load active session:', error);
    }
  },
}));
