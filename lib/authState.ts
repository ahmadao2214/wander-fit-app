/**
 * Auth State Logic
 *
 * Pure functions for computing auth state.
 * These are extracted from useAuth hook for testability.
 */

/**
 * User data from Convex
 */
interface ConvexUser {
  _id: string;
  role?: string;
  intakeCompletedAt?: number;
}

/**
 * Auth input state from Clerk and Convex
 */
export interface AuthInputState {
  isClerkLoading: boolean;
  clerkUser: { id: string } | null | undefined;
  convexUser: ConvexUser | null | undefined;
}

/**
 * Computed auth state
 */
export interface ComputedAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: ConvexUser | null;
  role: string | null;
  needsSetup: boolean;
  needsIntake: boolean;
}

/**
 * Compute auth state from Clerk and Convex input
 *
 * This is the core state machine logic from useAuth hook.
 *
 * States:
 * 1. Clerk loading → isLoading: true
 * 2. No Clerk user → not authenticated
 * 3. Clerk user, Convex undefined → isLoading: true (still fetching)
 * 4. Clerk user, Convex null → needsSetup: true
 * 5. Both exist → fully authenticated
 */
export function computeAuthState(input: AuthInputState): ComputedAuthState {
  const { isClerkLoading, clerkUser, convexUser } = input;

  // If Clerk is still loading, we're loading
  if (isClerkLoading) {
    return {
      isLoading: true,
      isAuthenticated: false,
      user: null,
      role: null,
      needsSetup: false,
      needsIntake: false,
    };
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
    };
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
    };
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
    };
  }

  // Determine role (default to 'client'/athlete)
  const role = convexUser.role || "client";

  // Check if intake is needed (only for athletes/clients)
  const needsIntake = role === "client" && !convexUser.intakeCompletedAt;

  // If we have both Clerk user and Convex user, we're authenticated
  return {
    isLoading: false,
    isAuthenticated: true,
    user: convexUser,
    role,
    needsSetup: false,
    needsIntake,
  };
}

/**
 * Check if user is a trainer
 */
export function isTrainer(role: string | null): boolean {
  return role === "trainer";
}

/**
 * Check if user is an athlete (client)
 */
export function isAthlete(role: string | null): boolean {
  return role === "client";
}

/**
 * Check if user has completed intake
 */
export function hasCompletedIntake(
  user: { intakeCompletedAt?: number } | null
): boolean {
  return !!user?.intakeCompletedAt;
}

