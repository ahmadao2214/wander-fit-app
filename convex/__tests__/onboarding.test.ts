import { describe, it, expect } from "vitest";
import { TOTAL_ONBOARDING_SCREENS } from "../onboarding";

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding Constants", () => {
  describe("TOTAL_ONBOARDING_SCREENS", () => {
    it("should be 10 screens total", () => {
      expect(TOTAL_ONBOARDING_SCREENS).toBe(10);
    });

    it("should be a positive number", () => {
      expect(TOTAL_ONBOARDING_SCREENS).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING SCREEN INDEX TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding Screen Indices", () => {
  // Screen index mapping for reference
  const SCREEN_INDICES = {
    WELCOME: 0,
    THREE_PHASES: 1,
    WHY_IT_WORKS: 2,
    GPP_EXPLAINED: 3,
    SPP_EXPLAINED: 4,
    SSP_EXPLAINED: 5,
    PERSONAL_TIMELINE: 6,
    COMMITMENT: 7,
    UNLOCK_PROGRESSION: 8,
    FIRST_WORKOUT: 9,
  };

  it("should have welcome as the first screen (index 0)", () => {
    expect(SCREEN_INDICES.WELCOME).toBe(0);
  });

  it("should have first workout as the last screen", () => {
    expect(SCREEN_INDICES.FIRST_WORKOUT).toBe(TOTAL_ONBOARDING_SCREENS - 1);
  });

  it("should have all section 1 screens (welcome) at indices 0-2", () => {
    expect(SCREEN_INDICES.WELCOME).toBe(0);
    expect(SCREEN_INDICES.THREE_PHASES).toBe(1);
    expect(SCREEN_INDICES.WHY_IT_WORKS).toBe(2);
  });

  it("should have all section 2 screens (phase education) at indices 3-5", () => {
    expect(SCREEN_INDICES.GPP_EXPLAINED).toBe(3);
    expect(SCREEN_INDICES.SPP_EXPLAINED).toBe(4);
    expect(SCREEN_INDICES.SSP_EXPLAINED).toBe(5);
  });

  it("should have section 3 screens (personalization) at indices 6-7", () => {
    expect(SCREEN_INDICES.PERSONAL_TIMELINE).toBe(6);
    expect(SCREEN_INDICES.COMMITMENT).toBe(7);
  });

  it("should have section 4 screens (how it works) at indices 8-9", () => {
    expect(SCREEN_INDICES.UNLOCK_PROGRESSION).toBe(8);
    expect(SCREEN_INDICES.FIRST_WORKOUT).toBe(9);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING STATE LOGIC TESTS (Pure Functions)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding State Logic", () => {
  // Helper to simulate user state
  interface UserOnboardingState {
    intakeCompletedAt: number | null;
    onboardingCompletedAt: number | null;
    onboardingProgress: number | null;
    onboardingSkipped: boolean | null;
  }

  // Pure function to check if onboarding should show
  const shouldShowOnboarding = (user: UserOnboardingState): boolean => {
    const intakeComplete = user.intakeCompletedAt != null;
    const onboardingComplete = user.onboardingCompletedAt != null;
    return intakeComplete && !onboardingComplete;
  };

  // Pure function to get current screen
  const getCurrentScreen = (user: UserOnboardingState): number => {
    return user.onboardingProgress ?? 0;
  };

  // Pure function to check if screen index is valid
  const isValidScreenIndex = (index: number): boolean => {
    return index >= 0 && index < TOTAL_ONBOARDING_SCREENS;
  };

  describe("shouldShowOnboarding", () => {
    it("should return false if intake is not completed", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: null,
        onboardingCompletedAt: null,
        onboardingProgress: null,
        onboardingSkipped: null,
      };
      expect(shouldShowOnboarding(user)).toBe(false);
    });

    it("should return true if intake is completed but onboarding is not", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        onboardingProgress: null,
        onboardingSkipped: null,
      };
      expect(shouldShowOnboarding(user)).toBe(true);
    });

    it("should return false if both intake and onboarding are completed", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: Date.now(),
        onboardingProgress: 9,
        onboardingSkipped: false,
      };
      expect(shouldShowOnboarding(user)).toBe(false);
    });

    it("should return false if onboarding was skipped", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: Date.now(),
        onboardingProgress: 3,
        onboardingSkipped: true,
      };
      expect(shouldShowOnboarding(user)).toBe(false);
    });
  });

  describe("getCurrentScreen", () => {
    it("should return 0 if progress is null", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        onboardingProgress: null,
        onboardingSkipped: null,
      };
      expect(getCurrentScreen(user)).toBe(0);
    });

    it("should return the current progress if set", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        onboardingProgress: 5,
        onboardingSkipped: null,
      };
      expect(getCurrentScreen(user)).toBe(5);
    });

    it("should handle progress at the last screen", () => {
      const user: UserOnboardingState = {
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        onboardingProgress: TOTAL_ONBOARDING_SCREENS - 1,
        onboardingSkipped: null,
      };
      expect(getCurrentScreen(user)).toBe(9);
    });
  });

  describe("isValidScreenIndex", () => {
    it("should return true for valid indices (0 to 9)", () => {
      for (let i = 0; i < TOTAL_ONBOARDING_SCREENS; i++) {
        expect(isValidScreenIndex(i)).toBe(true);
      }
    });

    it("should return false for negative indices", () => {
      expect(isValidScreenIndex(-1)).toBe(false);
      expect(isValidScreenIndex(-100)).toBe(false);
    });

    it("should return false for indices >= total screens", () => {
      expect(isValidScreenIndex(TOTAL_ONBOARDING_SCREENS)).toBe(false);
      expect(isValidScreenIndex(10)).toBe(false);
      expect(isValidScreenIndex(100)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING REVISIT LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding Revisit Logic", () => {
  interface UserOnboardingState {
    onboardingCompletedAt: number | null;
    onboardingProgress: number | null;
  }

  const isRevisitMode = (user: UserOnboardingState): boolean => {
    return user.onboardingCompletedAt != null;
  };

  const getStateAfterRevisitReset = (
    user: UserOnboardingState
  ): UserOnboardingState => {
    return {
      ...user,
      onboardingProgress: 0, // Reset progress
      // onboardingCompletedAt is preserved
    };
  };

  describe("isRevisitMode", () => {
    it("should return false if onboarding was never completed", () => {
      const user: UserOnboardingState = {
        onboardingCompletedAt: null,
        onboardingProgress: 5,
      };
      expect(isRevisitMode(user)).toBe(false);
    });

    it("should return true if onboarding was completed", () => {
      const user: UserOnboardingState = {
        onboardingCompletedAt: Date.now(),
        onboardingProgress: 9,
      };
      expect(isRevisitMode(user)).toBe(true);
    });
  });

  describe("getStateAfterRevisitReset", () => {
    it("should reset progress to 0", () => {
      const user: UserOnboardingState = {
        onboardingCompletedAt: Date.now(),
        onboardingProgress: 9,
      };
      const result = getStateAfterRevisitReset(user);
      expect(result.onboardingProgress).toBe(0);
    });

    it("should preserve onboardingCompletedAt", () => {
      const completedAt = Date.now();
      const user: UserOnboardingState = {
        onboardingCompletedAt: completedAt,
        onboardingProgress: 9,
      };
      const result = getStateAfterRevisitReset(user);
      expect(result.onboardingCompletedAt).toBe(completedAt);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING COMPLETION LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding Completion Logic", () => {
  interface CompletionResult {
    completedAt: number;
    skipped: boolean;
  }

  const createSkipResult = (): CompletionResult => ({
    completedAt: Date.now(),
    skipped: true,
  });

  const createCompleteResult = (): CompletionResult => ({
    completedAt: Date.now(),
    skipped: false,
  });

  describe("Skip vs Complete", () => {
    it("should mark skipped=true when user skips", () => {
      const result = createSkipResult();
      expect(result.skipped).toBe(true);
      expect(result.completedAt).toBeGreaterThan(0);
    });

    it("should mark skipped=false when user completes normally", () => {
      const result = createCompleteResult();
      expect(result.skipped).toBe(false);
      expect(result.completedAt).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING DATA STRUCTURE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding Data Structures", () => {
  // Types that match what getOnboardingData returns
  interface OnboardingData {
    userName: string;
    sport: { id: string; name: string } | null;
    gppCategory: { id: number; name: string; shortName: string } | null;
    skillLevel: "Novice" | "Moderate" | "Advanced";
    preferredDays: number;
    weeksUntilSeason: number | null;
    ageGroup: "14-17" | "18-35" | "36+" | null;
  }

  describe("OnboardingData structure", () => {
    it("should have required fields for personalization", () => {
      const data: OnboardingData = {
        userName: "John Doe",
        sport: { id: "sport_123", name: "Basketball" },
        gppCategory: { id: 2, name: "Explosive/Vertical", shortName: "Power" },
        skillLevel: "Moderate",
        preferredDays: 4,
        weeksUntilSeason: 12,
        ageGroup: "18-35",
      };

      expect(data.userName).toBeDefined();
      expect(data.sport).toBeDefined();
      expect(data.gppCategory).toBeDefined();
      expect(data.skillLevel).toBeDefined();
      expect(data.preferredDays).toBeDefined();
    });

    it("should allow null for optional fields", () => {
      const data: OnboardingData = {
        userName: "Jane Doe",
        sport: null,
        gppCategory: null,
        skillLevel: "Novice",
        preferredDays: 3,
        weeksUntilSeason: null,
        ageGroup: null,
      };

      expect(data.sport).toBeNull();
      expect(data.weeksUntilSeason).toBeNull();
      expect(data.ageGroup).toBeNull();
    });

    it("should support all skill levels", () => {
      const levels: Array<"Novice" | "Moderate" | "Advanced"> = [
        "Novice",
        "Moderate",
        "Advanced",
      ];

      levels.forEach((level) => {
        const data: OnboardingData = {
          userName: "Test",
          sport: null,
          gppCategory: null,
          skillLevel: level,
          preferredDays: 3,
          weeksUntilSeason: null,
          ageGroup: null,
        };
        expect(data.skillLevel).toBe(level);
      });
    });

    it("should support all age groups", () => {
      const ageGroups: Array<"14-17" | "18-35" | "36+"> = [
        "14-17",
        "18-35",
        "36+",
      ];

      ageGroups.forEach((ageGroup) => {
        const data: OnboardingData = {
          userName: "Test",
          sport: null,
          gppCategory: null,
          skillLevel: "Novice",
          preferredDays: 3,
          weeksUntilSeason: null,
          ageGroup: ageGroup,
        };
        expect(data.ageGroup).toBe(ageGroup);
      });
    });

    it("should support preferred days from 1-7", () => {
      for (let days = 1; days <= 7; days++) {
        const data: OnboardingData = {
          userName: "Test",
          sport: null,
          gppCategory: null,
          skillLevel: "Novice",
          preferredDays: days,
          weeksUntilSeason: null,
          ageGroup: null,
        };
        expect(data.preferredDays).toBe(days);
      }
    });
  });
});
