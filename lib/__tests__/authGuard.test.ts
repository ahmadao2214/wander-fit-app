import { describe, it, expect } from "vitest";
import {
  getAuthGuardDecision,
  getIntakeRouteDecision,
  getPublicRouteDecision,
  DEFAULT_ROUTES,
  type AuthState,
  type AuthGuardOptions,
} from "../authGuard";

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const createAuthState = (overrides: Partial<AuthState> = {}): AuthState => ({
  isLoading: false,
  isAuthenticated: false,
  needsSetup: false,
  user: null,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET AUTH GUARD DECISION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getAuthGuardDecision", () => {
  describe("loading state", () => {
    it("returns loading when isLoading is true", () => {
      const authState = createAuthState({ isLoading: true });
      const result = getAuthGuardDecision(authState);
      expect(result).toEqual({ type: "loading" });
    });

    it("returns loading even if authenticated but still loading", () => {
      const authState = createAuthState({
        isLoading: true,
        isAuthenticated: true,
      });
      const result = getAuthGuardDecision(authState);
      expect(result).toEqual({ type: "loading" });
    });
  });

  describe("unauthenticated state", () => {
    it("redirects to sign-in when not authenticated", () => {
      const authState = createAuthState({ isAuthenticated: false });
      const result = getAuthGuardDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.signIn,
      });
    });

    it("uses custom fallbackRoute when provided", () => {
      const authState = createAuthState({ isAuthenticated: false });
      const options: AuthGuardOptions = {
        fallbackRoute: "/custom-login" as any,
      };
      const result = getAuthGuardDecision(authState, options);
      expect(result).toEqual({
        type: "redirect",
        to: "/custom-login",
      });
    });
  });

  describe("needs setup state", () => {
    it("redirects to sign-up when authenticated but needs setup", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: true,
      });
      const result = getAuthGuardDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.signUp,
      });
    });
  });

  describe("needs intake state", () => {
    it("redirects to intake when authenticated without intake", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: undefined },
      });
      const result = getAuthGuardDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.intake,
      });
    });

    it("bypasses intake check when requireIntake is false", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: undefined },
      });
      const options: AuthGuardOptions = { requireIntake: false };
      const result = getAuthGuardDecision(authState, options);
      expect(result).toEqual({ type: "render" });
    });
  });

  describe("fully authenticated state", () => {
    it("renders when fully authenticated with intake", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: Date.now() },
      });
      const result = getAuthGuardDecision(authState);
      expect(result).toEqual({ type: "render" });
    });
  });

  describe("requireAuth option", () => {
    it("bypasses auth check when requireAuth is false", () => {
      const authState = createAuthState({ isAuthenticated: false });
      const options: AuthGuardOptions = { requireAuth: false };
      const result = getAuthGuardDecision(authState, options);
      expect(result).toEqual({ type: "render" });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET INTAKE ROUTE DECISION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getIntakeRouteDecision", () => {
  describe("loading state", () => {
    it("returns loading when isLoading is true", () => {
      const authState = createAuthState({ isLoading: true });
      const result = getIntakeRouteDecision(authState);
      expect(result).toEqual({ type: "loading" });
    });
  });

  describe("unauthenticated state", () => {
    it("redirects to sign-in when not authenticated", () => {
      const authState = createAuthState({ isAuthenticated: false });
      const result = getIntakeRouteDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.signIn,
      });
    });
  });

  describe("needs setup state", () => {
    it("redirects to sign-up when needs setup", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: true,
      });
      const result = getIntakeRouteDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.signUp,
      });
    });
  });

  describe("already completed intake", () => {
    it("redirects to athlete dashboard when intake is complete", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: Date.now() },
      });
      const result = getIntakeRouteDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.athlete,
      });
    });
  });

  describe("needs intake state", () => {
    it("renders when authenticated without intake (correct state for intake route)", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: undefined },
      });
      const result = getIntakeRouteDecision(authState);
      expect(result).toEqual({ type: "render" });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET PUBLIC ROUTE DECISION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getPublicRouteDecision", () => {
  describe("loading state", () => {
    it("returns loading when isLoading is true", () => {
      const authState = createAuthState({ isLoading: true });
      const result = getPublicRouteDecision(authState);
      expect(result).toEqual({ type: "loading" });
    });
  });

  describe("unauthenticated state", () => {
    it("renders when not authenticated (correct state for public route)", () => {
      const authState = createAuthState({ isAuthenticated: false });
      const result = getPublicRouteDecision(authState);
      expect(result).toEqual({ type: "render" });
    });
  });

  describe("authenticated but needs setup", () => {
    it("renders when authenticated but needs setup (stay on sign-up)", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: true,
      });
      const result = getPublicRouteDecision(authState);
      expect(result).toEqual({ type: "render" });
    });
  });

  describe("authenticated without intake", () => {
    it("redirects to intake when authenticated without intake", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: undefined },
      });
      const result = getPublicRouteDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.intake,
      });
    });
  });

  describe("fully authenticated", () => {
    it("redirects to athlete dashboard when fully authenticated", () => {
      const authState = createAuthState({
        isAuthenticated: true,
        needsSetup: false,
        user: { intakeCompletedAt: Date.now() },
      });
      const result = getPublicRouteDecision(authState);
      expect(result).toEqual({
        type: "redirect",
        to: DEFAULT_ROUTES.athlete,
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT ROUTES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("DEFAULT_ROUTES", () => {
  it("has correct route values", () => {
    expect(DEFAULT_ROUTES.signIn).toBe("/(auth)/sign-in");
    expect(DEFAULT_ROUTES.signUp).toBe("/(auth)/sign-up");
    expect(DEFAULT_ROUTES.intake).toBe("/(intake)/sport");
    expect(DEFAULT_ROUTES.athlete).toBe("/(athlete)");
  });
});

