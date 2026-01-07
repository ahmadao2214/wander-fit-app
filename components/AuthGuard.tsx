import React from 'react'
import { Redirect, type Href } from 'expo-router'
import { YStack, Text, Spinner } from 'tamagui'
import { useAuth } from '../hooks/useAuth'

// Route for onboarding - cast needed until expo-router types are regenerated
const ONBOARDING_ROUTE = '/(onboarding)' as Href

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireIntake?: boolean
  fallbackRoute?: Href
}

/**
 * AuthGuard - Handles authentication and intake flow routing
 * 
 * NEW GPP MODEL:
 * - No more trainer/client roles - everyone is an athlete
 * - After auth, check if intake is completed
 * - If no intake → redirect to intake flow
 * - If intake complete → allow access to athlete dashboard
 */
export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireIntake = true,
  fallbackRoute = '/(auth)/sign-in'
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, needsSetup } = useAuth()

  // Show loading spinner while determining auth state
  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$green10" />
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

  // If intake is required but not completed
  if (requireAuth && requireIntake && user && !user.intakeCompletedAt) {
    return <Redirect href="/(intake)/sport" />
  }

  // All checks passed, render the children
  return <>{children}</>
}

/**
 * AthleteOnlyRoute - For authenticated users with completed intake AND onboarding
 * Used by the main athlete tabs
 */
export function AthleteOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup, needsOnboarding } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$green10" />
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

  // Needs intake → go to intake
  if (!user?.intakeCompletedAt) {
    return <Redirect href="/(intake)/sport" />
  }

  // Needs onboarding → go to onboarding
  if (needsOnboarding) {
    return <Redirect href={ONBOARDING_ROUTE} />
  }

  // All checks passed
  return <>{children}</>
}

/**
 * IntakeOnlyRoute - For authenticated users who haven't completed intake
 * Used by the intake flow
 */
export function IntakeOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup, needsOnboarding } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$green10" />
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

  // Already completed intake → go to onboarding or dashboard
  if (user?.intakeCompletedAt) {
    if (needsOnboarding) {
      return <Redirect href={ONBOARDING_ROUTE} />
    }
    return <Redirect href="/(athlete)" />
  }

  // Show intake flow
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
 * PublicOnlyRoute - For unauthenticated users only (sign in, sign up)
 * Redirects to appropriate screen if already authenticated
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup, needsOnboarding } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  // Authenticated but needs Convex setup → stay on sign-up
  if (isAuthenticated && needsSetup) {
    return <>{children}</>
  }

  // Authenticated without intake → go to intake
  if (isAuthenticated && user && !user.intakeCompletedAt) {
    return <Redirect href="/(intake)/sport" />
  }

  // Authenticated with intake but needs onboarding → go to onboarding
  if (isAuthenticated && needsOnboarding) {
    return <Redirect href={ONBOARDING_ROUTE} />
  }

  // Authenticated with intake and onboarding → go to dashboard
  if (isAuthenticated && user?.intakeCompletedAt) {
    return <Redirect href="/(athlete)" />
  }

  // Not authenticated → show public content
  return <>{children}</>
}

/**
 * OnboardingRoute - For authenticated users who completed intake but not onboarding
 * Used by the onboarding flow (educational screens after intake)
 */
export function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, needsSetup, needsOnboarding } = useAuth()

  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$green10" />
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

  // Hasn't completed intake → go to intake
  if (!user?.intakeCompletedAt) {
    return <Redirect href="/(intake)/sport" />
  }

  // Already completed onboarding → go to dashboard
  if (!needsOnboarding) {
    return <Redirect href="/(athlete)" />
  }

  // Show onboarding flow
  return <>{children}</>
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (kept for backward compatibility during migration)
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use AthleteOnlyRoute instead */
export function ClientOnlyRoute({ children }: { children: React.ReactNode }) {
  return <AthleteOnlyRoute>{children}</AthleteOnlyRoute>
}

/** @deprecated Trainer routes removed in GPP model */
export function TrainerOnlyRoute({ children }: { children: React.ReactNode }) {
  // Redirect trainers to athlete dashboard (they're now just athletes)
  return <AthleteOnlyRoute>{children}</AthleteOnlyRoute>
}
