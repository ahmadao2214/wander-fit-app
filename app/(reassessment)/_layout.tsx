import { Stack } from 'expo-router'
import { ReassessmentOnlyRoute } from '../../components/AuthGuard'

/**
 * Reassessment Flow Layout
 *
 * Multi-step check-in flow after completing a training phase:
 * 1. Celebration - Celebrate phase completion
 * 2. Self-Assessment - How did the phase feel?
 * 3. Maxes - Update 1RM values (optional)
 * 4. Results - Summary and skill level changes
 */
export default function ReassessmentLayout() {
  return (
    <ReassessmentOnlyRoute>
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
    </ReassessmentOnlyRoute>
  )
}
