import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  ActiveSession,
  SessionStatus,
  Workout,
} from '../types/workout';

export interface WorkoutStore {
  workouts: Workout[];
  activeWorkoutId: string | null;
  activeSession: ActiveSession | null;

  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  setActiveWorkout: (id: string | null) => void;

  prepareSession: (workoutId: string) => void;
  playSession: () => void;
  pauseSession: () => void;
  tickSession: () => void;
  skipSegment: () => void;
  previousSegment: () => void;
  exitSession: () => void;
  resetSession: () => void;
}

function getWorkout(
  workouts: Workout[],
  workoutId: string
): Workout | undefined {
  return workouts.find((workout) => workout.id === workoutId);
}

function createSession(
  workout: Workout,
  status: SessionStatus = 'paused'
): ActiveSession {
  const first = workout.segments[0];
  return {
    workoutId: workout.id,
    currentSegmentIndex: 0,
    segmentRemainingSeconds: first?.duration ?? 0,
    status: workout.segments.length === 0 ? 'finished' : status,
  };
}

function advanceToSegment(
  workout: Workout,
  index: number,
  status: SessionStatus
): ActiveSession {
  if (index < 0) {
    return createSession(workout, status);
  }

  if (index >= workout.segments.length) {
    const lastIndex = Math.max(workout.segments.length - 1, 0);
    return {
      workoutId: workout.id,
      currentSegmentIndex: lastIndex,
      segmentRemainingSeconds: 0,
      status: 'finished',
    };
  }

  return {
    workoutId: workout.id,
    currentSegmentIndex: index,
    segmentRemainingSeconds: workout.segments[index].duration,
    status,
  };
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      workouts: [],
      activeWorkoutId: null,
      activeSession: null,

      addWorkout: (workout) =>
        set((state) => ({
          workouts: [...state.workouts, workout],
        })),

      updateWorkout: (id, workout) =>
        set((state) => ({
          workouts: state.workouts.map((w) => (w.id === id ? workout : w)),
        })),

      deleteWorkout: (id) =>
        set((state) => {
          const deletingActive = state.activeSession?.workoutId === id;
          return {
            workouts: state.workouts.filter((w) => w.id !== id),
            activeWorkoutId:
              state.activeWorkoutId === id ? null : state.activeWorkoutId,
            activeSession: deletingActive ? null : state.activeSession,
          };
        }),

      setActiveWorkout: (id) =>
        set({
          activeWorkoutId: id,
        }),

      prepareSession: (workoutId) => {
        const workout = getWorkout(get().workouts, workoutId);
        if (!workout) {
          set({ activeSession: null, activeWorkoutId: null });
          return;
        }

        const existing = get().activeSession;
        if (
          existing &&
          existing.workoutId === workoutId &&
          existing.status !== 'finished'
        ) {
          set({
            activeWorkoutId: workoutId,
            activeSession: {
              ...existing,
              status:
                existing.status === 'running' ? 'paused' : existing.status,
            },
          });
          return;
        }

        set({
          activeWorkoutId: workoutId,
          activeSession: createSession(workout, 'paused'),
        });
      },

      playSession: () =>
        set((state) => {
          if (!state.activeSession || state.activeSession.status === 'finished') {
            return state;
          }
          return {
            activeSession: {
              ...state.activeSession,
              status: 'running',
            },
          };
        }),

      pauseSession: () =>
        set((state) => {
          if (!state.activeSession || state.activeSession.status !== 'running') {
            return state;
          }
          return {
            activeSession: {
              ...state.activeSession,
              status: 'paused',
            },
          };
        }),

      tickSession: () => {
        const { activeSession, workouts } = get();
        if (!activeSession || activeSession.status !== 'running') {
          return;
        }

        const workout = getWorkout(workouts, activeSession.workoutId);
        if (!workout || workout.segments.length === 0) {
          set({ activeSession: null });
          return;
        }

        const nextRemaining = activeSession.segmentRemainingSeconds - 1;
        if (nextRemaining > 0) {
          set({
            activeSession: {
              ...activeSession,
              segmentRemainingSeconds: nextRemaining,
            },
          });
          return;
        }

        const nextIndex = activeSession.currentSegmentIndex + 1;
        set({
          activeSession: advanceToSegment(workout, nextIndex, 'running'),
        });
      },

      skipSegment: () => {
        const { activeSession, workouts } = get();
        if (!activeSession || activeSession.status === 'finished') {
          return;
        }

        const workout = getWorkout(workouts, activeSession.workoutId);
        if (!workout) {
          return;
        }

        const nextIndex = activeSession.currentSegmentIndex + 1;
        set({
          activeSession: advanceToSegment(
            workout,
            nextIndex,
            activeSession.status === 'running' ? 'running' : 'paused'
          ),
        });
      },

      previousSegment: () => {
        const { activeSession, workouts } = get();
        if (!activeSession || activeSession.status === 'finished') {
          return;
        }

        const workout = getWorkout(workouts, activeSession.workoutId);
        if (!workout) {
          return;
        }

        const prevIndex = Math.max(0, activeSession.currentSegmentIndex - 1);
        set({
          activeSession: advanceToSegment(
            workout,
            prevIndex,
            activeSession.status === 'running' ? 'running' : 'paused'
          ),
        });
      },

      exitSession: () =>
        set({
          activeSession: null,
        }),

      resetSession: () => {
        const { activeSession, workouts } = get();
        if (!activeSession) {
          return;
        }
        const workout = getWorkout(workouts, activeSession.workoutId);
        if (!workout) {
          set({ activeSession: null });
          return;
        }
        set({
          activeSession: createSession(workout, 'paused'),
        });
      },
    }),
    {
      name: 'swollewatch-workouts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        workouts: state.workouts,
        activeWorkoutId: state.activeWorkoutId,
        activeSession: state.activeSession,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.activeSession?.status === 'running') {
          state.activeSession.status = 'paused';
        }
      },
    }
  )
);

export function getTotalWorkoutSeconds(workout: Workout): number {
  return workout.segments.reduce((sum, segment) => sum + segment.duration, 0);
}

export function getRemainingWorkoutSeconds(
  workout: Workout,
  session: ActiveSession
): number {
  if (session.status === 'finished') {
    return 0;
  }

  const future = workout.segments
    .slice(session.currentSegmentIndex + 1)
    .reduce((sum, segment) => sum + segment.duration, 0);

  return session.segmentRemainingSeconds + future;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
