import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCallback, useMemo } from "react";
import type { OnboardingProgressState, OnboardingScreenData } from "../types";

/**
 * Onboarding screen configuration
 * Defines the ordered list of screens and their metadata
 */
export const ONBOARDING_SCREENS = [
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
] as const;

export const TOTAL_SCREENS = ONBOARDING_SCREENS.length;

/**
 * Screen sections for grouping in UI (e.g., progress indicators)
 */
export const ONBOARDING_SECTIONS = {
  welcome: { start: 0, end: 2, title: "Welcome", screenCount: 3 },
  phaseEducation: { start: 3, end: 5, title: "Phase Education", screenCount: 3 },
  timeline: { start: 6, end: 7, title: "Timeline & Commitment", screenCount: 2 },
  howItWorks: { start: 8, end: 9, title: "How It Works", screenCount: 2 },
} as const;

/**
 * Get the section a screen belongs to
 */
export function getScreenSection(screenIndex: number): keyof typeof ONBOARDING_SECTIONS | null {
  for (const [sectionId, section] of Object.entries(ONBOARDING_SECTIONS)) {
    if (screenIndex >= section.start && screenIndex <= section.end) {
      return sectionId as keyof typeof ONBOARDING_SECTIONS;
    }
  }
  return null;
}

/**
 * useOnboarding Hook
 *
 * Provides complete state management for the onboarding education flow.
 *
 * Usage:
 * ```tsx
 * const {
 *   progress,
 *   needsOnboarding,
 *   isLoading,
 *   start,
 *   advance,
 *   goBack,
 *   skip,
 *   complete,
 * } = useOnboarding();
 *
 * if (needsOnboarding) {
 *   // Show onboarding flow
 * }
 * ```
 */
export function useOnboarding() {
  // Queries
  const progressData = useQuery(api.onboarding.getProgress);
  const needsOnboardingData = useQuery(api.onboarding.needsOnboarding);

  // Mutations
  const startOnboardingMutation = useMutation(api.onboarding.startOnboarding);
  const advanceScreenMutation = useMutation(api.onboarding.advanceScreen);
  const goBackMutation = useMutation(api.onboarding.goBack);
  const completeOnboardingMutation = useMutation(api.onboarding.completeOnboarding);
  const skipOnboardingMutation = useMutation(api.onboarding.skipOnboarding);
  const resetOnboardingMutation = useMutation(api.onboarding.resetOnboarding);

  // Compute loading state
  const isLoading = progressData === undefined || needsOnboardingData === undefined;

  // Compute progress state
  const progress: OnboardingProgressState | null = useMemo(() => {
    if (!progressData) return null;
    return progressData as OnboardingProgressState;
  }, [progressData]);

  // Actions
  const start = useCallback(
    async (isRevisit = false) => {
      return startOnboardingMutation({ isRevisit });
    },
    [startOnboardingMutation]
  );

  const advance = useCallback(
    async (screenIndex: number) => {
      return advanceScreenMutation({ screenIndex });
    },
    [advanceScreenMutation]
  );

  const goBack = useCallback(async () => {
    return goBackMutation({});
  }, [goBackMutation]);

  const complete = useCallback(async () => {
    return completeOnboardingMutation({});
  }, [completeOnboardingMutation]);

  const skip = useCallback(async () => {
    return skipOnboardingMutation({});
  }, [skipOnboardingMutation]);

  const reset = useCallback(async () => {
    return resetOnboardingMutation({});
  }, [resetOnboardingMutation]);

  // Helper: Get current screen ID
  const currentScreenId = progress
    ? ONBOARDING_SCREENS[progress.currentScreen] ?? ONBOARDING_SCREENS[0]
    : ONBOARDING_SCREENS[0];

  // Helper: Check if on first/last screen
  const isFirstScreen = progress ? progress.currentScreen === 0 : true;
  const isLastScreen = progress ? progress.currentScreen === TOTAL_SCREENS - 1 : false;

  // Helper: Get current section
  const currentSection = progress ? getScreenSection(progress.currentScreen) : "welcome";

  return {
    // State
    progress,
    needsOnboarding: needsOnboardingData ?? false,
    isLoading,

    // Current screen helpers
    currentScreen: progress?.currentScreen ?? 0,
    currentScreenId,
    currentSection,
    isFirstScreen,
    isLastScreen,
    totalScreens: TOTAL_SCREENS,

    // Completion state
    isCompleted: progress?.isCompleted ?? false,
    isSkipped: progress?.isSkipped ?? false,
    hasStarted: progress?.hasStarted ?? false,

    // Actions
    start,
    advance,
    goBack,
    complete,
    skip,
    reset,

    // Constants (for UI)
    screens: ONBOARDING_SCREENS,
    sections: ONBOARDING_SECTIONS,
  };
}

/**
 * useOnboardingScreen Hook
 *
 * Fetches data for a specific onboarding screen.
 * Use this within individual screen components.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading } = useOnboardingScreen(3); // phase-gpp screen
 * ```
 */
export function useOnboardingScreen(screenIndex: number) {
  const screenData = useQuery(api.onboarding.getScreenData, { screenIndex });

  return {
    data: screenData as OnboardingScreenData | null,
    isLoading: screenData === undefined,
    screenId: ONBOARDING_SCREENS[screenIndex] ?? null,
  };
}

/**
 * useNeedsOnboarding Hook
 *
 * Simple hook to check if user needs to complete onboarding.
 * Use this in routing/guard logic.
 */
export function useNeedsOnboarding() {
  const needsOnboarding = useQuery(api.onboarding.needsOnboarding);
  return {
    needsOnboarding: needsOnboarding ?? false,
    isLoading: needsOnboarding === undefined,
  };
}

export default useOnboarding;
