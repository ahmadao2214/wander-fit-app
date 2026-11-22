import { Stack } from 'expo-router'
import { FlowErrorBoundary } from '../../components/FlowErrorBoundary'

/**
 * Reassessment Flow Layout
 *
 * 4-screen flow after completing a phase:
 * 1. Celebration — congrats + completion stats
 * 2. Self-Assessment — difficulty, energy, notes
 * 3. Maxes — update 1RM values
 * 4. Results — summary + confirm to advance
 */
export default function ReassessmentLayout() {
  return (
    <FlowErrorBoundary
      flowName="reassessment"
      fallbackRoute="/(athlete)"
      errorMessage="Something went wrong during your phase check-in. Your training history is safe."
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="celebration" />
        <Stack.Screen name="self-assessment" />
        <Stack.Screen name="maxes" />
        <Stack.Screen name="results" />
      </Stack>
    </FlowErrorBoundary>
  )
}
