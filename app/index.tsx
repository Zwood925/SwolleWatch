import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-white text-3xl font-bold mb-2">SwolleWatch</Text>
        <Text className="text-neutral-400 text-center mb-8">
          Interval timer ready. Build a workout to get started.
        </Text>
        <Link href="/builder" asChild>
          <Pressable className="bg-orange-500 rounded-lg px-6 py-4">
            <Text className="text-white font-bold">Open Workout Builder</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}
