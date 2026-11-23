import React from 'react'
import { Redirect, type Href } from 'expo-router'
import { YStack, Text, Spinner } from 'tamagui'
import { useAuth } from '../hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireIntake?: boolean
  fallbackRoute?: Href
}

/**
 * AuthGuard - Handles authentication and intake flow routing
 *
 * Everyone is an athlete:
 * - After auth, check if intake is completed
 * - If no intake → redirect to intake flow
 * - If intake complete → allow access to athlete dashboard
 */
export function AuthGuard({
  children,
  requireAuth = true,
  requireIntake = true,
  fallbackRoute = '/',
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, needsSetup } = useAuth()

  // Show loading spinner while determining auth state
  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primaryText" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Redirect href={fallbackRoute} />
  }

  // A Clerk account with no Convex user saves it from the First Run
  if (requireAuth && needsSetup) {
    return <Redirect href="/" />
  }

  // If intake is required but not completed → the First Run, via the root
  if (requireAuth && requireIntake && user && !user.intakeCompletedAt) {
    return <Redirect href="/" />
  }

  // All checks passed, render the children
  return <>{children}</>
}

/**
 * AthleteOnlyRoute - For signed-in athletes with a program. Used by the
 * athlete tabs. Anyone else goes to the root, which opens the First Run.
 * The old onboarding screens are no longer required.
 */
export function AthleteOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primaryText" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  if (!isAuthenticated || !user?.intakeCompletedAt) {
    return <Redirect href="/" />
  }

  return <>{children}</>
}

/**
 * ProtectedRoute - Just requires authentication, no intake check
 * Useful for settings, profile pages, etc.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireIntake={false}>
      {children}
    </AuthGuard>
  )
}

/**
 * PublicOnlyRoute - For signed-out screens (sign in, sign up). A signed-in
 * athlete with a program goes to the tabs; one without a program goes back
 * to the First Run through the root, and so does an account that exists in
 * Clerk but not yet in Convex: the save sheet creates the Convex user.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primaryText" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  if (isAuthenticated && user?.intakeCompletedAt) {
    return <Redirect href="/(athlete)" />
  }

  if (isAuthenticated) {
    return <Redirect href="/" />
  }

  return <>{children}</>
}
