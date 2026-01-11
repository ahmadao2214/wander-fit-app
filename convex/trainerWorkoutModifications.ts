import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

type ExerciseOverride = {
  exerciseId: Id<"exercises">;
  sets: number;
  reps: string;
  tempo?: string;
  restSeconds: number;
  notes?: string;
  orderIndex: number;
  superset?: string;
  intensityPercent?: number;
  section?: "warmup" | "main" | "circuit" | "finisher";
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user is a trainer.
 * Uses role field if set, otherwise checks if they have any athletes linked.
 */
async function isTrainer(ctx: any, userId: Id<"users">): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  if (user.role === "trainer") return true;

  const hasAthletes = await ctx.db
    .query("trainer_athlete_relationships")
    .withIndex("by_trainer_status", (q: any) =>
      q.eq("trainerId", userId).eq("status", "active")
    )
    .first();

  return !!hasAthletes;
}

/**
 * Verify trainer-athlete relationship exists and user is a trainer
 */
async function verifyTrainerRelationship(
  ctx: any,
  trainerId: Id<"users">,
  athleteUserId: Id<"users">
): Promise<void> {
  const trainerCheck = await isTrainer(ctx, trainerId);
  if (!trainerCheck) {
    throw new Error("Only trainers can modify workouts");
  }

  const relationship = await ctx.db
    .query("trainer_athlete_relationships")
    .withIndex("by_trainer_status", (q: any) =>
      q.eq("trainerId", trainerId).eq("status", "active")
    )
    .filter((q: any) => q.eq(q.field("athleteUserId"), athleteUserId))
    .first();

  if (!relationship) {
    throw new Error("You are not linked to this athlete");
  }
}

/**
 * Get or create customization record for an athlete's workout
 */
