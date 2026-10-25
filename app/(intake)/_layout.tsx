import { Stack } from 'expo-router'
import { IntakeOnlyRoute } from '../../components/AuthGuard'
import { FlowErrorBoundary } from '../../components/FlowErrorBoundary'

/**
 * Intake Flow Layout
 *
 * Multi-step onboarding for new athletes (8 screens):
 * 1. Sport selection (determines GPP category)
 * 2. Age group (Youth/Junior/Adult divisions)
 * 3. Years of experience (Trophy Case UI)
 * 4. Training days (Practice Schedule Board)
 * 5. Equipment (Gym vs Home)
 * 6. Season timeline (Flight-to-Season Picker)
 * 7. Maxes (1RM entry for core lifts)
 * 8. Results confirmation
 */
export default function IntakeLayout() {
  return (
    <FlowErrorBoundary
      fallbackRoute="/(intake)/sport"
      errorMessage="Something went wrong during setup. Let's try again."
    >
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
          <Stack.Screen name="equipment" />
          <Stack.Screen name="season-timeline" />
          <Stack.Screen name="maxes" />
          <Stack.Screen name="results" />
        </Stack>
      </IntakeOnlyRoute>
    </FlowErrorBoundary>
  )
}

