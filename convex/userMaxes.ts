import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * User Maxes - 1RM (One Rep Max) Tracking
 *
 * Athletes need a way to establish their 1RM for key lifts to calculate intensity.
 *
 * 1RM Capture Methods (in priority order):
 * 1. user_input - Athlete entered manually (they know their max)
 * 2. calculated - Derived from workout history (Epley formula: 1RM = weight × (1 + reps/30))
 * 3. assessment - From dedicated assessment workout
 *
 * Key Lifts for 1RM Tracking:
 * - Back Squat
 * - Trap Bar Deadlift / Romanian Deadlift
 * - Bench Press / Dumbbell Bench Press
 * - Overhead Press
 */

// Validators
const oneRepMaxSourceValidator = v.union(
  v.literal("user_input"),
  v.literal("calculated"),
  v.literal("assessment")
);

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all 1RM records for the current user
 */
export const getUserMaxes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const maxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with exercise details
    const enriched = await Promise.all(
      maxes.map(async (max) => {
        const exercise = await ctx.db.get(max.exerciseId);
        return {
          ...max,
          exerciseName: exercise?.name || "Unknown Exercise",
          exerciseSlug: exercise?.slug,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get 1RM for a specific exercise
 */
export const getMaxForExercise = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const max = await ctx.db
      .query("user_maxes")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", user._id).eq("exerciseId", args.exerciseId)
      )
      .first();

    return max;
  },
});

/**
 * Get 1RM for an exercise by slug
 */
export const getMaxForExerciseBySlug = query({
  args: { exerciseSlug: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Find exercise by slug
    const exercise = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.exerciseSlug))
      .first();

    if (!exercise) {
      return null;
    }

    const max = await ctx.db
      .query("user_maxes")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", user._id).eq("exerciseId", exercise._id)
      )
      .first();

    return max;
  },
});

/**
 * Core lifts that support 1RM tracking
 * These are the foundational compound movements used for intensity calculations
 */
export const CORE_LIFT_SLUGS = [
  "back_squat",
  "bench_press",
  "trap_bar_deadlift",
] as const;

/**
 * Get the core lift exercises that support 1RM tracking
 * Returns exercise details with current user's 1RM if set
 */
