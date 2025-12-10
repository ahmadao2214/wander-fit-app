import { Redirect } from 'expo-router'
import { YStack, Text, Spinner } from 'tamagui'
import { useAuth } from '../hooks/useAuth'

/**
 * Root Index Page
 * 
 * Handles initial routing based on auth state:
 * 1. Not authenticated → Sign in
 * 2. Authenticated but no Convex user → Sign up (create user)
 * 3. Authenticated but no intake → Intake flow
 * 4. Authenticated with intake → Athlete dashboard
 */
export default function IndexPage() {
  const { isAuthenticated, isLoading, user, needsSetup, needsIntake } = useAuth()

  // Show loading while determining where to redirect
  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading...</Text>
        <Text fontSize="$2" color="$gray9">Checking authentication...</Text>
      </YStack>
    )
  }

  // Not authenticated → go to sign in
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />
  }

  // Authenticated with Clerk but no Convex user → complete sign up
  if (needsSetup) {
    return <Redirect href="/(auth)/sign-up" />
  }

  // Authenticated but needs intake → go to intake flow
  if (needsIntake || !user?.intakeCompletedAt) {
    return <Redirect href="/(intake)/sport" />
  }

  // Fully set up → go to athlete dashboard
  return <Redirect href="/(athlete)" />
}
