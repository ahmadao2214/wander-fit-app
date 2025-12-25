import { Stack } from 'expo-router'

/**
 * Execute Workout Layout
 * 
 * Simple passthrough layout for the workout execution screen.
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
          animation: 'slide_from_bottom',
          gestureEnabled: false, // Prevent accidental swipe-to-dismiss during workout
        }}
      />
    </Stack>
  )
}

