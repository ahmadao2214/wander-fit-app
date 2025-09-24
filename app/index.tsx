import { Redirect } from 'expo-router'
import { YStack, Text, Spinner } from 'tamagui'
import { useAuth } from '../hooks/useAuth'

export default function IndexPage() {
  const { isAuthenticated, isLoading, role, needsSetup } = useAuth()

  // Show loading while determining where to redirect
  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Spinner size="large" />
        <Text>Loading...</Text>
        <Text fontSize="$2" opacity={0.7}>Checking authentication...</Text>
      </YStack>
    )
  }

  // Not authenticated, redirect to sign in
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />
  }

  // Authenticated with Clerk but no Convex user, redirect to setup
  if (needsSetup) {
    return <Redirect href="/(auth)/sign-up" />
  }

  // Redirect based on role
  if (role === 'trainer') {
    return <Redirect href="/(trainer)" />
  }

  if (role === 'client') {
    return <Redirect href="/(client)" />
  }

  // Fallback - should not happen
  return <Redirect href="/(auth)/sign-in" />
}
