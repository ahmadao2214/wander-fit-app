import { Stack } from 'expo-router'

/**
 * Workout Stack Layout (Nested inside Tabs)
 * 
 * This follows Expo Router's recommended pattern for stacks inside tabs.
 * See: https://docs.expo.dev/router/basics/common-navigation-patterns/#stacks-inside-tabs-nested-navigators
 * 
 * The workout detail and execution screens live here, separate from the tab bar.
 */
export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="[id]" 
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="execute/[id]" 
        options={{
          animation: 'slide_from_bottom',
          gestureEnabled: false, // Prevent accidental swipe-to-dismiss
        }}
      />
    </Stack>
  )
}

