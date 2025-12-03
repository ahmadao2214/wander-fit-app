import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { GPP_CATEGORIES, SPORTS, EXERCISES, SAMPLE_TEMPLATE, EXAMPLE_INTAKE } from "./seedData";
import { Id } from "./_generated/dataModel";

/**
 * Seed Functions
 * 
 * These mutations populate the database with reference data.
 * Run from Convex dashboard: seed.seedAll({})
 */

// ─────────────────────────────────────────────────────────────────────────────
// SEED ALL REFERENCE DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seeds all reference data (categories, sports, exercises)
 * Safe to run multiple times - skips existing records
 */
export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      categories: { created: 0, skipped: 0 },
      sports: { created: 0, skipped: 0 },
      exercises: { created: 0, skipped: 0 },
    };

    // Seed GPP Categories
    for (const category of GPP_CATEGORIES) {
      const existing = await ctx.db
        .query("gpp_categories")
        .withIndex("by_category_id", (q) => q.eq("categoryId", category.categoryId))
        .first();

      if (!existing) {
        await ctx.db.insert("gpp_categories", category);
        results.categories.created++;
      } else {
        results.categories.skipped++;
      }
    }

    // Seed Sports
    for (const sport of SPORTS) {
      const existing = await ctx.db
        .query("sports")
        .withIndex("by_name", (q) => q.eq("name", sport.name))
        .first();

      if (!existing) {
        await ctx.db.insert("sports", sport);
        results.sports.created++;
      } else {
        results.sports.skipped++;
      }
    }

    // Seed Exercises
    for (const exercise of EXERCISES) {
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", exercise.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("exercises", exercise);
        results.exercises.created++;
      } else {
        results.exercises.skipped++;
      }
    }

    return {
      message: "Seed completed",
      results,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seed only GPP categories
 */
export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const category of GPP_CATEGORIES) {
      const existing = await ctx.db
        .query("gpp_categories")
        .withIndex("by_category_id", (q) => q.eq("categoryId", category.categoryId))
        .first();

      if (!existing) {
        await ctx.db.insert("gpp_categories", category);
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped, total: GPP_CATEGORIES.length };
  },
});

/**
 * Seed only sports
 */
export const seedSports = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const sport of SPORTS) {
      const existing = await ctx.db
        .query("sports")
        .withIndex("by_name", (q) => q.eq("name", sport.name))
        .first();

      if (!existing) {
        await ctx.db.insert("sports", sport);
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped, total: SPORTS.length };
  },
});

/**
 * Seed only exercises
 */
