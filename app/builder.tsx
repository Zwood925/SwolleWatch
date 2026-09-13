import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SegmentEditor } from '../src/components/SegmentEditor';
import { useWorkoutStore } from '../src/store/useWorkoutStore';
import type { Segment, Workout } from '../src/types/workout';

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultSegment(): Segment {
  return {
    id: createId(),
    name: 'Work',
    type: 'Work',
    duration: 60,
    countIn: 3,
    beepType: 'Tick',
    voiceCues: [],
    targetHrZone: '',
    targetCadence: '',
    notes: '',
  };
}

function createDraftWorkout(existing: Workout | undefined): Workout {
  if (existing) {
    return {
      ...existing,
      segments: existing.segments.map((segment) => ({
        ...segment,
        targetHrZone: segment.targetHrZone ?? '',
        targetCadence: segment.targetCadence ?? '',
        notes: segment.notes ?? '',
        voiceCues: segment.voiceCues.map((cue) => ({ ...cue })),
      })),
    };
  }

  return {
    id: createId(),
    name: 'New Workout',
    segments: [createDefaultSegment()],
  };
}

export default function BuilderScreen() {
  const router = useRouter();
  const workouts = useWorkoutStore((state) => state.workouts);
  const activeWorkoutId = useWorkoutStore((state) => state.activeWorkoutId);
  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const updateWorkout = useWorkoutStore((state) => state.updateWorkout);
  const setActiveWorkout = useWorkoutStore((state) => state.setActiveWorkout);

  const existingWorkout = useMemo(
    () => workouts.find((workout) => workout.id === activeWorkoutId),
    [workouts, activeWorkoutId]
  );

  const [draft, setDraft] = useState<Workout>(() =>
    createDraftWorkout(existingWorkout)
  );

  const isEditing = Boolean(existingWorkout);

  const updateSegment = (index: number, segment: Segment) => {
    setDraft((current) => ({
      ...current,
      segments: current.segments.map((item, i) =>
        i === index ? segment : item
      ),
    }));
  };

  const deleteSegment = (index: number) => {
    setDraft((current) => ({
      ...current,
      segments: current.segments.filter((_, i) => i !== index),
    }));
  };

  const addSegment = () => {
    setDraft((current) => ({
      ...current,
      segments: [...current.segments, createDefaultSegment()],
    }));
  };

  const saveWorkout = () => {
    const workout: Workout = {
      ...draft,
      name: draft.name.trim() || 'Untitled Workout',
    };

    if (isEditing) {
      updateWorkout(workout.id, workout);
    } else {
      addWorkout(workout);
      setActiveWorkout(workout.id);
    }

    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 bg-black"
          contentContainerClassName="px-4 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-white text-2xl font-bold mt-2 mb-4">
            Workout Builder
          </Text>

          <Text className="text-neutral-400 text-xs mb-1">Workout Name</Text>
          <TextInput
            className="bg-neutral-900 text-white rounded-xl px-4 py-3 mb-6 border border-neutral-800"
            placeholder="e.g. Heavy Bag Intervals"
            placeholderTextColor="#737373"
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
          />

          <Text className="text-white text-lg font-semibold mb-3">
            Segments
          </Text>

          {draft.segments.map((segment, index) => (
            <SegmentEditor
              key={segment.id}
              segment={segment}
              onUpdate={(updated) => updateSegment(index, updated)}
              onDelete={() => deleteSegment(index)}
            />
          ))}

          <Pressable
            onPress={addSegment}
            className="bg-orange-500 rounded-lg py-4 items-center mb-4"
          >
            <Text className="text-white text-base font-bold tracking-wide">
              + ADD SEGMENT
            </Text>
          </Pressable>

          <Pressable
            onPress={saveWorkout}
            className="bg-neutral-800 rounded-lg py-4 items-center border border-neutral-700"
          >
            <Text className="text-white text-base font-semibold">
              Save Workout
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
