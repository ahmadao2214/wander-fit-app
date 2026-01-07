import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Onboarding - Educational Flow After Intake
 *
 * Manages the onboarding flow state that runs after intake completion.
 * The onboarding explains GPP/SPP/SSP phases and builds user investment.
 *
 * FLOW:
 * 1. User completes intake → intakeCompletedAt is set
 * 2. User enters onboarding → onboardingProgress tracks current screen
 * 3. User completes OR skips → onboardingCompletedAt is set
 * 4. User can revisit from settings (onboardingProgress resets, completedAt preserved)
 *
 * SCREENS (10 total):
 * 0: Welcome to Your Journey
 * 1: The Three Phases (overview)
 * 2: Why This Works
 * 3: GPP Explained
 * 4: SPP Explained
 * 5: SSP Explained
 * 6: Your Personal Timeline
 * 7: Commitment (tap and hold)
 * 8: Unlock Progression
 * 9: Your First Workout Preview
 */

// Total number of onboarding screens
export const TOTAL_ONBOARDING_SCREENS = 10;

/**
 * Get the current onboarding state for the authenticated user
 */
export const getOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Determine if this is a revisit (completed onboarding but progress reset to 0)
    const isRevisit =
      user.onboardingCompletedAt != null &&
      (user.onboardingProgress === 0 || user.onboardingProgress === undefined);

    return {
      onboardingCompletedAt: user.onboardingCompletedAt ?? null,
      onboardingProgress: user.onboardingProgress ?? 0,
      onboardingSkipped: user.onboardingSkipped ?? false,
      intakeCompletedAt: user.intakeCompletedAt ?? null,
      totalScreens: TOTAL_ONBOARDING_SCREENS,
      isRevisit,
    };
  },
});

/**
 * Check if the user should see the onboarding flow
 * Returns true if:
 * - User is authenticated
 * - Intake is completed
 * - Onboarding is NOT completed
 */
export const shouldShowOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    // Must have completed intake but NOT completed onboarding
    const intakeComplete = user.intakeCompletedAt != null;
    const onboardingComplete = user.onboardingCompletedAt != null;

    return intakeComplete && !onboardingComplete;
  },
});

/**
 * Start or resume the onboarding flow
 * Initializes progress to 0 if not already started
 */
export const startOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Only initialize if not already started
    if (user.onboardingProgress === undefined) {
      await ctx.db.patch(user._id, {
        onboardingProgress: 0,
      });
    }

    return {
      currentScreen: user.onboardingProgress ?? 0,
      totalScreens: TOTAL_ONBOARDING_SCREENS,
    };
  },
});

/**
 * Advance to a specific screen in the onboarding flow
 */
export const advanceOnboarding = mutation({
  args: {
    screenIndex: v.number(),
  },
  handler: async (ctx, { screenIndex }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Validate screen index
    if (screenIndex < 0 || screenIndex >= TOTAL_ONBOARDING_SCREENS) {
      throw new Error(
        `Invalid screen index: ${screenIndex}. Must be 0-${TOTAL_ONBOARDING_SCREENS - 1}`
      );
    }

    await ctx.db.patch(user._id, {
      onboardingProgress: screenIndex,
    });

    return {
      currentScreen: screenIndex,
      totalScreens: TOTAL_ONBOARDING_SCREENS,
    };
  },
});

/**
 * Skip the onboarding flow
 * Marks onboarding as completed with skipped flag
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
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      onboardingCompletedAt: now,
      onboardingSkipped: true,
    });

    return {
      completedAt: now,
      skipped: true,
    };
  },
});

/**
 * Complete the onboarding flow normally (not skipped)
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
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    await ctx.db.patch(user._id, {
      onboardingCompletedAt: now,
      onboardingSkipped: false,
      onboardingProgress: TOTAL_ONBOARDING_SCREENS - 1, // Mark as on last screen
    });

    return {
      completedAt: now,
      skipped: false,
    };
  },
});

/**
 * Reset onboarding progress for revisit flow
 * Keeps completedAt intact but resets progress to 0
 * Used when user wants to review the onboarding from settings
 */
export const resetOnboardingForRevisit = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Only reset progress, keep completedAt intact
    await ctx.db.patch(user._id, {
      onboardingProgress: 0,
    });

    return {
      currentScreen: 0,
      totalScreens: TOTAL_ONBOARDING_SCREENS,
      isRevisit: user.onboardingCompletedAt != null,
    };
  },
});

/**
 * Get onboarding data needed for personalized screens
 * Returns user's intake data for displaying in onboarding
 */
export const getOnboardingData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    // Get the latest intake response
    const intakeResponse = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!intakeResponse) {
      return null;
    }

    // Get sport details
    const sport = await ctx.db.get(intakeResponse.sportId);

    // Get GPP category details
    const gppCategory = await ctx.db
      .query("gpp_categories")
      .withIndex("by_category_id", (q) =>
        q.eq("categoryId", intakeResponse.assignedGppCategoryId)
      )
      .unique();

    return {
      userName: user.name,
      sport: sport
        ? {
            id: sport._id,
            name: sport.name,
          }
        : null,
      gppCategory: gppCategory
        ? {
            id: gppCategory.categoryId,
            name: gppCategory.name,
            shortName: gppCategory.shortName,
          }
        : null,
      skillLevel: intakeResponse.assignedSkillLevel,
      preferredDays: intakeResponse.preferredTrainingDaysPerWeek,
      weeksUntilSeason: intakeResponse.weeksUntilSeason ?? null,
      ageGroup: intakeResponse.ageGroup ?? null,
    };
  },
});
