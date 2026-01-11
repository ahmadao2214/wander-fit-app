/**
 * Onboarding Education Flow - Pure Utility Functions
 *
 * This module contains pure functions for onboarding logic.
 * These are extracted for testability and reuse across components.
 */

import type { OnboardingScreenId, OnboardingSectionId } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered list of onboarding screens
 */
export const ONBOARDING_SCREENS: OnboardingScreenId[] = [
  "welcome",
  "assessment-complete",
  "what-to-expect",
  "phase-gpp",
  "phase-spp",
  "phase-ssp",
  "timeline",
  "commitment",
  "how-workouts-work",
  "ready-to-start",
];

export const TOTAL_ONBOARDING_SCREENS = ONBOARDING_SCREENS.length;

/**
 * Section definitions with screen ranges
 */
export const ONBOARDING_SECTIONS: Record<
  OnboardingSectionId,
  {
    start: number;
    end: number;
    title: string;
    description: string;
    screenCount: number;
  }
> = {
  welcome: {
    start: 0,
    end: 2,
    title: "Welcome",
    description: "Introduction to your personalized training program",
    screenCount: 3,
  },
  phaseEducation: {
    start: 3,
    end: 5,
    title: "Phase Education",
    description: "Understanding GPP, SPP, and SSP phases",
    screenCount: 3,
  },
  timeline: {
    start: 6,
    end: 7,
    title: "Timeline & Commitment",
    description: "Your 12-week journey and what to expect",
    screenCount: 2,
  },
  howItWorks: {
    start: 8,
    end: 9,
    title: "How It Works",
    description: "How workouts are structured and executed",
    screenCount: 2,
  },
};

/**
 * Screen metadata for UI rendering
 */
export const SCREEN_METADATA: Record<
  OnboardingScreenId,
  {
    title: string;
    subtitle?: string;
    section: OnboardingSectionId;
  }
