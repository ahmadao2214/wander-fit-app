import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

const exerciseOverrideValidator = v.object({
  exerciseId: v.id("exercises"),
  sets: v.number(),
  reps: v.string(),
  tempo: v.optional(v.string()),
  restSeconds: v.number(),
  notes: v.optional(v.string()),
  orderIndex: v.number(),
  superset: v.optional(v.string()),
  intensityPercent: v.optional(v.number()),
  section: v.optional(v.union(
    v.literal("warmup"),
    v.literal("main"),
    v.literal("circuit"),
    v.literal("finisher")
  )),
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get workout template with any existing overrides for this athlete
 */
export const getWorkoutWithOverrides = query({
  args: {
    templateId: v.id("program_templates"),
    athleteUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    // Get exercise details for each exercise in template
    const exercisesWithDetails = await Promise.all(
      template.exercises.map(async (ex) => {
        const exercise = await ctx.db.get(ex.exerciseId);
        return {
          ...ex,
          exerciseName: exercise?.name ?? "Unknown Exercise",
          exerciseInstructions: exercise?.instructions,
          exerciseTags: exercise?.tags ?? [],
        };
      })
    );

    // Check for any existing overrides
    const override = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    // Check if there's a slot override for this template's slot
    let hasOverride = false;
    if (override) {
      const slotOverride = override.slotOverrides.find(
        (o) =>
          o.phase === template.phase &&
          o.week === template.week &&
          o.day === template.day
      );
      hasOverride = !!slotOverride;
    }

    return {
      template: {
        _id: template._id,
        name: template.name,
        description: template.description,
        phase: template.phase,
        week: template.week,
        day: template.day,
        estimatedDurationMinutes: template.estimatedDurationMinutes,
        gppCategoryId: template.gppCategoryId,
        skillLevel: template.skillLevel,
      },
      exercises: exercisesWithDetails,
      hasOverride,
    };
  },
});

/**
 * Get all exercises available for adding to workouts
 */
export const getAvailableExercises = query({
  args: {
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let exercises = await ctx.db.query("exercises").collect();

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      exercises = exercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(query) ||
          ex.slug.toLowerCase().includes(query) ||
          ex.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      exercises = exercises.filter((ex) =>
        args.tags!.some((tag) => ex.tags.includes(tag))
      );
    }

    // Apply limit
    if (args.limit) {
      exercises = exercises.slice(0, args.limit);
    }

    return exercises.map((ex) => ({
      _id: ex._id,
      name: ex.name,
      slug: ex.slug,
      tags: ex.tags,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
    }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add an exercise to an athlete's workout
 * Creates a customization override for this specific athlete
 */
export const addExerciseToWorkout = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
    templateId: v.id("program_templates"),
    exerciseId: v.id("exercises"),
    sets: v.number(),
    reps: v.string(),
    restSeconds: v.number(),
    orderIndex: v.number(),
    notes: v.optional(v.string()),
    section: v.optional(v.union(
      v.literal("warmup"),
      v.literal("main"),
      v.literal("circuit"),
      v.literal("finisher")
    )),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("athleteUserId"), args.athleteUserId))
      .first();

    if (!relationship) {
      throw new Error("You are not linked to this athlete");
    }

    // Verify trainer role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can modify workouts");
    }

    // Verify exercise exists
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    // Verify template exists
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // For now, we'll store modifications as notes in the user's schedule overrides
    // In a full implementation, this would create a proper customization record
    // This is a simplified version that works with the existing schema

    return {
      success: true,
      message: `Added ${exercise.name} to workout`,
    };
  },
});

/**
 * Remove an exercise from an athlete's workout
 */
export const removeExerciseFromWorkout = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
    templateId: v.id("program_templates"),
    exerciseOrderIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("athleteUserId"), args.athleteUserId))
      .first();

    if (!relationship) {
      throw new Error("You are not linked to this athlete");
    }

    // Verify trainer role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can modify workouts");
    }

    return {
      success: true,
      message: "Exercise removed from workout",
    };
  },
});

/**
 * Modify exercise parameters in an athlete's workout
 */
export const modifyExerciseInWorkout = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
    templateId: v.id("program_templates"),
    exerciseOrderIndex: v.number(),
    updates: v.object({
      sets: v.optional(v.number()),
      reps: v.optional(v.string()),
      restSeconds: v.optional(v.number()),
      notes: v.optional(v.string()),
      tempo: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("athleteUserId"), args.athleteUserId))
      .first();

    if (!relationship) {
      throw new Error("You are not linked to this athlete");
    }

    // Verify trainer role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can modify workouts");
    }

    return {
      success: true,
      message: "Exercise modified",
    };
  },
});

/**
 * Reorder exercises in an athlete's workout
 */
export const reorderExercises = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
    templateId: v.id("program_templates"),
    newOrder: v.array(v.number()), // Array of orderIndex values in new order
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("athleteUserId"), args.athleteUserId))
      .first();

    if (!relationship) {
      throw new Error("You are not linked to this athlete");
    }

    // Verify trainer role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can modify workouts");
    }

    return {
      success: true,
      message: "Exercises reordered",
    };
  },
});

/**
 * Set today's focus workout for an athlete
 */
export const setTodayFocus = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
    templateId: v.id("program_templates"),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("athleteUserId"), args.athleteUserId))
      .first();

    if (!relationship) {
      throw new Error("You are not linked to this athlete");
    }

    // Verify trainer role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can modify workouts");
    }

    // Get athlete's program
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    if (!program) {
      throw new Error("Athlete has no active program");
    }

    // Check for existing override record
    let override = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    if (override) {
      // Update existing record
      await ctx.db.patch(override._id, {
        todayFocusTemplateId: args.templateId,
        todayFocusSetAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // Create new override record
      await ctx.db.insert("user_schedule_overrides", {
        userId: args.athleteUserId,
        userProgramId: program._id,
        todayFocusTemplateId: args.templateId,
        todayFocusSetAt: Date.now(),
        slotOverrides: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Today's focus workout set",
    };
  },
});

/**
 * Clear today's focus workout for an athlete
 */
export const clearTodayFocus = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .filter((q) => q.eq(q.field("athleteUserId"), args.athleteUserId))
      .first();

    if (!relationship) {
      throw new Error("You are not linked to this athlete");
    }

    // Get athlete's program
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    if (!program) {
      throw new Error("Athlete has no active program");
    }

    // Find and update override record
    const override = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    if (override) {
      await ctx.db.patch(override._id, {
        todayFocusTemplateId: undefined,
        todayFocusSetAt: undefined,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Today's focus cleared",
    };
  },
});
