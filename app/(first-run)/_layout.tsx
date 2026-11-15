import { Redirect, Stack } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { FlowErrorBoundary } from '../../components/FlowErrorBoundary'

/**
 * The First Run: five intake steps with no account, the reveal, then
 * "Save your plan". Public. A signed-in athlete with a program never sees it.
 */
export default function FirstRunLayout() {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (!isLoading && isAuthenticated && user?.intakeCompletedAt) {
    return <Redirect href="/(athlete)" />
  }

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