> = {
  welcome: {
    title: "Welcome",
    subtitle: "Your personalized training journey begins",
    section: "welcome",
  },
  "assessment-complete": {
    title: "Assessment Complete",
    subtitle: "Here's what we learned about you",
    section: "welcome",
  },
  "what-to-expect": {
    title: "What to Expect",
    subtitle: "An overview of your training program",
    section: "welcome",
  },
  "phase-gpp": {
    title: "General Physical Preparedness",
    subtitle: "Building your foundation",
    section: "phaseEducation",
  },
  "phase-spp": {
    title: "Specific Physical Preparedness",
    subtitle: "Sport-specific development",
    section: "phaseEducation",
  },
  "phase-ssp": {
    title: "Sport-Specific Preparedness",
    subtitle: "Peak performance phase",
    section: "phaseEducation",
  },
  timeline: {
    title: "Your Timeline",
    subtitle: "12 weeks to transform your performance",
    section: "timeline",
  },
  commitment: {
    title: "Commitment",
    subtitle: "What it takes to succeed",
    section: "timeline",
  },
  "how-workouts-work": {
    title: "How Workouts Work",
    subtitle: "Understanding workout structure",
    section: "howItWorks",
  },
  "ready-to-start": {
    title: "Ready to Start",
    subtitle: "Let's begin your journey",
    section: "howItWorks",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get screen ID from index
 */
export function getScreenIdFromIndex(index: number): OnboardingScreenId | null {
  return ONBOARDING_SCREENS[index] ?? null;
}

/**
 * Get index from screen ID
 */
export function getIndexFromScreenId(screenId: OnboardingScreenId): number {
  const index = ONBOARDING_SCREENS.indexOf(screenId);
  return index === -1 ? 0 : index;
}

/**
 * Get the section a screen belongs to
 */
export function getScreenSection(screenIndex: number): OnboardingSectionId | null {
  for (const [sectionId, section] of Object.entries(ONBOARDING_SECTIONS)) {
    if (screenIndex >= section.start && screenIndex <= section.end) {
      return sectionId as OnboardingSectionId;
    }
  }
  return null;
}

/**
 * Get section from screen ID
 */
export function getSectionFromScreenId(screenId: OnboardingScreenId): OnboardingSectionId {
  return SCREEN_METADATA[screenId].section;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(currentScreen: number, totalScreens: number = TOTAL_ONBOARDING_SCREENS): number {
  if (totalScreens === 0) return 0;
  return Math.round((currentScreen / totalScreens) * 100);
}

/**
 * Calculate progress percentage based on screens viewed
 */
export function calculateViewedProgress(viewedScreens: OnboardingScreenId[]): number {
  return Math.round((viewedScreens.length / TOTAL_ONBOARDING_SCREENS) * 100);
}

/**
 * Check if a screen is the first in its section
 */
export function isFirstInSection(screenIndex: number): boolean {
  const sectionId = getScreenSection(screenIndex);
  if (!sectionId) return false;
  return ONBOARDING_SECTIONS[sectionId].start === screenIndex;
}

/**
 * Check if a screen is the last in its section
 */
export function isLastInSection(screenIndex: number): boolean {
  const sectionId = getScreenSection(screenIndex);
  if (!sectionId) return false;
  return ONBOARDING_SECTIONS[sectionId].end === screenIndex;
}

/**
 * Get next screen index (clamped to valid range)
 */
export function getNextScreenIndex(currentIndex: number): number {
  return Math.min(currentIndex + 1, TOTAL_ONBOARDING_SCREENS - 1);
}

/**
 * Get previous screen index (clamped to valid range)
 */
export function getPreviousScreenIndex(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0);
}

/**
 * Check if on first screen
 */
export function isFirstScreen(screenIndex: number): boolean {
  return screenIndex === 0;
}

/**
 * Check if on last screen
 */
export function isLastScreen(screenIndex: number): boolean {
  return screenIndex === TOTAL_ONBOARDING_SCREENS - 1;
}

/**
 * Get screen metadata
 */
export function getScreenMetadata(screenId: OnboardingScreenId) {
  return SCREEN_METADATA[screenId];
}

/**
 * Get all screens in a section
 */
export function getScreensInSection(sectionId: OnboardingSectionId): OnboardingScreenId[] {
  const section = ONBOARDING_SECTIONS[sectionId];
  return ONBOARDING_SCREENS.slice(section.start, section.end + 1);
}

/**
 * Get section progress (screens viewed in section / total screens in section)
 */
export function getSectionProgress(
  sectionId: OnboardingSectionId,
  viewedScreens: OnboardingScreenId[]
): number {
  const sectionScreens = getScreensInSection(sectionId);
  const viewedInSection = sectionScreens.filter((s) => viewedScreens.includes(s));
  return Math.round((viewedInSection.length / sectionScreens.length) * 100);
}

/**
 * Check if a section is complete
 */
export function isSectionComplete(
  sectionId: OnboardingSectionId,
  viewedScreens: OnboardingScreenId[]
): boolean {
  const sectionScreens = getScreensInSection(sectionId);
  return sectionScreens.every((s) => viewedScreens.includes(s));
}

/**
 * Get the ordered list of section IDs
 */
export function getSectionOrder(): OnboardingSectionId[] {
  return ["welcome", "phaseEducation", "timeline", "howItWorks"];
}

/**
 * Compute onboarding state from user data
 * Pure function for determining if user needs onboarding
 */
export function computeOnboardingState(user: {
  intakeCompletedAt?: number | null;
  onboardingCompletedAt?: number | null;
  role?: string | null;
}): {
  needsOnboarding: boolean;
  hasCompletedIntake: boolean;
  hasCompletedOnboarding: boolean;
} {
  const isAthlete = !user.role || user.role === "client";
  const hasCompletedIntake = !!user.intakeCompletedAt;
  const hasCompletedOnboarding = !!user.onboardingCompletedAt;

  return {
    needsOnboarding: isAthlete && hasCompletedIntake && !hasCompletedOnboarding,
    hasCompletedIntake,
    hasCompletedOnboarding,
  };
}
