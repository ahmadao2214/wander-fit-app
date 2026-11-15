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
  fallbackRoute = '/'
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

  // If user needs to complete Convex user setup
  if (requireAuth && needsSetup) {
    return <Redirect href="/(auth)/sign-up" />
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
 * IntakeOnlyRoute - For authenticated users in the intake/onboarding flow
 * Used by the intake flow screens
 *
 * INTERLEAVED FLOW SUPPORT:
 * The intake and onboarding flows are interleaved, meaning users navigate
 * between /(intake)/ and /(onboarding)/ routes during the combined flow.
 * We allow access to intake screens as long as onboarding is not complete.
 */
export function IntakeOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primaryText" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  // Not authenticated → go to sign in
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />
  }

  // Needs Convex user setup → go to sign up
  if (needsSetup) {
    return <Redirect href="/(auth)/sign-up" />
  }

  // If both intake AND onboarding are complete → go to dashboard
  // This prevents users from accessing intake after fully completing the flow
  if (user?.intakeCompletedAt && user?.onboardingCompletedAt) {
    return <Redirect href="/(athlete)" />
  }

  // Allow access during:
  // 1. Initial intake (no intakeCompletedAt)
  // 2. Interleaved flow (intakeCompletedAt set, but onboardingCompletedAt not set)
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
 * to the First Run through the root. An account that exists in Clerk but
 * not yet in Convex stays, so sign-up can finish creating it.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primaryText" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  if (isAuthenticated && needsSetup) {
    return <>{children}</>
  }

  if (isAuthenticated && user?.intakeCompletedAt) {
    return <Redirect href="/(athlete)" />
  }

  if (isAuthenticated) {
    return <Redirect href="/" />
  }

  return <>{children}</>
}

/**
 * OnboardingRoute - For authenticated users accessing onboarding screens
 * Used by the onboarding flow (educational screens interleaved with intake)
 *
 * Supports three modes:
 * 1. Interleaved mode: User is in the middle of intake, navigating to onboarding screens
 * 2. Post-intake mode: User completed intake but not onboarding
 * 3. Revisit mode: User completed onboarding but progress is reset to 0
 */
export function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup, needsOnboarding } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primaryText" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  // Not authenticated → go to sign in
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />
  }

  // Needs Convex user setup → go to sign up
  if (needsSetup) {
    return <Redirect href="/(auth)/sign-up" />
  }

  // REMOVED: Intake completion check
  // The interleaved flow navigates to onboarding screens DURING intake,
  // so we can't require intake to be complete here.
  // Navigation back to intake is handled by the screens themselves.

  // Allow revisit mode: completed onboarding but progress is reset to 0
  const isRevisitMode = user?.onboardingCompletedAt != null &&
    (user?.onboardingProgress === 0 || user?.onboardingProgress === undefined)

  // Already completed both intake and onboarding and not in revisit mode → go to dashboard
  if (user?.intakeCompletedAt && !needsOnboarding && !isRevisitMode) {
    return <Redirect href="/(athlete)" />
  }

  // Show onboarding flow (interleaved, post-intake, or revisit)
  return <>{children}</>
}