export const seedExercises = mutation({
  args: {},
  handler: async (ctx) => {
    let created = 0;
    let skipped = 0;

    for (const exercise of EXERCISES) {
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", exercise.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("exercises", exercise);
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped, total: EXERCISES.length };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE TEMPLATE SEEDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seed a sample program template (for testing)
 * Requires exercises to be seeded first
 */
export const seedSampleTemplate = mutation({
  args: {},
  handler: async (ctx) => {
    // Helper to get exercise ID by slug
    const getExerciseId = async (slug: string): Promise<Id<"exercises">> => {
      const exercise = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();

      if (!exercise) {
        throw new Error(`Exercise not found: ${slug}. Run seedExercises first.`);
      }

      return exercise._id;
    };

    // Check if template already exists
    const existing = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", SAMPLE_TEMPLATE.gppCategoryId)
          .eq("phase", SAMPLE_TEMPLATE.phase)
          .eq("skillLevel", SAMPLE_TEMPLATE.skillLevel)
          .eq("week", SAMPLE_TEMPLATE.week)
          .eq("day", SAMPLE_TEMPLATE.day)
      )
      .first();

    if (existing) {
      return { message: "Sample template already exists", id: existing._id };
    }

    // Resolve exercise slugs to IDs
    const exercises = await Promise.all(
      SAMPLE_TEMPLATE.exercises.map(async (e) => ({
        exerciseId: await getExerciseId(e.exerciseSlug),
        sets: e.sets,
        reps: e.reps,
        tempo: e.tempo,
        restSeconds: e.restSeconds, // Updated field name
        notes: e.notes,
        orderIndex: e.orderIndex,
      }))
    );

    const templateId = await ctx.db.insert("program_templates", {
      gppCategoryId: SAMPLE_TEMPLATE.gppCategoryId,
      phase: SAMPLE_TEMPLATE.phase,
      skillLevel: SAMPLE_TEMPLATE.skillLevel,
      week: SAMPLE_TEMPLATE.week,
      day: SAMPLE_TEMPLATE.day,
      name: SAMPLE_TEMPLATE.name,
      description: SAMPLE_TEMPLATE.description,
      estimatedDurationMinutes: SAMPLE_TEMPLATE.estimatedDurationMinutes, // Updated field name
      exercises,
    });

    return { message: "Sample template created", id: templateId };
  },
});

/**
 * Seed example user program (for testing)
 * Requires a test user and sports to be seeded first
 * 
 * Creates:
 * 1. An intake_responses record
 * 2. A user_programs record
 * 3. A user_progress record
 */
export const seedExampleUserProgram = mutation({
  args: { 
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the sport for Soccer
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", EXAMPLE_INTAKE.sportName))
      .first();

    if (!sport) {
      throw new Error(`Sport not found: ${EXAMPLE_INTAKE.sportName}. Run seedSports first.`);
    }

    // Check if user already has a program
    const existingProgram = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingProgram) {
      return { 
        message: "User already has a program", 
        programId: existingProgram._id,
        skipped: true,
      };
    }

    const now = Date.now();

    // 1. Create intake_responses record
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: args.userId,
      sportId: sport._id,
      yearsOfExperience: EXAMPLE_INTAKE.yearsOfExperience,
      preferredTrainingDaysPerWeek: EXAMPLE_INTAKE.preferredTrainingDaysPerWeek,
      weeksUntilSeason: EXAMPLE_INTAKE.weeksUntilSeason,
      assignedGppCategoryId: EXAMPLE_INTAKE.assignedGppCategoryId,
      assignedSkillLevel: EXAMPLE_INTAKE.assignedSkillLevel,
      intakeType: EXAMPLE_INTAKE.intakeType,
      completedAt: now,
    });

    // 2. Create user_programs record
    const programId = await ctx.db.insert("user_programs", {
      userId: args.userId,
      intakeResponseId,
      gppCategoryId: EXAMPLE_INTAKE.assignedGppCategoryId,
      skillLevel: EXAMPLE_INTAKE.assignedSkillLevel,
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Create user_progress record (starting fresh)
    const progressId = await ctx.db.insert("user_progress", {
      userId: args.userId,
      userProgramId: programId,
      daysCompleted: 0,
      weeksCompleted: 0,
      blocksCompleted: 0,
      uniqueExercisesPerformed: [],
      totalExercisesInCategory: EXERCISES.length, // Will be refined later
      averageWorkoutsPerWeek: 0,
      currentStreak: 0,
      longestStreak: 0,
      updatedAt: now,
    });

    // 4. Mark intake complete on user
    await ctx.db.patch(args.userId, {
      intakeCompletedAt: now,
    });

    return { 
      message: "Example user program created",
      intakeResponseId,
      programId,
      progressId,
      skipped: false,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get exercise ID by slug (utility for template creation)
 */
export const getExerciseIdBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return exercise?._id ?? null;
  },
});

/**
 * Get all exercise slugs (for reference when creating templates)
 */
export const getAllExerciseSlugs = query({
  args: {},
  handler: async (ctx) => {
    const exercises = await ctx.db.query("exercises").collect();
    return exercises.map((e) => ({ slug: e.slug, name: e.name, id: e._id }));
  },
});

/**
 * Get seed status (for development - check what's seeded)
 */
export const getSeedStatus = query({
  args: {},
  handler: async (ctx) => {
    const [categories, sports, exercises, templates, programs, intakes, progress] = await Promise.all([
      ctx.db.query("gpp_categories").collect(),
      ctx.db.query("sports").collect(),
      ctx.db.query("exercises").collect(),
      ctx.db.query("program_templates").collect(),
      ctx.db.query("user_programs").collect(),
      ctx.db.query("intake_responses").collect(),
      ctx.db.query("user_progress").collect(),
    ]);

    return {
      gpp_categories: categories.length,
      sports: sports.length,
      exercises: exercises.length,
      program_templates: templates.length,
      user_programs: programs.length,
      intake_responses: intakes.length,
      user_progress: progress.length,
      ready: categories.length > 0 && sports.length > 0 && exercises.length > 0,
    };
  },
});

/**
 * Clear all GPP data (USE WITH CAUTION - for development only)
 */
export const clearAllData = mutation({
  args: { confirmClear: v.boolean() },
  handler: async (ctx, args) => {
    if (!args.confirmClear) {
      throw new Error("Must confirm clear by passing confirmClear: true");
    }

    const tables = [
      "gpp_categories",
      "sports",
      "exercises",
      "program_templates",
      "user_programs",
      "intake_responses",
      "user_progress",
      "gpp_workout_sessions",
    ] as const;

    const results: Record<string, number> = {};

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      results[table] = docs.length;
    }

    // Reset intakeCompletedAt on all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      if (user.intakeCompletedAt) {
        await ctx.db.patch(user._id, { intakeCompletedAt: undefined });
      }
    }
    results["users_reset"] = users.filter((u) => u.intakeCompletedAt).length;

    return {
      message: "All GPP data cleared",
      deleted: results,
    };
  },
});
