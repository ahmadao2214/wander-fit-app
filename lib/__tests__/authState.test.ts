import { describe, it, expect } from "vitest";
import {
  computeAuthState,
  isTrainer,
  isAthlete,
  hasCompletedIntake,
  type AuthInputState,
} from "../authState";

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

interface MockConvexUser {
  _id: string;
  role?: string;
  intakeCompletedAt?: number;
}

const createMockConvexUser = (
  overrides: Partial<MockConvexUser> = {}
): MockConvexUser => ({
  _id: "user-123",
  role: "client",
  ...overrides,
});

const createInput = (
  overrides: Partial<AuthInputState> = {}
): AuthInputState => ({
  isClerkLoading: false,
  clerkUser: null,
  convexUser: undefined,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE AUTH STATE TESTS - LOADING STATES
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeAuthState - Loading States", () => {
  it("returns isLoading: true when Clerk is loading", () => {
    const input = createInput({ isClerkLoading: true });
    const result = computeAuthState(input);

    expect(result.isLoading).toBe(true);
    expect(result.isAuthenticated).toBe(false);
  });

  it("returns isLoading: true when Clerk user exists but Convex user is undefined", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: undefined, // Still loading
    });
    const result = computeAuthState(input);

    expect(result.isLoading).toBe(true);
  });

  it("returns isLoading: false when fully resolved (no user)", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: null,
      convexUser: undefined,
    });
    const result = computeAuthState(input);

    expect(result.isLoading).toBe(false);
  });

  it("returns isLoading: false when fully resolved (with user)", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({ intakeCompletedAt: Date.now() }),
    });
    const result = computeAuthState(input);

    expect(result.isLoading).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE AUTH STATE TESTS - AUTHENTICATION STATES
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeAuthState - Authentication States", () => {
  it("returns isAuthenticated: false when no Clerk user", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: null,
      convexUser: undefined,
    });
    const result = computeAuthState(input);

    expect(result.isAuthenticated).toBe(false);
    expect(result.user).toBeNull();
  });

  it("returns isAuthenticated: true, needsSetup: true when Clerk user but no Convex user", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: null, // Convex user not found
    });
    const result = computeAuthState(input);

    expect(result.isAuthenticated).toBe(true);
    expect(result.needsSetup).toBe(true);
    expect(result.user).toBeNull();
  });

  it("returns isAuthenticated: true when both Clerk and Convex users exist", () => {
    const convexUser = createMockConvexUser({ intakeCompletedAt: Date.now() });
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser,
    });
    const result = computeAuthState(input);

    expect(result.isAuthenticated).toBe(true);
    expect(result.needsSetup).toBe(false);
    expect(result.user).toEqual(convexUser);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE AUTH STATE TESTS - INTAKE STATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeAuthState - Intake State", () => {
  it("returns needsIntake: true for client role without intakeCompletedAt", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({
        role: "client",
        intakeCompletedAt: undefined,
      }),
    });
    const result = computeAuthState(input);

    expect(result.needsIntake).toBe(true);
  });

  it("returns needsIntake: false for client role with intakeCompletedAt", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({
        role: "client",
        intakeCompletedAt: Date.now(),
      }),
    });
    const result = computeAuthState(input);

    expect(result.needsIntake).toBe(false);
  });

  it("returns needsIntake: false for trainer role", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({
        role: "trainer",
        intakeCompletedAt: undefined,
      }),
    });
    const result = computeAuthState(input);

    expect(result.needsIntake).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE AUTH STATE TESTS - ROLE
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeAuthState - Role", () => {
  it("returns role 'client' for client users", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({ role: "client" }),
    });
    const result = computeAuthState(input);

    expect(result.role).toBe("client");
  });

  it("returns role 'trainer' for trainer users", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({ role: "trainer" }),
    });
    const result = computeAuthState(input);

    expect(result.role).toBe("trainer");
  });

  it("defaults role to 'client' when not specified", () => {
    const input = createInput({
      isClerkLoading: false,
      clerkUser: { id: "clerk-123" },
      convexUser: createMockConvexUser({ role: undefined }),
    });
    const result = computeAuthState(input);

    expect(result.role).toBe("client");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("isTrainer", () => {
  it("returns true for 'trainer' role", () => {
    expect(isTrainer("trainer")).toBe(true);
  });

  it("returns false for 'client' role", () => {
    expect(isTrainer("client")).toBe(false);
  });

  it("returns false for null role", () => {
    expect(isTrainer(null)).toBe(false);
  });

  it("returns false for other roles", () => {
    expect(isTrainer("admin")).toBe(false);
  });
});

describe("isAthlete", () => {
  it("returns true for 'client' role", () => {
    expect(isAthlete("client")).toBe(true);
  });

  it("returns false for 'trainer' role", () => {
    expect(isAthlete("trainer")).toBe(false);
  });

  it("returns false for null role", () => {
    expect(isAthlete(null)).toBe(false);
  });
});

describe("hasCompletedIntake", () => {
  it("returns true when intakeCompletedAt is set", () => {
    expect(hasCompletedIntake({ intakeCompletedAt: Date.now() })).toBe(true);
  });

  it("returns false when intakeCompletedAt is undefined", () => {
    expect(hasCompletedIntake({ intakeCompletedAt: undefined })).toBe(false);
  });

  it("returns false when intakeCompletedAt is 0", () => {
    expect(hasCompletedIntake({ intakeCompletedAt: 0 })).toBe(false);
  });

  it("returns false for null user", () => {
    expect(hasCompletedIntake(null)).toBe(false);
  });
});

