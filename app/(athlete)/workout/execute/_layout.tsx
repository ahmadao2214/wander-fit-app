import { Stack } from 'expo-router'

/**
 * Execute Workout Layout
 *
 * Full-screen modal presentation for the workout execution screen.
 * Prevents accidental swipe-to-dismiss during active workouts.
 */
export default function ExecuteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          gestureEnabled: false, // Prevent accidental swipe-to-dismiss during workout
        }}
      />
    </Stack>
  )
}

