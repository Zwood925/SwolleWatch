import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  playCountdownBeep,
  unloadBeepSound,
} from '../../src/services/audio';
import {
  formatClock,
  getRemainingWorkoutSeconds,
  getTotalWorkoutSeconds,
  useWorkoutStore,
} from '../../src/store/useWorkoutStore';

const KEEP_AWAKE_TAG = 'swollewatch-active-workout';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = typeof id === 'string' ? id : id?.[0];

  const workouts = useWorkoutStore((state) => state.workouts);
  const activeSession = useWorkoutStore((state) => state.activeSession);
  const prepareSession = useWorkoutStore((state) => state.prepareSession);
  const playSession = useWorkoutStore((state) => state.playSession);
  const pauseSession = useWorkoutStore((state) => state.pauseSession);
  const tickSession = useWorkoutStore((state) => state.tickSession);
  const skipSegment = useWorkoutStore((state) => state.skipSegment);
  const previousSegment = useWorkoutStore((state) => state.previousSegment);
  const exitSession = useWorkoutStore((state) => state.exitSession);
  const resetSession = useWorkoutStore((state) => state.resetSession);

  const workout = workouts.find((item) => item.id === workoutId);
  const [exitVisible, setExitVisible] = useState(false);

  const previousSegmentIndex = useRef<number | null>(null);
  const beepFiredForSecond = useRef<number | null>(null);
  const completionHapticFired = useRef(false);

  useEffect(() => {
    if (!workoutId || !workout) {
      return;
    }
    prepareSession(workoutId);
  }, [workoutId, workout?.id, prepareSession]);

  useEffect(() => {
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
      void unloadBeepSound();
    };
  }, []);

  const isRunning = activeSession?.status === 'running';
  const isFinished = activeSession?.status === 'finished';

  useEffect(() => {
    if (isRunning) {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      return;
    }
    void deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      tickSession();
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, tickSession]);

  useEffect(() => {
    if (!activeSession || activeSession.workoutId !== workoutId) {
      return;
    }

    if (
      previousSegmentIndex.current !== null &&
      previousSegmentIndex.current !== activeSession.currentSegmentIndex &&
      activeSession.status !== 'finished'
    ) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      beepFiredForSecond.current = null;
    }

    previousSegmentIndex.current = activeSession.currentSegmentIndex;
  }, [activeSession?.currentSegmentIndex, activeSession?.status, activeSession?.workoutId, workoutId]);

  useEffect(() => {
    if (!activeSession || activeSession.workoutId !== workoutId) {
      return;
    }

    if (
      activeSession.status === 'running' &&
      activeSession.segmentRemainingSeconds === 3 &&
      beepFiredForSecond.current !== activeSession.currentSegmentIndex
    ) {
      beepFiredForSecond.current = activeSession.currentSegmentIndex;
      void playCountdownBeep();
    }
  }, [
    activeSession?.segmentRemainingSeconds,
    activeSession?.status,
    activeSession?.currentSegmentIndex,
    activeSession?.workoutId,
    workoutId,
  ]);

  useEffect(() => {
    if (!isFinished || completionHapticFired.current) {
      return;
    }
    completionHapticFired.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [isFinished]);

  if (!workoutId || !workout) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-6">
        <Text className="text-white text-xl font-bold mb-2">Workout not found</Text>
        <Text className="text-neutral-400 text-center mb-6">
          This workout may have been deleted. Pick another from your list.
        </Text>
        <Pressable
          onPress={() => router.replace('/')}
          className="bg-orange-500 rounded-lg px-6 py-3"
        >
          <Text className="text-white font-semibold">Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!activeSession || activeSession.workoutId !== workout.id) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Text className="text-neutral-400">Preparing workout…</Text>
      </SafeAreaView>
    );
  }

  const segment = workout.segments[activeSession.currentSegmentIndex];
  const nextSegment = workout.segments[activeSession.currentSegmentIndex + 1];
  const segmentRemaining = activeSession.segmentRemainingSeconds;
  const workoutRemaining = getRemainingWorkoutSeconds(workout, activeSession);
  const workoutTotal = getTotalWorkoutSeconds(workout);

  const confirmExit = () => {
    setExitVisible(false);
    pauseSession();
    exitSession();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-5 pt-2 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-1 pr-3">
            <Text className="text-neutral-400 text-xs uppercase tracking-widest">
              {workout.name}
            </Text>
            <Text className="text-white text-lg font-semibold" numberOfLines={1}>
              {isFinished ? 'Workout Complete' : segment?.name ?? 'Segment'}
            </Text>
          </View>
          <Pressable
            onPress={() => setExitVisible(true)}
            className="border border-neutral-700 rounded-lg px-3 py-2"
          >
            <Text className="text-neutral-300 text-sm">Exit</Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          <Text
            className={`text-[84px] font-bold tabular-nums leading-none ${
              segment?.type === 'Rest' ? 'text-sky-400' : 'text-orange-400'
            }`}
          >
            {formatClock(segmentRemaining)}
          </Text>
          <Text className="text-neutral-400 mt-3 text-sm">
            Segment remaining
          </Text>

          <View className="mt-8 w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-neutral-400 text-sm">Workout remaining</Text>
              <Text className="text-white text-base font-semibold tabular-nums">
                {formatClock(workoutRemaining)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-neutral-400 text-sm">Total workout time</Text>
              <Text className="text-white text-base font-semibold tabular-nums">
                {formatClock(workoutTotal)}
              </Text>
            </View>
          </View>
        </View>

        {!isFinished && segment ? (
          <View className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white font-semibold text-base">
                {segment.name}
              </Text>
              <Text
                className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                  segment.type === 'Work'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-sky-500/20 text-sky-400'
                }`}
              >
                {segment.type}
              </Text>
            </View>

            <DetailRow label="Target HR Zone" value={segment.targetHrZone || '—'} />
            <DetailRow
              label="Target Cadence"
              value={segment.targetCadence || '—'}
            />
            <DetailRow label="Notes" value={segment.notes || '—'} />
          </View>
        ) : null}

        {!isFinished && nextSegment ? (
          <View className="rounded-xl bg-neutral-950 border border-orange-500/40 px-4 py-3 mb-4">
            <Text className="text-orange-400 text-xs font-semibold uppercase mb-1">
              Up Next
            </Text>
            <Text className="text-white font-medium">
              {nextSegment.name} · {formatClock(nextSegment.duration)} ·{' '}
              {nextSegment.type}
            </Text>
          </View>
        ) : null}

        {isFinished ? (
          <View className="mb-4 rounded-2xl bg-neutral-900 border border-neutral-800 p-5 items-center">
            <Text className="text-white text-xl font-bold mb-1">Nice work</Text>
            <Text className="text-neutral-400 text-center mb-4">
              You finished {workout.name}.
            </Text>
            <Pressable
              onPress={() => {
                completionHapticFired.current = false;
                resetSession();
              }}
              className="bg-orange-500 rounded-lg px-5 py-3 w-full items-center mb-2"
            >
              <Text className="text-white font-bold">Restart Workout</Text>
            </Pressable>
            <Pressable
              onPress={confirmExit}
              className="rounded-lg px-5 py-3 w-full items-center border border-neutral-700"
            >
              <Text className="text-neutral-200 font-semibold">Back to Home</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row gap-2 mb-2">
            <ControlButton
              label="Prev"
              onPress={previousSegment}
              disabled={activeSession.currentSegmentIndex === 0}
            />
            <ControlButton
              label={isRunning ? 'Pause' : 'Play'}
              onPress={() => (isRunning ? pauseSession() : playSession())}
              primary
            />
            <ControlButton label="Skip" onPress={skipSegment} />
          </View>
        )}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={exitVisible}
        onRequestClose={() => setExitVisible(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View className="w-full rounded-2xl bg-neutral-900 border border-neutral-700 p-5">
            <Text className="text-white text-lg font-bold mb-2">
              Exit workout?
            </Text>
            <Text className="text-neutral-400 mb-5">
              Progress for this session will be cleared.
            </Text>
            <Pressable
              onPress={confirmExit}
              className="bg-red-500 rounded-lg py-3 items-center mb-2"
            >
              <Text className="text-white font-bold">Exit Workout</Text>
            </Pressable>
            <Pressable
              onPress={() => setExitVisible(false)}
              className="rounded-lg py-3 items-center border border-neutral-700"
            >
              <Text className="text-neutral-200 font-semibold">Keep Going</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="mb-2">
      <Text className="text-neutral-500 text-xs mb-0.5">{label}</Text>
      <Text className="text-neutral-100 text-sm">{value}</Text>
    </View>
  );
}

interface ControlButtonProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}

function ControlButton({
  label,
  onPress,
  primary = false,
  disabled = false,
}: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 rounded-xl py-4 items-center ${
        primary ? 'bg-orange-500' : 'bg-neutral-800 border border-neutral-700'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Text
        className={`font-bold ${primary ? 'text-white' : 'text-neutral-100'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
