import { Stack } from 'expo-router'
import { IntakeOnlyRoute } from '../../components/AuthGuard'

/**
 * Intake Flow Layout
 *
 * Multi-step onboarding for new athletes (7 screens):
 * 1. Sport selection (determines GPP category)
 * 2. Age group (Youth/Junior/Adult divisions)
 * 3. Years of experience (Trophy Case UI)
 * 4. Training days (Practice Schedule Board)
 * 5. Season timeline (Flight-to-Season Picker)
 * 6. Maxes (1RM entry for core lifts)
 * 7. Results confirmation
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
        <Stack.Screen name="age-group" />
        <Stack.Screen name="experience-years" />
        <Stack.Screen name="training-days" />
        <Stack.Screen name="season-timeline" />
        <Stack.Screen name="maxes" />
        <Stack.Screen name="results" />
      </Stack>
    </IntakeOnlyRoute>
  )
}

