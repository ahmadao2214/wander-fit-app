import { Redirect } from 'expo-router'
import { YStack, Text } from 'tamagui'
import { useAuth } from '../hooks/useAuth'

export default function IndexPage() {
  const { isAuthenticated, isLoading, role, needsSetup, user, clerkUser } = useAuth()

  // Debug logging to see what's happening  
  if (__DEV__) {
    console.log('Index Page State:', {
      isLoading,
      isAuthenticated,
      role,
      needsSetup,
      hasUser: !!user,
      hasClerkUser: !!clerkUser,
      clerkUserId: clerkUser?.id
    })
  }

  // Show loading while determining where to redirect
  if (isLoading) {
    console.log('Index: Showing loading state')
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Text>Loading...</Text>
        <Text fontSize="$2">Checking authentication...</Text>
      </YStack>
    )
  }

  // Not authenticated, redirect to sign in
  if (!isAuthenticated) {
    console.log('Index: Not authenticated, redirecting to sign-in')
    return <Redirect href="/(auth)/sign-in" />
  }

  // Authenticated with Clerk but no Convex user, redirect to setup
  if (needsSetup) {
    console.log('Index: Needs setup, redirecting to sign-up')
    return <Redirect href="/(auth)/sign-up" />
  }

  // Redirect based on role
  if (role === 'trainer') {
    console.log('Index: User is trainer, redirecting to trainer dashboard')
    return <Redirect href="/(trainer)" />
  }

  if (role === 'client') {
    console.log('Index: User is client, redirecting to client dashboard')
    return <Redirect href="/(client)" />
  }

  // Fallback - should not happen
  console.log('Index: Fallback case, redirecting to sign-in')
  return <Redirect href="/(auth)/sign-in" />
}
