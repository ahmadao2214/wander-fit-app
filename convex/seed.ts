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
 * Seed templates for all skill levels (for Week 1, Days 1-3)
 * This ensures athletes of any skill level have workouts available
 */
export const seedAllSkillLevelTemplates = mutation({
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

    const results: { created: number; skipped: number } = { created: 0, skipped: 0 };
    const skillLevels = ["Novice", "Moderate", "Advanced"] as const;
    const gppCategories = [1, 2, 3, 4]; // All 4 GPP categories

    // Base exercises for lower body day (warmup + main + cooldown)
    const lowerBodyExercises = [
      { slug: "cat_cow", sets: 1, reps: "10", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
      { slug: "worlds_greatest_stretch", sets: 1, reps: "5 each side", restSeconds: 0, orderIndex: 1 },
    ];

    // Skill-level specific exercises
    const lowerBodyBySkill = {
      Novice: [
        { slug: "goblet_squat", sets: 3, reps: "12-15", tempo: "3010", restSeconds: 60, orderIndex: 2 },
        { slug: "romanian_deadlift", sets: 3, reps: "10-12", tempo: "3010", restSeconds: 60, orderIndex: 3 },
        { slug: "reverse_lunge", sets: 2, reps: "10 each", restSeconds: 45, orderIndex: 4 },
        { slug: "plank", sets: 3, reps: "30s", restSeconds: 30, orderIndex: 5 },
      ],
      Moderate: [
        { slug: "back_squat", sets: 4, reps: "8-10", tempo: "3010", restSeconds: 90, orderIndex: 2 },
        { slug: "romanian_deadlift", sets: 4, reps: "8-10", tempo: "3010", restSeconds: 75, orderIndex: 3 },
        { slug: "bulgarian_split_squat", sets: 3, reps: "8 each", restSeconds: 60, orderIndex: 4 },
        { slug: "pallof_press", sets: 3, reps: "10 each side", restSeconds: 45, orderIndex: 5 },
      ],
      Advanced: [
        { slug: "back_squat", sets: 5, reps: "5-6", tempo: "3010", restSeconds: 120, notes: "Heavy compound", orderIndex: 2 },
        { slug: "trap_bar_deadlift", sets: 4, reps: "6-8", tempo: "2010", restSeconds: 120, orderIndex: 3 },
        { slug: "bulgarian_split_squat", sets: 4, reps: "6 each", restSeconds: 75, orderIndex: 4 },
        { slug: "single_leg_rdl", sets: 3, reps: "8 each", restSeconds: 60, orderIndex: 5 },
        { slug: "hanging_leg_raise", sets: 3, reps: "10-12", restSeconds: 45, orderIndex: 6 },
      ],
    };

    // Upper body exercises by skill level
    const upperBodyBySkill = {
      Novice: [
        { slug: "dead_bug", sets: 1, reps: "10 each side", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
        { slug: "push_up", sets: 3, reps: "10-15", restSeconds: 60, orderIndex: 1 },
        { slug: "inverted_row", sets: 3, reps: "10-12", restSeconds: 60, orderIndex: 2 },
        { slug: "db_shoulder_press", sets: 3, reps: "10-12", restSeconds: 60, orderIndex: 3 },
        { slug: "face_pull", sets: 2, reps: "15", restSeconds: 45, orderIndex: 4 },
      ],
      Moderate: [
        { slug: "bird_dog", sets: 1, reps: "8 each side", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
        { slug: "db_bench_press", sets: 4, reps: "8-10", restSeconds: 75, orderIndex: 1 },
        { slug: "db_row", sets: 4, reps: "8-10 each", restSeconds: 60, orderIndex: 2 },
        { slug: "overhead_press", sets: 3, reps: "8-10", restSeconds: 75, orderIndex: 3 },
        { slug: "pull_up", sets: 3, reps: "AMRAP", restSeconds: 90, orderIndex: 4 },
        { slug: "face_pull", sets: 3, reps: "12-15", restSeconds: 45, orderIndex: 5 },
      ],
      Advanced: [
        { slug: "thoracic_rotation", sets: 1, reps: "8 each side", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
        { slug: "db_bench_press", sets: 5, reps: "5-6", restSeconds: 120, orderIndex: 1 },
        { slug: "pull_up", sets: 5, reps: "5-8", restSeconds: 90, orderIndex: 2 },
        { slug: "overhead_press", sets: 4, reps: "6-8", restSeconds: 90, orderIndex: 3 },
        { slug: "db_row", sets: 4, reps: "6-8 each", restSeconds: 75, orderIndex: 4 },
        { slug: "incline_db_press", sets: 3, reps: "8-10", restSeconds: 60, orderIndex: 5 },
        { slug: "face_pull", sets: 3, reps: "12-15", restSeconds: 45, orderIndex: 6 },
      ],
    };

    // Power/conditioning day by skill level
    const powerBySkill = {
      Novice: [
        { slug: "cat_cow", sets: 1, reps: "10", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
        { slug: "broad_jump", sets: 3, reps: "5", restSeconds: 60, notes: "Focus on landing", orderIndex: 1 },
        { slug: "kettlebell_swing", sets: 3, reps: "12-15", restSeconds: 60, orderIndex: 2 },
        { slug: "med_ball_slam", sets: 3, reps: "8", restSeconds: 45, orderIndex: 3 },
        { slug: "lateral_lunge", sets: 2, reps: "8 each", restSeconds: 45, orderIndex: 4 },
      ],
      Moderate: [
        { slug: "bird_dog", sets: 1, reps: "8 each side", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
        { slug: "box_jump", sets: 4, reps: "5", restSeconds: 75, orderIndex: 1 },
        { slug: "kettlebell_swing", sets: 4, reps: "15", restSeconds: 60, orderIndex: 2 },
        { slug: "med_ball_rotational_throw", sets: 3, reps: "8 each side", restSeconds: 60, orderIndex: 3 },
        { slug: "skater_jump", sets: 3, reps: "10 each", restSeconds: 45, orderIndex: 4 },
      ],
      Advanced: [
        { slug: "worlds_greatest_stretch", sets: 1, reps: "5 each side", restSeconds: 0, notes: "Warmup", orderIndex: 0 },
        { slug: "depth_jump", sets: 4, reps: "4", restSeconds: 120, notes: "Maximal reactive power", orderIndex: 1 },
        { slug: "box_jump", sets: 4, reps: "5", restSeconds: 90, orderIndex: 2 },
        { slug: "med_ball_rotational_throw", sets: 4, reps: "6 each side", restSeconds: 75, orderIndex: 3 },
        { slug: "kettlebell_swing", sets: 4, reps: "12", restSeconds: 60, orderIndex: 4 },
        { slug: "cable_woodchop", sets: 3, reps: "10 each side", restSeconds: 45, orderIndex: 5 },
      ],
    };

    const cooldownExercise = { slug: "90_90_hip_stretch", sets: 1, reps: "30s each side", restSeconds: 0, notes: "Cooldown" };

    // Create templates for all combinations
    for (const categoryId of gppCategories) {
      for (const skillLevel of skillLevels) {
        // Day 1: Lower Body
        const day1Exercises = [
          ...lowerBodyExercises,
          ...lowerBodyBySkill[skillLevel],
          { ...cooldownExercise, orderIndex: lowerBodyBySkill[skillLevel].length + 2 },
        ];

        const day1ExercisesWithIds = await Promise.all(
          day1Exercises.map(async (e) => ({
            exerciseId: await getExerciseId(e.slug),
            sets: e.sets,
            reps: e.reps,
            tempo: "tempo" in e ? e.tempo : undefined,
            restSeconds: e.restSeconds,
            notes: "notes" in e ? e.notes : undefined,
            orderIndex: e.orderIndex,
          }))
        );

        // Check and create Day 1
        const existingDay1 = await ctx.db
          .query("program_templates")
          .withIndex("by_assignment", (q) =>
            q.eq("gppCategoryId", categoryId).eq("phase", "GPP").eq("skillLevel", skillLevel).eq("week", 1).eq("day", 1)
          )
          .first();

        if (!existingDay1) {
          await ctx.db.insert("program_templates", {
            gppCategoryId: categoryId,
            phase: "GPP",
            skillLevel,
            week: 1,
            day: 1,
            name: `Lower Body ${skillLevel === "Novice" ? "Foundation" : skillLevel === "Moderate" ? "Development" : "Strength"} - Day 1`,
            description: skillLevel === "Novice" 
              ? "Introduction to fundamental lower body movement patterns."
              : skillLevel === "Moderate"
              ? "Building lower body strength with progressive loading."
              : "High-intensity lower body training for advanced athletes.",
            estimatedDurationMinutes: skillLevel === "Novice" ? 40 : skillLevel === "Moderate" ? 50 : 60,
            exercises: day1ExercisesWithIds,
          });
          results.created++;
        } else {
          results.skipped++;
        }

        // Day 2: Upper Body
        const day2Exercises = upperBodyBySkill[skillLevel];
        const day2ExercisesWithIds = await Promise.all(
          day2Exercises.map(async (e) => ({
            exerciseId: await getExerciseId(e.slug),
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            notes: "notes" in e ? e.notes : undefined,
            orderIndex: e.orderIndex,
          }))
        );

        const existingDay2 = await ctx.db
          .query("program_templates")
          .withIndex("by_assignment", (q) =>
            q.eq("gppCategoryId", categoryId).eq("phase", "GPP").eq("skillLevel", skillLevel).eq("week", 1).eq("day", 2)
          )
          .first();

        if (!existingDay2) {
          await ctx.db.insert("program_templates", {
            gppCategoryId: categoryId,
            phase: "GPP",
            skillLevel,
            week: 1,
            day: 2,
            name: `Upper Body ${skillLevel === "Novice" ? "Foundation" : skillLevel === "Moderate" ? "Development" : "Strength"} - Day 2`,
            description: skillLevel === "Novice"
              ? "Building upper body pushing and pulling patterns."
              : skillLevel === "Moderate"
              ? "Progressive upper body strength development."
              : "High-volume upper body training for advanced athletes.",
            estimatedDurationMinutes: skillLevel === "Novice" ? 35 : skillLevel === "Moderate" ? 45 : 55,
            exercises: day2ExercisesWithIds,
          });
          results.created++;
        } else {
          results.skipped++;
        }

        // Day 3: Power/Conditioning
        const day3Exercises = powerBySkill[skillLevel];
        const day3ExercisesWithIds = await Promise.all(
          day3Exercises.map(async (e) => ({
            exerciseId: await getExerciseId(e.slug),
            sets: e.sets,
            reps: e.reps,
            restSeconds: e.restSeconds,
            notes: "notes" in e ? e.notes : undefined,
            orderIndex: e.orderIndex,
          }))
        );

        const existingDay3 = await ctx.db
          .query("program_templates")
          .withIndex("by_assignment", (q) =>
            q.eq("gppCategoryId", categoryId).eq("phase", "GPP").eq("skillLevel", skillLevel).eq("week", 1).eq("day", 3)
          )
          .first();

        if (!existingDay3) {
          await ctx.db.insert("program_templates", {
            gppCategoryId: categoryId,
            phase: "GPP",
            skillLevel,
            week: 1,
            day: 3,
            name: `Power & Conditioning ${skillLevel === "Novice" ? "Intro" : skillLevel === "Moderate" ? "Development" : "Advanced"} - Day 3`,
            description: skillLevel === "Novice"
              ? "Introduction to explosive movements and conditioning."
              : skillLevel === "Moderate"
              ? "Building power and work capacity."
              : "High-intensity power and reactive training.",
            estimatedDurationMinutes: skillLevel === "Novice" ? 35 : skillLevel === "Moderate" ? 45 : 50,
            exercises: day3ExercisesWithIds,
          });
          results.created++;
        } else {
          results.skipped++;
        }
      }
    }

    return {
      message: "Templates seeded for all skill levels",
      ...results,
      details: `Created templates for ${gppCategories.length} categories × ${skillLevels.length} skill levels × 3 days = ${gppCategories.length * skillLevels.length * 3} templates`,
    };
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
