import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { color: '#ffffff' },
          contentStyle: { backgroundColor: '#000000' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'SwolleWatch' }} />
        <Stack.Screen
          name="builder"
          options={{ title: 'Builder', presentation: 'modal' }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{ title: 'Active Workout', headerShown: false }}
        />
      </Stack>
    </>
  );
}
