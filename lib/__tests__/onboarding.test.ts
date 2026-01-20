import { describe, it, expect } from "vitest";
import {
  ONBOARDING_SCREENS,
  TOTAL_ONBOARDING_SCREENS,
  ONBOARDING_SECTIONS,
  SCREEN_METADATA,
  getScreenIdFromIndex,
  getIndexFromScreenId,
  getScreenSection,
  getSectionFromScreenId,
  calculateProgress,
  calculateViewedProgress,
  isFirstInSection,
  isLastInSection,
  getNextScreenIndex,
  getPreviousScreenIndex,
  isFirstScreen,
  isLastScreen,
  getScreenMetadata,
  getScreensInSection,
  getSectionProgress,
  isSectionComplete,
  getSectionOrder,
  computeOnboardingState,
} from "../onboarding";
import type { OnboardingScreenId } from "../../types";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Onboarding Constants", () => {
  describe("ONBOARDING_SCREENS", () => {
    it("contains exactly 9 screens", () => {
      expect(ONBOARDING_SCREENS).toHaveLength(9);
    });

    it("has all screens in correct order", () => {
      // Screen IDs must match actual route file names in app/(onboarding)/
      expect(ONBOARDING_SCREENS).toEqual([
        "welcome",
        "why-it-works",
        "phases-overview",
        "gpp-detail",
        "spp-detail",
        "ssp-detail",
        "personal-timeline",
        "commitment",
        "progression",
      ]);
    });

    it("TOTAL_ONBOARDING_SCREENS matches array length", () => {
      expect(TOTAL_ONBOARDING_SCREENS).toBe(ONBOARDING_SCREENS.length);
    });
  });

  describe("ONBOARDING_SECTIONS", () => {
    it("has 4 sections", () => {
      expect(Object.keys(ONBOARDING_SECTIONS)).toHaveLength(4);
    });

    it("welcome section covers screens 0-2", () => {
      expect(ONBOARDING_SECTIONS.welcome.start).toBe(0);
      expect(ONBOARDING_SECTIONS.welcome.end).toBe(2);
      expect(ONBOARDING_SECTIONS.welcome.screenCount).toBe(3);
    });

    it("phaseEducation section covers screens 3-5", () => {
      expect(ONBOARDING_SECTIONS.phaseEducation.start).toBe(3);
      expect(ONBOARDING_SECTIONS.phaseEducation.end).toBe(5);
      expect(ONBOARDING_SECTIONS.phaseEducation.screenCount).toBe(3);
    });

    it("timeline section covers screens 6-7", () => {
      expect(ONBOARDING_SECTIONS.timeline.start).toBe(6);
      expect(ONBOARDING_SECTIONS.timeline.end).toBe(7);
      expect(ONBOARDING_SECTIONS.timeline.screenCount).toBe(2);
    });

    it("howItWorks section covers screen 8", () => {
      expect(ONBOARDING_SECTIONS.howItWorks.start).toBe(8);
      expect(ONBOARDING_SECTIONS.howItWorks.end).toBe(8);
      expect(ONBOARDING_SECTIONS.howItWorks.screenCount).toBe(1);
    });

    it("all sections cover all screens without gaps", () => {
      const coveredIndices = new Set<number>();
      Object.values(ONBOARDING_SECTIONS).forEach((section) => {
        for (let i = section.start; i <= section.end; i++) {
          coveredIndices.add(i);
        }
      });
      expect(coveredIndices.size).toBe(TOTAL_ONBOARDING_SCREENS);
    });
  });

  describe("SCREEN_METADATA", () => {
    it("has metadata for all screens", () => {
      ONBOARDING_SCREENS.forEach((screenId) => {
        expect(SCREEN_METADATA[screenId]).toBeDefined();
        expect(SCREEN_METADATA[screenId].title).toBeTruthy();
        expect(SCREEN_METADATA[screenId].section).toBeTruthy();
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN INDEX FUNCTIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Screen Index Functions", () => {
  describe("getScreenIdFromIndex", () => {
    it("returns correct screen ID for valid indices", () => {
      expect(getScreenIdFromIndex(0)).toBe("welcome");
      expect(getScreenIdFromIndex(3)).toBe("gpp-detail");
      expect(getScreenIdFromIndex(8)).toBe("progression");
    });

    it("returns null for out-of-range indices", () => {
      expect(getScreenIdFromIndex(-1)).toBeNull();
      expect(getScreenIdFromIndex(9)).toBeNull();
      expect(getScreenIdFromIndex(100)).toBeNull();
    });
  });

  describe("getIndexFromScreenId", () => {
    it("returns correct index for valid screen IDs", () => {
      expect(getIndexFromScreenId("welcome")).toBe(0);
      expect(getIndexFromScreenId("gpp-detail")).toBe(3);
      expect(getIndexFromScreenId("progression")).toBe(8);
    });

    it("returns 0 for invalid screen IDs", () => {
      // TypeScript would prevent this, but testing runtime behavior
      expect(getIndexFromScreenId("invalid" as OnboardingScreenId)).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION FUNCTIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Section Functions", () => {
  describe("getScreenSection", () => {
    it("returns welcome for screens 0-2", () => {
      expect(getScreenSection(0)).toBe("welcome");
      expect(getScreenSection(1)).toBe("welcome");
      expect(getScreenSection(2)).toBe("welcome");
    });

    it("returns phaseEducation for screens 3-5", () => {
      expect(getScreenSection(3)).toBe("phaseEducation");
      expect(getScreenSection(4)).toBe("phaseEducation");
      expect(getScreenSection(5)).toBe("phaseEducation");
    });

    it("returns timeline for screens 6-7", () => {
      expect(getScreenSection(6)).toBe("timeline");
      expect(getScreenSection(7)).toBe("timeline");
    });

    it("returns howItWorks for screen 8", () => {
      expect(getScreenSection(8)).toBe("howItWorks");
    });

    it("returns null for out-of-range indices", () => {
      expect(getScreenSection(-1)).toBeNull();
      expect(getScreenSection(9)).toBeNull();
    });
  });

  describe("getSectionFromScreenId", () => {
    it("returns correct section for each screen", () => {
      expect(getSectionFromScreenId("welcome")).toBe("welcome");
      expect(getSectionFromScreenId("gpp-detail")).toBe("phaseEducation");
      expect(getSectionFromScreenId("personal-timeline")).toBe("timeline");
      expect(getSectionFromScreenId("progression")).toBe("howItWorks");
    });
  });

  describe("getScreensInSection", () => {
    it("returns welcome section screens", () => {
      expect(getScreensInSection("welcome")).toEqual([
        "welcome",
        "why-it-works",
        "phases-overview",
      ]);
    });

    it("returns phaseEducation section screens", () => {
      expect(getScreensInSection("phaseEducation")).toEqual([
        "gpp-detail",
        "spp-detail",
        "ssp-detail",
      ]);
    });

    it("returns timeline section screens", () => {
      expect(getScreensInSection("timeline")).toEqual([
        "personal-timeline",
        "commitment",
      ]);
    });

    it("returns howItWorks section screens", () => {
      expect(getScreensInSection("howItWorks")).toEqual([
        "progression",
      ]);
    });
  });

  describe("getSectionOrder", () => {
    it("returns sections in correct order", () => {
      expect(getSectionOrder()).toEqual([
        "welcome",
        "phaseEducation",
        "timeline",
        "howItWorks",
      ]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Progress Calculation Functions", () => {
  describe("calculateProgress", () => {
    it("returns 0 for screen 0", () => {
      expect(calculateProgress(0)).toBe(0);
    });

    it("returns ~56% for screen 5 (5/9 screens)", () => {
      expect(calculateProgress(5)).toBe(56);
    });

    it("returns 100 for screen 9 (total screens)", () => {
      expect(calculateProgress(9)).toBe(100);
    });

    it("rounds to nearest integer", () => {
      expect(calculateProgress(1, 3)).toBe(33);
      expect(calculateProgress(2, 3)).toBe(67);
    });

    it("returns 0 for totalScreens of 0", () => {
      expect(calculateProgress(5, 0)).toBe(0);
    });
  });

  describe("calculateViewedProgress", () => {
    it("returns 0 for empty viewed array", () => {
      expect(calculateViewedProgress([])).toBe(0);
    });

    it("returns correct percentage for partial progress", () => {
      // 2 screens viewed out of 9 = 22%
      expect(calculateViewedProgress(["welcome", "why-it-works"])).toBe(22);
    });

    it("returns 100 when all screens viewed", () => {
      expect(calculateViewedProgress([...ONBOARDING_SCREENS])).toBe(100);
    });
  });

  describe("getSectionProgress", () => {
    it("returns 0 for empty viewed array", () => {
      expect(getSectionProgress("welcome", [])).toBe(0);
    });

    it("returns 100 when all section screens viewed", () => {
      const welcomeScreens: OnboardingScreenId[] = [
        "welcome",
        "why-it-works",
        "phases-overview",
      ];
      expect(getSectionProgress("welcome", welcomeScreens)).toBe(100);
    });

    it("returns correct partial progress", () => {
      const partialScreens: OnboardingScreenId[] = ["welcome"];
      expect(getSectionProgress("welcome", partialScreens)).toBe(33);
    });
  });

  describe("isSectionComplete", () => {
    it("returns false for empty viewed array", () => {
      expect(isSectionComplete("welcome", [])).toBe(false);
    });

    it("returns true when all section screens viewed", () => {
      const welcomeScreens: OnboardingScreenId[] = [
        "welcome",
        "why-it-works",
        "phases-overview",
      ];
      expect(isSectionComplete("welcome", welcomeScreens)).toBe(true);
    });

    it("returns false when some section screens not viewed", () => {
      const partialScreens: OnboardingScreenId[] = ["welcome", "why-it-works"];
      expect(isSectionComplete("welcome", partialScreens)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION FUNCTIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Navigation Functions", () => {
  describe("isFirstInSection", () => {
    it("returns true for first screen in each section", () => {
      expect(isFirstInSection(0)).toBe(true); // welcome section
      expect(isFirstInSection(3)).toBe(true); // phaseEducation section
      expect(isFirstInSection(6)).toBe(true); // timeline section
      expect(isFirstInSection(8)).toBe(true); // howItWorks section
    });

    it("returns false for non-first screens", () => {
      expect(isFirstInSection(1)).toBe(false);
      expect(isFirstInSection(4)).toBe(false);
      expect(isFirstInSection(7)).toBe(false);
    });
  });

  describe("isLastInSection", () => {
    it("returns true for last screen in each section", () => {
      expect(isLastInSection(2)).toBe(true); // welcome section
      expect(isLastInSection(5)).toBe(true); // phaseEducation section
      expect(isLastInSection(7)).toBe(true); // timeline section
      expect(isLastInSection(8)).toBe(true); // howItWorks section (only 1 screen)
    });

    it("returns false for non-last screens", () => {
      expect(isLastInSection(0)).toBe(false);
      expect(isLastInSection(3)).toBe(false);
      expect(isLastInSection(6)).toBe(false);
    });
  });

  describe("getNextScreenIndex", () => {
    it("increments index normally", () => {
      expect(getNextScreenIndex(0)).toBe(1);
      expect(getNextScreenIndex(5)).toBe(6);
    });

    it("clamps to last screen index", () => {
      expect(getNextScreenIndex(8)).toBe(8);
      expect(getNextScreenIndex(9)).toBe(8);
    });
  });

  describe("getPreviousScreenIndex", () => {
    it("decrements index normally", () => {
      expect(getPreviousScreenIndex(5)).toBe(4);
      expect(getPreviousScreenIndex(8)).toBe(7);
    });

    it("clamps to first screen index", () => {
      expect(getPreviousScreenIndex(0)).toBe(0);
      expect(getPreviousScreenIndex(-1)).toBe(0);
    });
  });

  describe("isFirstScreen", () => {
    it("returns true only for index 0", () => {
      expect(isFirstScreen(0)).toBe(true);
      expect(isFirstScreen(1)).toBe(false);
      expect(isFirstScreen(8)).toBe(false);
    });
  });

  describe("isLastScreen", () => {
    it("returns true only for last index", () => {
      expect(isLastScreen(8)).toBe(true);
      expect(isLastScreen(0)).toBe(false);
      expect(isLastScreen(7)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA FUNCTIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Metadata Functions", () => {
  describe("getScreenMetadata", () => {
    it("returns metadata for welcome screen", () => {
      const metadata = getScreenMetadata("welcome");
      expect(metadata.title).toBe("Welcome");
      expect(metadata.section).toBe("welcome");
    });

    it("returns metadata for gpp-detail screen", () => {
      const metadata = getScreenMetadata("gpp-detail");
      expect(metadata.title).toBe("General Physical Preparedness");
      expect(metadata.section).toBe("phaseEducation");
    });

    it("returns metadata for progression screen", () => {
      const metadata = getScreenMetadata("progression");
      expect(metadata.title).toBe("Progression");
      expect(metadata.section).toBe("howItWorks");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING STATE COMPUTATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeOnboardingState", () => {
  describe("needsOnboarding calculation", () => {
    it("returns true when intake complete but onboarding not complete", () => {
      const result = computeOnboardingState({
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        role: "client",
      });
      expect(result.needsOnboarding).toBe(true);
      expect(result.hasCompletedIntake).toBe(true);
      expect(result.hasCompletedOnboarding).toBe(false);
    });

    it("returns false when onboarding is complete", () => {
      const result = computeOnboardingState({
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: Date.now(),
        role: "client",
      });
      expect(result.needsOnboarding).toBe(false);
      expect(result.hasCompletedOnboarding).toBe(true);
    });

    it("returns false when intake not complete", () => {
      const result = computeOnboardingState({
        intakeCompletedAt: null,
        onboardingCompletedAt: null,
        role: "client",
      });
      expect(result.needsOnboarding).toBe(false);
      expect(result.hasCompletedIntake).toBe(false);
    });

    it("returns false for trainers", () => {
      const result = computeOnboardingState({
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        role: "trainer",
      });
      expect(result.needsOnboarding).toBe(false);
    });

    it("treats undefined role as athlete (client)", () => {
      const result = computeOnboardingState({
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        role: undefined,
      });
      expect(result.needsOnboarding).toBe(true);
    });

    it("treats null role as athlete (client)", () => {
      const result = computeOnboardingState({
        intakeCompletedAt: Date.now(),
        onboardingCompletedAt: null,
        role: null,
      });
      expect(result.needsOnboarding).toBe(true);
    });
  });
});
