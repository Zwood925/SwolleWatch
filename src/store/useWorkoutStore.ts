import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Workout } from '../types/workout';

export interface WorkoutStore {
  workouts: Workout[];
  activeWorkoutId: string | null;
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  setActiveWorkout: (id: string) => void;
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      workouts: [],
      activeWorkoutId: null,

      addWorkout: (workout) =>
        set((state) => ({
          workouts: [...state.workouts, workout],
        })),

      updateWorkout: (id, workout) =>
        set((state) => ({
          workouts: state.workouts.map((w) => (w.id === id ? workout : w)),
        })),

      deleteWorkout: (id) =>
        set((state) => ({
          workouts: state.workouts.filter((w) => w.id !== id),
          activeWorkoutId:
            state.activeWorkoutId === id ? null : state.activeWorkoutId,
        })),

      setActiveWorkout: (id) =>
        set({
          activeWorkoutId: id,
        }),
    }),
    {
      name: 'swollewatch-workouts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
