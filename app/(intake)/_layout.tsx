import { Stack } from 'expo-router'
import { IntakeOnlyRoute } from '../../components/AuthGuard'

/**
 * Intake Flow Layout
 * 
 * Multi-step onboarding for new athletes:
 * 1. Sport selection (determines GPP category)
 * 2. Experience & training days (determines skill level)
 * 3. Results confirmation
 */
export default function IntakeLayout() {
  return (
    <IntakeOnlyRoute>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="sport" />
        <Stack.Screen name="experience" />
        <Stack.Screen name="results" />
      </Stack>
    </IntakeOnlyRoute>
  )
}

