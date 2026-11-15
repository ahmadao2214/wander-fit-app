import { useConvexAuth, useQuery } from 'convex/react'
import { useUser } from '@clerk/clerk-expo'
import { api } from 'convex/_generated/api'
import { useMemo } from 'react'
import type { User } from '../types'

/**
 * useAuth Hook
 * 
 * Provides authentication state for the WanderFit app.
 * 
 * Everyone is an athlete. Accounts created before the trainer screens were
 * removed may still carry role "trainer"; for them needsIntake stays false
 * (the root index checks intakeCompletedAt). A new athlete's account and
 * program are saved together at the end of the First Run.
 *
 * Key states:
 * - isLoading: Auth state is being determined
 * - isAuthenticated: User is logged in with Clerk
 * - needsSetup: User exists in Clerk but not in Convex (needs to complete sign-up)
 * - needsIntake: User exists but hasn't completed the intake questionnaire
 */
export function useAuth() {
  const { isAuthenticated: isClerkAuthenticated, isLoading: isClerkLoading } = useConvexAuth()
  
  // Defensive: useUser() can return undefined during re-mounts on mobile
  const clerkUserResult = useUser()
  const clerkUser = clerkUserResult?.user
  
  // getCurrentUser reads the caller from the Convex auth token, so wait until
  // Convex has the token. Querying earlier returns null, which would read as
  // "needs setup" and flash the sign-up screen for an existing user.
  const convexUser = useQuery(
    api.users.getCurrentUser,
    clerkUser && isClerkAuthenticated ? { clerkId: clerkUser.id } : "skip"
  ) as User | undefined | null

  // Debug logging (only on significant state changes)
  if (__DEV__ && clerkUser?.id) {
    console.log('useAuth hook state:', {
      isClerkLoading,
      isClerkAuthenticated,
      clerkUserId: clerkUser?.id,
      convexUser: convexUser ? { 
        id: convexUser._id, 
        role: convexUser.role,
        intakeCompletedAt: convexUser.intakeCompletedAt 
      } : convexUser
    })
  }

  // Default auth state for initial/error cases
  const defaultAuthState = {
    isLoading: true,
    isAuthenticated: false,
    user: null as User | null,
    role: null as string | null,
    needsSetup: false,
    needsIntake: false,
  }

  const authState = useMemo(() => {
    // If Clerk is still loading, we're loading
    if (isClerkLoading) {
      return {
        isLoading: true,
        isAuthenticated: false,
        user: null,
        role: null,
        needsSetup: false,
        needsIntake: false,
      }
    }

    // If no Clerk user, definitely not authenticated
    if (!clerkUser) {
      return {
        isLoading: false,
        isAuthenticated: false,
        user: null,
        role: null,
        needsSetup: false,
        needsIntake: false,
      }
    }

    // If we have a Clerk user but Convex user is still loading
    if (convexUser === undefined) {
      return {
        isLoading: true,
        isAuthenticated: false,
        user: null,
        role: null,
        needsSetup: false,
        needsIntake: false,
      }
    }

    // If we have a Clerk user but no Convex user, needs setup
    if (convexUser === null) {
      return {
        isLoading: false,
        isAuthenticated: true,
        user: null,
        role: null,
        needsSetup: true,
        needsIntake: false,
      }
    }

    // Determine role (default to 'client'/athlete for now)
    const role = convexUser.role || 'client'
    
    // Check if intake is needed (only for athletes/clients)
    const needsIntake = role === 'client' && !convexUser.intakeCompletedAt

    // If we have both Clerk user and Convex user, we're authenticated
    return {
      isLoading: false,
      isAuthenticated: true,
      user: convexUser,
      role,
      needsSetup: false,
      needsIntake,
    }
  }, [isClerkLoading, clerkUser?.id, convexUser])

  // Use defensive access to prevent "Cannot convert undefined value to object" error
  // This can happen during React concurrent rendering or strict mode remounts
  const safeAuthState = authState ?? defaultAuthState

  return {
    isLoading: safeAuthState.isLoading,
    isAuthenticated: safeAuthState.isAuthenticated,
    user: safeAuthState.user,
    role: safeAuthState.role,
    needsSetup: safeAuthState.needsSetup,
    needsIntake: safeAuthState.needsIntake,
    clerkUser,
    // Helper functions
    hasCompletedIntake: !!safeAuthState.user?.intakeCompletedAt,
  }
}

/**
 * Check if user has completed intake
 */
export function useHasCompletedIntake() {
  const { user } = useAuth()
  return !!user?.intakeCompletedAt
}

/**
 * Get the current user
 */
export function useCurrentUser() {
  const { user } = useAuth()
  return user
}
