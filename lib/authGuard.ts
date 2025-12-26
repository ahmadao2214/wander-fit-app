import type { Href } from "expo-router";

/**
 * AuthGuard Routing Logic
 *
 * Pure functions for determining routing decisions based on auth state.
 * This allows the routing logic to be tested independently of React components.
 */

/**
 * Auth state from useAuth hook
 */
export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  needsSetup: boolean;
  user: { intakeCompletedAt?: number } | null;
}

/**
 * Options for AuthGuard behavior
 */
export interface AuthGuardOptions {
  requireAuth?: boolean;
  requireIntake?: boolean;
  fallbackRoute?: Href;
}

/**
 * Possible routing decisions
 */
export type RouteDecision =
  | { type: "loading" }
  | { type: "redirect"; to: Href }
  | { type: "render" };

/**
 * Default routes for redirects
 */
export const DEFAULT_ROUTES = {
  signIn: "/(auth)/sign-in" as Href,
  signUp: "/(auth)/sign-up" as Href,
  intake: "/(intake)/sport" as Href,
  athlete: "/(athlete)" as Href,
} as const;

/**
 * Determine the routing decision for AuthGuard
 *
 * @param authState - Current authentication state
 * @param options - AuthGuard configuration options
 * @returns RouteDecision - What action the AuthGuard should take
 *
 * Decision tree:
 * 1. If loading → show loading
 * 2. If requireAuth and not authenticated → redirect to sign-in
 * 3. If requireAuth and needs setup → redirect to sign-up
 * 4. If requireAuth and requireIntake and no intake → redirect to intake
 * 5. Otherwise → render children
 */
export function getAuthGuardDecision(
  authState: AuthState,
  options: AuthGuardOptions = {}
): RouteDecision {
  const {
    requireAuth = true,
    requireIntake = true,
    fallbackRoute = DEFAULT_ROUTES.signIn,
  } = options;

  // Show loading spinner while determining auth state
  if (authState.isLoading) {
    return { type: "loading" };
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !authState.isAuthenticated) {
    return { type: "redirect", to: fallbackRoute };
  }

  // If user needs to complete Convex user setup
  if (requireAuth && authState.needsSetup) {
    return { type: "redirect", to: DEFAULT_ROUTES.signUp };
  }

  // If intake is required but not completed
  if (
    requireAuth &&
    requireIntake &&
    authState.user &&
    !authState.user.intakeCompletedAt
  ) {
    return { type: "redirect", to: DEFAULT_ROUTES.intake };
  }

  // All checks passed, render the children
  return { type: "render" };
}

/**
 * Determine routing for IntakeOnlyRoute
 * (For users who haven't completed intake yet)
 */
export function getIntakeRouteDecision(authState: AuthState): RouteDecision {
  if (authState.isLoading) {
    return { type: "loading" };
  }

  // Not authenticated → go to sign in
  if (!authState.isAuthenticated) {
    return { type: "redirect", to: DEFAULT_ROUTES.signIn };
  }

  // Needs Convex user setup → go to sign up
  if (authState.needsSetup) {
    return { type: "redirect", to: DEFAULT_ROUTES.signUp };
  }

  // Already completed intake → go to dashboard
  if (authState.user?.intakeCompletedAt) {
    return { type: "redirect", to: DEFAULT_ROUTES.athlete };
  }

  // Show intake flow
  return { type: "render" };
}

/**
 * Determine routing for PublicOnlyRoute
 * (For unauthenticated users only - sign in, sign up)
 */
export function getPublicRouteDecision(authState: AuthState): RouteDecision {
  if (authState.isLoading) {
    return { type: "loading" };
  }

  // Authenticated but needs Convex setup → stay on sign-up (render)
  if (authState.isAuthenticated && authState.needsSetup) {
    return { type: "render" };
  }

  // Authenticated without intake → go to intake
  if (
    authState.isAuthenticated &&
    authState.user &&
    !authState.user.intakeCompletedAt
  ) {
    return { type: "redirect", to: DEFAULT_ROUTES.intake };
  }

  // Authenticated with intake → go to dashboard
  if (authState.isAuthenticated && authState.user?.intakeCompletedAt) {
    return { type: "redirect", to: DEFAULT_ROUTES.athlete };
  }

  // Not authenticated → show public content
  return { type: "render" };
}