async function getOrCreateCustomization(
  ctx: any,
  trainerId: Id<"users">,
  athleteUserId: Id<"users">,
  templateId: Id<"program_templates">
): Promise<{ customizationId: Id<"trainer_workout_customizations">; exercises: ExerciseOverride[] }> {
  // Check for existing customization
  const existing = await ctx.db
    .query("trainer_workout_customizations")
    .withIndex("by_athlete_template", (q: any) =>
      q.eq("athleteUserId", athleteUserId).eq("templateId", templateId)
    )
    .first();

  if (existing) {
    return { customizationId: existing._id, exercises: existing.exercises };
  }

  // Get template exercises to seed the customization
  const template = await ctx.db.get(templateId);
  if (!template) {
    throw new Error("Template not found");
  }

  // Create new customization with template's exercises
  const customizationId = await ctx.db.insert("trainer_workout_customizations", {
    trainerId,
    athleteUserId,
    templateId,
    exercises: template.exercises.map((ex: any, index: number) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets,
      reps: ex.reps,
      tempo: ex.tempo,
      restSeconds: ex.restSeconds,
      notes: ex.notes,
      orderIndex: ex.orderIndex ?? index,
      superset: ex.superset,
      intensityPercent: ex.intensityPercent,
      section: ex.section,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const newRecord = await ctx.db.get(customizationId);
  return { customizationId, exercises: newRecord!.exercises };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get workout template with any existing overrides for this athlete
 * Checks for trainer customizations first, then falls back to template
 */
export const getWorkoutWithOverrides = query({
  args: {
    templateId: v.id("program_templates"),
    athleteUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    // Check for trainer customization first
    const customization = await ctx.db
      .query("trainer_workout_customizations")
      .withIndex("by_athlete_template", (q) =>
        q.eq("athleteUserId", args.athleteUserId).eq("templateId", args.templateId)
      )
      .first();

    // Use customized exercises if available, otherwise template exercises
    const exerciseSource = customization?.exercises ?? template.exercises;

    // Batch fetch all exercise IDs
    const exerciseIds = [...new Set(exerciseSource.map((ex: any) => ex.exerciseId))];
    const exercisePromises = exerciseIds.map((id) =>
      ctx.db.get(id).then((e) => e as { _id: any; name: string; instructions?: string; tags?: string[] } | null)
    );
    const exercises = await Promise.all(exercisePromises);
    const exerciseMap = new Map(
      exercises.filter(Boolean).map((e) => [e!._id, e])
    );

    // Get exercise details for each exercise
    const exercisesWithDetails = exerciseSource.map((ex: any) => {
      const exercise = exerciseMap.get(ex.exerciseId);
      return {
        ...ex,
        exerciseName: exercise?.name ?? "Unknown Exercise",
        exerciseInstructions: exercise?.instructions,
        exerciseTags: exercise?.tags ?? [],
      };
    });

    // Check for schedule overrides (slot swaps)
    const scheduleOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    let hasScheduleOverride = false;
    if (scheduleOverride) {
      const slotOverride = scheduleOverride.slotOverrides.find(
        (o) =>
          o.phase === template.phase &&
          o.week === template.week &&
          o.day === template.day
      );
      hasScheduleOverride = !!slotOverride;
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
      hasCustomization: !!customization,
      hasScheduleOverride,
      customizationId: customization?._id,
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
    tempo: v.optional(v.string()),
    section: v.optional(v.union(
      v.literal("warmup"),
      v.literal("main"),
      v.literal("circuit"),
      v.literal("finisher")
    )),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

    // Verify exercise exists
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    // Get or create customization record
    const { customizationId, exercises } = await getOrCreateCustomization(
      ctx,
      args.trainerId,
      args.athleteUserId,
      args.templateId
    );

    // Create new exercise entry
    const newExercise: ExerciseOverride = {
      exerciseId: args.exerciseId,
      sets: args.sets,
      reps: args.reps,
      restSeconds: args.restSeconds,
      orderIndex: args.orderIndex,
      notes: args.notes,
      tempo: args.tempo,
      section: args.section,
    };

    // Insert at the specified order index, shifting others down
    const updatedExercises = [...exercises];

    // Shift exercises at or after the insertion point
    for (const ex of updatedExercises) {
      if (ex.orderIndex >= args.orderIndex) {
        ex.orderIndex += 1;
      }
    }

    // Add new exercise
    updatedExercises.push(newExercise);

    // Sort by orderIndex
    updatedExercises.sort((a, b) => a.orderIndex - b.orderIndex);

    // Update the customization record
    await ctx.db.patch(customizationId, {
      exercises: updatedExercises,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Added ${exercise.name} to workout`,
      customizationId,
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
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

    // Get or create customization record
    const { customizationId, exercises } = await getOrCreateCustomization(
      ctx,
      args.trainerId,
      args.athleteUserId,
      args.templateId
    );

    // Find the exercise to remove
    const exerciseToRemove = exercises.find(
      (ex) => ex.orderIndex === args.exerciseOrderIndex
    );

    if (!exerciseToRemove) {
      throw new Error("Exercise not found at specified index");
    }

    // Remove the exercise and reindex
    const updatedExercises = exercises
      .filter((ex) => ex.orderIndex !== args.exerciseOrderIndex)
      .map((ex, index) => ({
        ...ex,
        orderIndex: index,
      }));

    // Update the customization record
    await ctx.db.patch(customizationId, {
      exercises: updatedExercises,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Exercise removed from workout",
      customizationId,
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
      section: v.optional(v.union(
        v.literal("warmup"),
        v.literal("main"),
        v.literal("circuit"),
        v.literal("finisher")
      )),
    }),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

    // Get or create customization record
    const { customizationId, exercises } = await getOrCreateCustomization(
      ctx,
      args.trainerId,
      args.athleteUserId,
      args.templateId
    );

    // Find the exercise to modify
    const exerciseIndex = exercises.findIndex(
      (ex) => ex.orderIndex === args.exerciseOrderIndex
    );

    if (exerciseIndex === -1) {
      throw new Error("Exercise not found at specified index");
    }

    // Apply updates to the exercise
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex] = {
      ...updatedExercises[exerciseIndex],
      ...(args.updates.sets !== undefined && { sets: args.updates.sets }),
      ...(args.updates.reps !== undefined && { reps: args.updates.reps }),
      ...(args.updates.restSeconds !== undefined && { restSeconds: args.updates.restSeconds }),
      ...(args.updates.notes !== undefined && { notes: args.updates.notes }),
      ...(args.updates.tempo !== undefined && { tempo: args.updates.tempo }),
      ...(args.updates.section !== undefined && { section: args.updates.section }),
    };

    // Update the customization record
    await ctx.db.patch(customizationId, {
      exercises: updatedExercises,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Exercise modified",
      customizationId,
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
    newOrder: v.array(v.number()), // Array of current orderIndex values in desired new order
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

    // Validate input
    if (args.newOrder.length === 0) {
      throw new Error("New order array cannot be empty");
    }

    // Get or create customization record
    const { customizationId, exercises } = await getOrCreateCustomization(
      ctx,
      args.trainerId,
      args.athleteUserId,
      args.templateId
    );

    // Validate that all indices are present
    const existingIndices = new Set(exercises.map((ex) => ex.orderIndex));
    for (const idx of args.newOrder) {
      if (!existingIndices.has(idx)) {
        throw new Error(`Invalid order index: ${idx}`);
      }
    }

    if (args.newOrder.length !== exercises.length) {
      throw new Error("New order must contain all exercises");
    }

    // Create a map of current orderIndex to exercise
    const exerciseByIndex = new Map(exercises.map((ex) => [ex.orderIndex, ex]));

    // Reorder exercises based on newOrder array
    const reorderedExercises = args.newOrder.map((oldIndex, newIndex) => {
      const exercise = exerciseByIndex.get(oldIndex)!;
      return {
        ...exercise,
        orderIndex: newIndex,
      };
    });

    // Update the customization record
    await ctx.db.patch(customizationId, {
      exercises: reorderedExercises,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Exercises reordered",
      customizationId,
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
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

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
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

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

/**
 * Reset workout customization to original template
 * Deletes any trainer modifications for this athlete's workout
 */
export const resetCustomization = mutation({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
    templateId: v.id("program_templates"),
  },
  handler: async (ctx, args) => {
    // Verify trainer relationship and role
    await verifyTrainerRelationship(ctx, args.trainerId, args.athleteUserId);

    // Find existing customization
    const customization = await ctx.db
      .query("trainer_workout_customizations")
      .withIndex("by_athlete_template", (q) =>
        q.eq("athleteUserId", args.athleteUserId).eq("templateId", args.templateId)
      )
      .first();

    if (!customization) {
      return {
        success: true,
        message: "No customization to reset",
      };
    }

    // Delete the customization
    await ctx.db.delete(customization._id);

    return {
      success: true,
      message: "Workout reset to original template",
    };
  },
});

/**
 * Get all customizations for an athlete
 */
export const getAthleteCustomizations = query({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all customizations for this athlete
    const customizations = await ctx.db
      .query("trainer_workout_customizations")
      .withIndex("by_trainer_athlete", (q) =>
        q.eq("trainerId", args.trainerId).eq("athleteUserId", args.athleteUserId)
      )
      .collect();

    if (customizations.length === 0) {
      return [];
    }

    // Batch fetch template info
    const templateIds = [...new Set(customizations.map((c) => c.templateId))];
    const templates = await Promise.all(templateIds.map((id) => ctx.db.get(id)));
    const templateMap = new Map(
      templates.filter(Boolean).map((t) => [t!._id, t])
    );

    return customizations.map((c) => {
      const template = templateMap.get(c.templateId);
      return {
        _id: c._id,
        templateId: c.templateId,
        templateName: template?.name ?? "Unknown Template",
        phase: template?.phase,
        week: template?.week,
        day: template?.day,
        exerciseCount: c.exercises.length,
        updatedAt: c.updatedAt,
      };
    });
  },
});
