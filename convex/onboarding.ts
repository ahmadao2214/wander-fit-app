import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Onboarding Education Flow - State Management
 *
 * Manages the GPP/SPP/SSP education flow that appears after intake completion.
 *
 * Flow Overview (10 screens in 4 sections):
 *
 * Section 1: Welcome (screens 0-2)
 *   0. welcome: Introduction to personalized training
 *   1. assessment-complete: Your assessment results summary
 *   2. what-to-expect: Overview of what's coming
 *
 * Section 2: Phase Education (screens 3-5)
 *   3. phase-gpp: GPP explanation
 *   4. phase-spp: SPP explanation
 *   5. phase-ssp: SSP explanation
 *
 * Section 3: Timeline & Commitment (screens 6-7)
 *   6. timeline: 12-week journey overview
 *   7. commitment: Training frequency expectations
 *
 * Section 4: How It Works (screens 8-9)
 *   8. how-workouts-work: Workout structure
 *   9. ready-to-start: Final confirmation
 *
 * Requirements:
 * - Skippable: Users can skip at any point
 * - Revisitable: Accessible from Settings to re-watch
 * - Trackable: Per-screen progress for analytics
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ordered list of onboarding screen IDs
 * Index corresponds to currentScreen value in user_onboarding_progress
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

export type OnboardingScreenId = (typeof ONBOARDING_SCREENS)[number];

export const TOTAL_ONBOARDING_SCREENS = ONBOARDING_SCREENS.length;

/**
 * Screen sections for grouping in UI
 */
export const ONBOARDING_SECTIONS = {
  welcome: { start: 0, end: 2, title: "Welcome" },
  phaseEducation: { start: 3, end: 5, title: "Phase Education" },
  timeline: { start: 6, end: 7, title: "Timeline & Commitment" },
  howItWorks: { start: 8, end: 9, title: "How It Works" },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Map screen ID to viewed field name
// ─────────────────────────────────────────────────────────────────────────────

const screenToFieldMap: Record<OnboardingScreenId, string> = {
  welcome: "welcomeViewedAt",
  "assessment-complete": "assessmentCompleteViewedAt",
  "what-to-expect": "whatToExpectViewedAt",
  "phase-gpp": "phaseGppViewedAt",
  "phase-spp": "phaseSppViewedAt",
  "phase-ssp": "phaseSspViewedAt",
  timeline: "timelineViewedAt",
  commitment: "commitmentViewedAt",
  "how-workouts-work": "howWorkoutsWorkViewedAt",
  "ready-to-start": "readyToStartViewedAt",
};

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current user's onboarding progress
 */
export const getProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const progress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!progress) {
      // No progress record yet - user hasn't started onboarding
      return {
        hasStarted: false,
        currentScreen: 0,
        currentScreenId: ONBOARDING_SCREENS[0],
        totalScreens: TOTAL_ONBOARDING_SCREENS,
        isCompleted: false,
        isSkipped: false,
        screensViewed: [],
        progress: 0,
      };
    }

    // Build list of viewed screens
    const screensViewed: OnboardingScreenId[] = [];
    for (const screenId of ONBOARDING_SCREENS) {
      const fieldName = screenToFieldMap[screenId];
      if (progress[fieldName as keyof typeof progress]) {
        screensViewed.push(screenId);
      }
    }

    return {
      hasStarted: true,
      currentScreen: progress.currentScreen,
      currentScreenId: ONBOARDING_SCREENS[progress.currentScreen] ?? ONBOARDING_SCREENS[0],
      totalScreens: TOTAL_ONBOARDING_SCREENS,
      isCompleted: !!progress.completedAt,
      isSkipped: !!progress.skippedAt,
      screensViewed,
      progress: Math.round((screensViewed.length / TOTAL_ONBOARDING_SCREENS) * 100),
      completedAt: progress.completedAt,
      skippedAt: progress.skippedAt,
      revisitCount: progress.revisitCount,
    };
  },
});

/**
 * Check if user needs to complete onboarding
 * Returns true if user has completed intake but not onboarding
 */
export const needsOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return false;

    // Must have completed intake to need onboarding
    if (!user.intakeCompletedAt) return false;

    // If onboarding is already completed, don't need it
    if (user.onboardingCompletedAt) return false;

    return true;
  },
});

/**
 * Get onboarding screen content data
 * Returns metadata needed to render a specific screen
 */
