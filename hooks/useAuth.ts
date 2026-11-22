import { useConvexAuth, useQuery } from 'convex/react'
import { useUser } from '@clerk/clerk-expo'
import { api } from 'convex/_generated/api'
import { useMemo } from 'react'
import type { User } from '../types'
import { computeAuthState } from '../lib/authState'

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

  const authState = useMemo(
    () => computeAuthState<User>({ isClerkLoading, clerkUser, convexUser }),
    // clerkUser is compared by id: Clerk hands back a new object on re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isClerkLoading, clerkUser?.id, convexUser]
  )

  return {
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    role: authState.role,
    needsSetup: authState.needsSetup,
    needsIntake: authState.needsIntake,
    clerkUser,
    // Helper functions
    hasCompletedIntake: !!authState.user?.intakeCompletedAt,
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