export const getCoreLiftExercises = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    // Fetch exercises by slug
    // Filter out any that weren't found
    const foundExercises = exercises.filter((e) => e !== null);
    
    // Log warning if any exercises are missing
    if (foundExercises.length < CORE_LIFT_SLUGS.length) {
      const missing = CORE_LIFT_SLUGS.filter((slug, i) => exercises[i] === null);
      console.warn(`Missing core lift exercises: ${missing.join(', ')}`);
    }

    // If not authenticated, return exercises without maxes
    if (!identity) {
      return foundExercises.map((exercise) => ({
        ...exercise,
        currentMax: null,
        lastUpdated: null,
      }));
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return foundExercises.map((exercise) => ({
        ...exercise,
        currentMax: null,
        lastUpdated: null,
      }));
    }

    // Fetch user's maxes for these exercises
    const enriched = await Promise.all(
      foundExercises.map(async (exercise) => {
        const max = await ctx.db
          .query("user_maxes")
          .withIndex("by_user_exercise", (q) =>
            q.eq("userId", user._id).eq("exerciseId", exercise._id)
          )
          .first();

        return {
          ...exercise,
          currentMax: max?.oneRepMax ?? null,
          lastUpdated: max?.recordedAt ?? null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get all maxes for a list of exercise IDs (batch query for workout)
 */
export const getMaxesForExercises = query({
  args: { exerciseIds: v.array(v.id("exercises")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {};
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return {};
    }

    // Fetch all maxes for this user
    const allMaxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Create a map of exerciseId -> 1RM
    const maxMap: Record<string, number> = {};
    for (const max of allMaxes) {
      if (args.exerciseIds.some((id) => id === max.exerciseId)) {
        maxMap[max.exerciseId] = max.oneRepMax;
      }
    }

    return maxMap;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set or update a 1RM for an exercise
 */
export const setMax = mutation({
  args: {
    exerciseId: v.id("exercises"),
    oneRepMax: v.number(),
    source: oneRepMaxSourceValidator,
    notes: v.optional(v.string()),
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

    // Validate 1RM is positive and reasonable
    if (args.oneRepMax <= 0) {
      throw new Error("1RM must be a positive number");
    }
    if (args.oneRepMax > 2000) {
      throw new Error("1RM value seems unrealistic. Please verify your input.");
    }

    // Check if max already exists for this exercise
    const existingMax = await ctx.db
      .query("user_maxes")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", user._id).eq("exerciseId", args.exerciseId)
      )
      .first();

    const now = Date.now();

    if (existingMax) {
      // Update existing record
      await ctx.db.patch(existingMax._id, {
        oneRepMax: args.oneRepMax,
        source: args.source,
        recordedAt: now,
        notes: args.notes,
      });
      return { id: existingMax._id, action: "updated" as const };
    }

    // Create new record
    const id = await ctx.db.insert("user_maxes", {
      userId: user._id,
      exerciseId: args.exerciseId,
      oneRepMax: args.oneRepMax,
      source: args.source,
      recordedAt: now,
      notes: args.notes,
    });

    return { id, action: "created" as const };
  },
});

/**
 * Set 1RM for an exercise by slug (convenience method)
 */
export const setMaxBySlug = mutation({
  args: {
    exerciseSlug: v.string(),
    oneRepMax: v.number(),
    source: oneRepMaxSourceValidator,
    notes: v.optional(v.string()),
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

    // Find exercise by slug
    const exercise = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.exerciseSlug))
      .first();

    if (!exercise) {
      throw new Error(`Exercise not found: ${args.exerciseSlug}`);
    }

    // Validate 1RM is positive and reasonable
    if (args.oneRepMax <= 0) {
      throw new Error("1RM must be a positive number");
    }
    if (args.oneRepMax > 2000) {
      throw new Error("1RM value seems unrealistic. Please verify your input.");
    }

    // Check if max already exists
    const existingMax = await ctx.db
      .query("user_maxes")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", user._id).eq("exerciseId", exercise._id)
      )
      .first();

    const now = Date.now();

    if (existingMax) {
      await ctx.db.patch(existingMax._id, {
        oneRepMax: args.oneRepMax,
        source: args.source,
        recordedAt: now,
        notes: args.notes,
      });
      return { id: existingMax._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("user_maxes", {
      userId: user._id,
      exerciseId: exercise._id,
      oneRepMax: args.oneRepMax,
      source: args.source,
      recordedAt: now,
      notes: args.notes,
    });

    return { id, action: "created" as const };
  },
});

/**
 * Calculate and save 1RM from a set performance
 * Uses Epley formula: 1RM = weight × (1 + reps/30)
 */
export const calculateAndSaveMax = mutation({
  args: {
    exerciseId: v.id("exercises"),
    weight: v.number(),
    reps: v.number(),
    notes: v.optional(v.string()),
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

    // Validate inputs
    if (args.weight <= 0) {
      throw new Error("Weight must be positive");
    }
    if (args.reps <= 0) {
      throw new Error("Reps must be positive");
    }

    // Calculate 1RM using Epley formula
    let oneRepMax: number;
    if (args.reps === 1) {
      oneRepMax = args.weight;
    } else {
      oneRepMax = Math.round(args.weight * (1 + args.reps / 30));
    }

    // Check if max already exists
    const existingMax = await ctx.db
      .query("user_maxes")
      .withIndex("by_user_exercise", (q) =>
        q.eq("userId", user._id).eq("exerciseId", args.exerciseId)
      )
      .first();

    const now = Date.now();
    const calculatedNotes = args.notes
      ? `${args.notes} (Calculated from ${args.weight} × ${args.reps})`
      : `Calculated from ${args.weight} × ${args.reps}`;

    // Only update if new calculated max is higher than existing
    if (existingMax) {
      if (oneRepMax > existingMax.oneRepMax) {
        await ctx.db.patch(existingMax._id, {
          oneRepMax,
          source: "calculated",
          recordedAt: now,
          notes: calculatedNotes,
        });
        return {
          id: existingMax._id,
          action: "updated" as const,
          oneRepMax,
          previousMax: existingMax.oneRepMax,
        };
      }
      // New max is not higher, don't update
      return {
        id: existingMax._id,
        action: "unchanged" as const,
        oneRepMax,
        previousMax: existingMax.oneRepMax,
        message: "Calculated max is not higher than existing max",
      };
    }

    // Create new record
    const id = await ctx.db.insert("user_maxes", {
      userId: user._id,
      exerciseId: args.exerciseId,
      oneRepMax,
      source: "calculated",
      recordedAt: now,
      notes: calculatedNotes,
    });

    return { id, action: "created" as const, oneRepMax };
  },
});

/**
 * Set multiple 1RMs at once (for intake flow)
 * Only sets maxes for exercises with a value > 0
 */
export const setMultipleMaxes = mutation({
  args: {
    maxes: v.array(
      v.object({
        exerciseSlug: v.string(),
        oneRepMax: v.number(),
      })
    ),
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
    const results: Array<{
      slug: string;
      action: "created" | "updated" | "skipped_empty" | "skipped_invalid" | "skipped_not_found";
    }> = [];

    for (const { exerciseSlug, oneRepMax } of args.maxes) {
      // Skip if no value provided (empty is fine - user chose not to set this)
      // Skip if no value provided (empty is fine - user chose not to set this)
      if (!oneRepMax || oneRepMax === 0) {
        results.push({ slug: exerciseSlug, action: "skipped_empty" });
        continue;
      }

      // Skip if unreasonably high (likely typo)
      if (oneRepMax > 2000) {
        results.push({ slug: exerciseSlug, action: "skipped_invalid" });
        continue;
      }

      // Find exercise by slug
      const exercise = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", exerciseSlug))
        .first();

      if (!exercise) {
        results.push({ slug: exerciseSlug, action: "skipped_not_found" });
        continue;
      }

      // Check if max already exists
      const existingMax = await ctx.db
        .query("user_maxes")
        .withIndex("by_user_exercise", (q) =>
          q.eq("userId", user._id).eq("exerciseId", exercise._id)
        )
        .first();

      if (existingMax) {
        await ctx.db.patch(existingMax._id, {
          oneRepMax,
          source: "user_input",
          recordedAt: now,
        });
        results.push({ slug: exerciseSlug, action: "updated" });
      } else {
        await ctx.db.insert("user_maxes", {
          userId: user._id,
          exerciseId: exercise._id,
          oneRepMax,
          source: "user_input",
          recordedAt: now,
        });
        results.push({ slug: exerciseSlug, action: "created" });
      }
    }

    const invalidCount = results.filter((r) => r.action === "skipped_invalid").length;

    return {
      success: true,
      results,
      summary: {
        created: results.filter((r) => r.action === "created").length,
        updated: results.filter((r) => r.action === "updated").length,
        skippedEmpty: results.filter((r) => r.action === "skipped_empty").length,
        skippedInvalid: invalidCount,
        skippedNotFound: results.filter((r) => r.action === "skipped_not_found").length,
      },
      hasInvalidValues: invalidCount > 0,
    };
  },
});

/**
 * Delete a 1RM record
 */
export const deleteMax = mutation({
  args: { maxId: v.id("user_maxes") },
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

    const max = await ctx.db.get(args.maxId);
    if (!max) {
      throw new Error("Max record not found");
    }

    if (max.userId !== user._id) {
      throw new Error("Not authorized to delete this record");
    }

    await ctx.db.delete(args.maxId);
    return { success: true };
  },
});

/**
 * Delete all 1RM records for the current user
 */
export const deleteAllMaxes = mutation({
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

    const maxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const max of maxes) {
      await ctx.db.delete(max._id);
    }

    return { success: true, deleted: maxes.length };
  },
});