export const getScreenData = query({
  args: { screenIndex: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const screenId = ONBOARDING_SCREENS[args.screenIndex];
    if (!screenId) return null;

    // Get user's intake data for personalized content
    const intake = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    // Get sport and category for phase education screens
    let sport = null;
    let category = null;

    if (intake) {
      sport = await ctx.db.get(intake.sportId);
      if (sport) {
        category = await ctx.db
          .query("gpp_categories")
          .withIndex("by_category_id", (q) => q.eq("categoryId", sport.gppCategoryId))
          .first();
      }
    }

    return {
      screenId,
      screenIndex: args.screenIndex,
      totalScreens: TOTAL_ONBOARDING_SCREENS,
      isFirst: args.screenIndex === 0,
      isLast: args.screenIndex === TOTAL_ONBOARDING_SCREENS - 1,
      // Personalized data
      userName: user.name,
      sport: sport?.name ?? null,
      category: category
        ? {
            id: category.categoryId,
            name: category.name,
            shortName: category.shortName,
            description: category.description,
          }
        : null,
      skillLevel: intake?.assignedSkillLevel ?? null,
      trainingDays: intake?.preferredTrainingDaysPerWeek ?? null,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start or resume onboarding flow
 * Creates progress record if it doesn't exist
 */
export const startOnboarding = mutation({
  args: {
    isRevisit: v.optional(v.boolean()), // True if accessing from Settings
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Check for existing progress
    const existingProgress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingProgress) {
      // Update revisit tracking if this is a revisit
      if (args.isRevisit) {
        await ctx.db.patch(existingProgress._id, {
          lastRevisitedAt: now,
          revisitCount: existingProgress.revisitCount + 1,
          // Reset to beginning for revisits
          currentScreen: 0,
          updatedAt: now,
        });
        return {
          progressId: existingProgress._id,
          currentScreen: 0,
          isRevisit: true,
        };
      } else if (!existingProgress.completedAt && !existingProgress.skippedAt) {
        // Allow resuming in-progress onboarding
        return {
          progressId: existingProgress._id,
          currentScreen: existingProgress.currentScreen,
          isRevisit: false,
        };
      }
      // If completed/skipped, return existing (previous thread question applies here)
      return {
        progressId: existingProgress._id,
        currentScreen: existingProgress.currentScreen,
        isRevisit: false,
      };
    }

    // Create new progress record (only if no existing progress)
    const progressId = await ctx.db.insert("user_onboarding_progress", {
      userId: user._id,
      currentScreen: 0,
      revisitCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      progressId,
      currentScreen: 0,
      isRevisit: false,
    };
});

/**
 * Mark a screen as viewed and advance to next
 */
export const advanceScreen = mutation({
  args: {
    screenIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const progress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!progress) {
      throw new Error("Onboarding not started. Call startOnboarding first.");
    }

    const screenId = ONBOARDING_SCREENS[args.screenIndex];
    if (!screenId) {
      throw new Error("Invalid screen index");
    }

    const now = Date.now();
    const fieldName = screenToFieldMap[screenId];
    const nextScreen = Math.min(args.screenIndex + 1, TOTAL_ONBOARDING_SCREENS - 1);

    // Mark current screen as viewed and advance
    await ctx.db.patch(progress._id, {
      [fieldName]: now,
      currentScreen: nextScreen,
      updatedAt: now,
    });

    return {
      viewedScreen: screenId,
      nextScreen,
      nextScreenId: ONBOARDING_SCREENS[nextScreen],
      isComplete: args.screenIndex === TOTAL_ONBOARDING_SCREENS - 1,
    };
  },
});

/**
 * Go back to previous screen
 */
export const goBack = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const progress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!progress) {
      throw new Error("Onboarding not started");
    }

    const previousScreen = Math.max(progress.currentScreen - 1, 0);

    await ctx.db.patch(progress._id, {
      currentScreen: previousScreen,
      updatedAt: Date.now(),
    });

    return {
      currentScreen: previousScreen,
      currentScreenId: ONBOARDING_SCREENS[previousScreen],
    };
  },
});

/**
 * Complete the onboarding flow
 * Called when user reaches the final screen and confirms
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const progress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!progress) {
      throw new Error("Onboarding not started");
    }

    const now = Date.now();

    // Mark progress as completed
    await ctx.db.patch(progress._id, {
      completedAt: now,
      readyToStartViewedAt: now, // Ensure last screen is marked
      updatedAt: now,
    });

    // Mark user as having completed onboarding
    await ctx.db.patch(user._id, {
      onboardingCompletedAt: now,
    });

    return {
      success: true,
      completedAt: now,
    };
  },
});

/**
 * Skip the onboarding flow
 * User can skip at any point
 */
export const skipOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    // Get or create progress record
    let progress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (progress) {
      // Mark as skipped
      await ctx.db.patch(progress._id, {
        skippedAt: now,
        updatedAt: now,
      });
    } else {
      // Create progress record with skipped status
      await ctx.db.insert("user_onboarding_progress", {
        userId: user._id,
        currentScreen: 0,
        skippedAt: now,
        revisitCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Mark user as having completed onboarding (skipping counts as completion)
    await ctx.db.patch(user._id, {
      onboardingCompletedAt: now,
    });

    return {
      success: true,
      skippedAt: now,
    };
  },
});

/**
 * Reset onboarding progress (for testing or re-do)
 */
export const resetOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Delete existing progress
    const progress = await ctx.db
      .query("user_onboarding_progress")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (progress) {
      await ctx.db.delete(progress._id);
    }

    // Clear onboarding completion from user
    await ctx.db.patch(user._id, {
      onboardingCompletedAt: undefined,
    });

    return { success: true };
  },
});
