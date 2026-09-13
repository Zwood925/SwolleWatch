import { FlatList, Pressable, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatClock,
  getTotalWorkoutSeconds,
  useWorkoutStore,
} from '../src/store/useWorkoutStore';
import type { Workout } from '../src/types/workout';

export default function HomeScreen() {
  const router = useRouter();
  const workouts = useWorkoutStore((state) => state.workouts);
  const setActiveWorkout = useWorkoutStore((state) => state.setActiveWorkout);

  const openBuilder = (workoutId?: string) => {
    setActiveWorkout(workoutId ?? null);
    router.push('/builder');
  };

  const openWorkout = (workoutId: string) => {
    router.push(`/workout/${workoutId}` as Href);
  };

  const renderWorkout = ({ item }: { item: Workout }) => {
    const total = getTotalWorkoutSeconds(item);
    return (
      <View className="bg-neutral-900 border border-neutral-800 rounded-2xl mb-3 overflow-hidden">
        <Pressable onPress={() => openWorkout(item.id)} className="p-4">
          <Text className="text-white text-lg font-semibold mb-1">
            {item.name}
          </Text>
          <Text className="text-neutral-400 text-sm">
            {item.segments.length} segment
            {item.segments.length === 1 ? '' : 's'} · {formatClock(total)}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openBuilder(item.id)}
          className="border-t border-neutral-800 px-4 py-3"
        >
          <Text className="text-orange-400 text-sm font-medium">Edit</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-5 pt-2">
        <Text className="text-white text-3xl font-bold mb-1">SwolleWatch</Text>
        <Text className="text-neutral-400 mb-6">
          Tap a workout to start. Use Edit to change segments.
        </Text>

        {workouts.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-neutral-400 text-center mb-6">
              No saved workouts yet. Create your first interval session.
            </Text>
            <Pressable
              onPress={() => openBuilder()}
              className="bg-orange-500 rounded-lg px-6 py-4"
            >
              <Text className="text-white font-bold">Create Workout</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <FlatList
              data={workouts}
              keyExtractor={(item) => item.id}
              renderItem={renderWorkout}
              contentContainerClassName="pb-28"
              showsVerticalScrollIndicator={false}
            />
            <View className="absolute left-5 right-5 bottom-6">
              <Pressable
                onPress={() => openBuilder()}
                className="bg-orange-500 rounded-lg py-4 items-center"
              >
                <Text className="text-white font-bold">+ New Workout</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
