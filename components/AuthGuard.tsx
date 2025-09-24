import React from 'react'
import { Redirect, type Href } from 'expo-router'
import { YStack, Text, Spinner } from 'tamagui'
import { useAuth } from '../hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: ('trainer' | 'client')[]
  fallbackRoute?: Href
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  allowedRoles,
  fallbackRoute = '/(auth)/sign-in'
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, role, needsSetup } = useAuth()

  // Show loading spinner while determining auth state
  if (isLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4">
        <Spinner size="large" />
        <Text>Loading...</Text>
      </YStack>
    )
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Redirect href={fallbackRoute} />
  }

  // If user needs to complete setup
  if (requireAuth && needsSetup) {
    return <Redirect href="/(auth)/sign-up" />
  }

  // If specific roles are required, check them
  if (requireAuth && allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on their actual role
    const redirectRoute = role === 'trainer' ? '/(trainer)' : '/(client)'
    return <Redirect href={redirectRoute} />
  }

  // If auth is not required but user is authenticated, redirect to dashboard
  if (!requireAuth && isAuthenticated && !needsSetup && role) {
    const redirectRoute = role === 'trainer' ? '/(trainer)' : '/(client)'
    return <Redirect href={redirectRoute} />
  }

  // All checks passed, render the children
  return <>{children}</>
}

// Specific auth guards for common use cases
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAuth={true}>{children}</AuthGuard>
}

export function TrainerOnlyRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAuth={true} allowedRoles={['trainer']}>{children}</AuthGuard>
}

export function ClientOnlyRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAuth={true} allowedRoles={['client']}>{children}</AuthGuard>
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAuth={false}>{children}</AuthGuard>
}
