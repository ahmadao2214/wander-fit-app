import { Stack } from 'expo-router'
import { FlowErrorBoundary } from '../../components/FlowErrorBoundary'

/**
 * The First Run: five intake steps with no account, the reveal, then
 * "Save your plan". Public. The root index keeps signed-in athletes with a
 * program out; the layout itself doesn't redirect, because the program is
 * saved from inside the reveal and the athlete moves on to /ready first.
 */
export default function FirstRunLayout() {
  return (
    <FlowErrorBoundary
      fallbackRoute="/(first-run)"
      errorMessage="Something went wrong building your plan. Your answers are saved, so let's pick up again."
    >
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sport" />
        <Stack.Screen name="season" />
        <Stack.Screen name="days" />
        <Stack.Screen name="about" />
        <Stack.Screen name="reveal" />
      </Stack>
    </FlowErrorBoundary>
  )
}
