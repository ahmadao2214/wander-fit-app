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
 * CURRENT FOCUS: Athlete experience
 * We are optimizing for the athlete's journey first. The trainer/coach role
 * will be implemented once the athlete experience is complete.
 * 
 * Key states:
 * - isLoading: Auth state is being determined
 * - isAuthenticated: User is logged in with Clerk
 * - needsSetup: User exists in Clerk but not in Convex (needs to complete sign-up)
 * - needsIntake: User exists but hasn't completed the intake questionnaire
 * 
 * FUTURE: Trainer/Coach Role
 * - Trainers will have visibility into their athletes' programs
 * - Athletes can be connected to trainers via email
 * - Trainers won't need to go through athlete intake
 */
export function useAuth() {
  const { isAuthenticated: isClerkAuthenticated, isLoading: isClerkLoading } = useConvexAuth()
  
  // Defensive: useUser() can return undefined during re-mounts on mobile
  const clerkUserResult = useUser()
  const clerkUser = clerkUserResult?.user
  
  // Try to get Convex user data even if Clerk auth state is inconsistent
  // This works around mobile Clerk + Convex sync issues
  const convexUser = useQuery(
    api.users.getCurrentUser,
    clerkUser ? { clerkId: clerkUser.id } : "skip"
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
    needsOnboarding: false,
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
        needsOnboarding: false,
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
        needsOnboarding: false,
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
        needsOnboarding: false,
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
        needsOnboarding: false,
      }
    }

    // Determine role (default to 'client'/athlete for now)
    const role = convexUser.role || 'client'
    
    // Check if intake is needed (only for athletes/clients)
    const needsIntake = role === 'client' && !convexUser.intakeCompletedAt

    // Check if onboarding education is needed (after intake, before main app)
    const needsOnboarding = role === 'client'
      && convexUser.intakeCompletedAt
      && !convexUser.onboardingCompletedAt

    // If we have both Clerk user and Convex user, we're authenticated
    return {
      isLoading: false,
      isAuthenticated: true,
      user: convexUser,
      role,
      needsSetup: false,
      needsIntake,
      needsOnboarding,
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
    needsOnboarding: safeAuthState.needsOnboarding,
    clerkUser,
    // Helper functions
    hasCompletedIntake: !!safeAuthState.user?.intakeCompletedAt,
    hasCompletedOnboarding: !!safeAuthState.user?.onboardingCompletedAt,
    isTrainer: safeAuthState.role === 'trainer',
    isAthlete: safeAuthState.role === 'client', // 'client' = athlete in our model
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

/**
 * Get user role
 * 
 * FUTURE: This will be used to differentiate between athletes and trainers.
 * Currently everyone defaults to athlete ('client').
 */
export function useUserRole() {
  const { role } = useAuth()
  return role
}

/**
 * Check if current user is a trainer
 * 
 * FUTURE: Trainers will have:
 * - Visibility into their athletes' programs
 * - Ability to approve pause/freeze requests
 * - Access to analytics across their athletes
 */
export function useIsTrainer() {
  const { role } = useAuth()
  return role === 'trainer'
}

/**
 * Check if current user is an athlete (client)
 */
export function useIsAthlete() {
  const { role } = useAuth()
  return role === 'client'
}

/**
 * Check if user has completed onboarding
 */
export function useHasCompletedOnboarding() {
  const { user } = useAuth()
  return !!user?.onboardingCompletedAt
}

/**
 * Check if user needs to see onboarding
 * Returns true if intake is complete but onboarding is not
 */
export function useNeedsOnboarding() {
  const { needsOnboarding } = useAuth()
  return needsOnboarding
}
