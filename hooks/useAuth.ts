import { useConvexAuth, useQuery } from 'convex/react'
import { useUser } from '@clerk/clerk-expo'
import { api } from 'convex/_generated/api'
import { useMemo } from 'react'
import type { User } from '../types'

export function useAuth() {
  const { isAuthenticated: isClerkAuthenticated, isLoading: isClerkLoading } = useConvexAuth()
  const { user: clerkUser } = useUser()
  
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
      convexUser: convexUser ? { id: convexUser._id, role: convexUser.role } : convexUser
    })
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
      }
    }

    // If we have a Clerk user but Convex user is still loading
    if (convexUser === undefined) {
      return {
        isLoading: true,
        isAuthenticated: false, // Don't claim authenticated until we know
        user: null,
        role: null,
        needsSetup: false,
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
      }
    }

    // If we have both Clerk user and Convex user, we're authenticated
    // This works around the isClerkAuthenticated sync issue on mobile
    return {
      isLoading: false,
      isAuthenticated: true,
      user: convexUser,
      role: convexUser.role,
      needsSetup: false,
    }
  }, [isClerkLoading, clerkUser?.id, convexUser])

  return {
    ...authState,
    clerkUser,
    // Helper functions
    isTrainer: authState.role === 'trainer',
    isClient: authState.role === 'client',
  }
}

// Simplified hooks for common use cases
export function useIsTrainer() {
  const { role } = useAuth()
  return role === 'trainer'
}

export function useIsClient() {
  const { role } = useAuth()
  return role === 'client'
}

export function useCurrentUser() {
  const { user } = useAuth()
  return user
}

export function useUserRole() {
  const { role } = useAuth()
  return role
}
