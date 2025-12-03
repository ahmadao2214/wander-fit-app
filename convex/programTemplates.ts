import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Program Templates - The Logic Engine
 * 
 * Templates define the exact workout prescription for each combination of:
 * - GPP Category (1-4)
 * - Phase (GPP, SPP, SSP)
 * - Skill Level (Novice, Moderate, Advanced)
 * - Week (1-4)
 * - Day (1-7, though rest days have no template)
 * 
 * HYBRID MODEL: Athletes can VIEW all templates in unlocked phases,
 * but can only INPUT data on their scheduled workout of the day.
 * 
 * Max possible: 4 × 3 × 3 × 4 × 7 = 1008 (but rest days reduce this)
 * Practical estimate: ~432 templates (assuming 3 workout days per week)
 */

// Shared validators
const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

const skillLevelValidator = v.union(
  v.literal("Novice"),
  v.literal("Moderate"),
  v.literal("Advanced")
);

// Exercise prescription validator
const exercisePrescriptionValidator = v.object({
  exerciseId: v.id("exercises"),
  sets: v.number(),
  reps: v.string(), // "10-12", "5", "AMRAP", "30s"
  tempo: v.optional(v.string()), // "3010", "X010"
  restSeconds: v.number(), // Seconds between sets
  notes: v.optional(v.string()),
  orderIndex: v.number(),
  superset: v.optional(v.string()), // "A", "B"
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a workout template by coordinates
 * Returns template with exercise details populated
 */
export const getWorkout = query({
  args: {
    gppCategoryId: v.number(),
    phase: phaseValidator,
    skillLevel: skillLevelValidator,
    week: v.number(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", args.gppCategoryId)
          .eq("phase", args.phase)
          .eq("skillLevel", args.skillLevel)
          .eq("week", args.week)
          .eq("day", args.day)
      )
      .first();

    if (!template) {
      return null;
    }

    // Fetch exercise details for each prescription
    const exerciseIds = template.exercises.map((e) => e.exerciseId);
    const exercises = await Promise.all(
      exerciseIds.map((id) => ctx.db.get(id))
    );

    const exerciseMap = new Map(
      exercises.filter(Boolean).map((ex) => [ex!._id, ex!])
    );

    // Return template with exercise details inline
    return {
      ...template,
      exercises: template.exercises.map((prescription) => ({
        ...prescription,
        exercise: exerciseMap.get(prescription.exerciseId),
      })),
    };
  },
});

/**
 * Get template by ID
 */
export const getById = query({
  args: { templateId: v.id("program_templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

/**
 * Get template by ID with exercise details
 */
export const getByIdWithExercises = query({
  args: { templateId: v.id("program_templates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    const exerciseIds = template.exercises.map((e) => e.exerciseId);
    const exercises = await Promise.all(
      exerciseIds.map((id) => ctx.db.get(id))
    );

    const exerciseMap = new Map(
      exercises.filter(Boolean).map((ex) => [ex!._id, ex!])
    );

    return {
      ...template,
      exercises: template.exercises.map((prescription) => ({
        ...prescription,
        exercise: exerciseMap.get(prescription.exerciseId),
      })),
    };
  },
});

/**
 * Get all templates for a week (week overview)
 * 
 * HYBRID MODEL: Athletes can browse this to see upcoming workouts
 * in their training block, but can only input on scheduled day.
 */
export const getWeekOverview = query({
  args: {
    gppCategoryId: v.number(),
    phase: phaseValidator,
    skillLevel: skillLevelValidator,
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", args.gppCategoryId)
          .eq("phase", args.phase)
          .eq("skillLevel", args.skillLevel)
          .eq("week", args.week)
      )
      .collect();

    return templates.sort((a, b) => a.day - b.day);
  },
});

/**
 * Get all templates for a phase (phase overview)
 * 
 * HYBRID MODEL: Athletes can browse entire phase to plan ahead.
 * Only unlocked phases are accessible (GPP always, then SPP, then SSP).
 */
export const getPhaseOverview = query({
  args: {
    gppCategoryId: v.number(),
    phase: phaseValidator,
    skillLevel: skillLevelValidator,
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", args.gppCategoryId).eq("phase", args.phase)
      )
      .collect();

    // Filter by skill level and organize by week
    const filtered = templates.filter((t) => t.skillLevel === args.skillLevel);

    const byWeek = new Map<number, typeof filtered>();
    filtered.forEach((t) => {
      const week = byWeek.get(t.week) || [];
      week.push(t);
      byWeek.set(t.week, week);
    });

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, workouts]) => ({
        week,
        workouts: workouts.sort((a, b) => a.day - b.day),
      }));
  },
});

/**
 * Check if a template exists for given coordinates
 * Used to determine if a day is a workout day or rest day
 */
export const exists = query({
  args: {
    gppCategoryId: v.number(),
    phase: phaseValidator,
    skillLevel: skillLevelValidator,
    week: v.number(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", args.gppCategoryId)
          .eq("phase", args.phase)
          .eq("skillLevel", args.skillLevel)
          .eq("week", args.week)
          .eq("day", args.day)
      )
      .first();

    return template !== null;
  },
});

/**
 * Get template count
 */
export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("program_templates").collect();
    return templates.length;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS (For seeding templates)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a program template
 */
export const create = mutation({
  args: {
    gppCategoryId: v.number(),
    phase: phaseValidator,
    skillLevel: skillLevelValidator,
    week: v.number(),
    day: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDurationMinutes: v.number(), // Duration in minutes
    exercises: v.array(exercisePrescriptionValidator),
  },
  handler: async (ctx, args) => {
    // Check if template already exists for this coordinate
    const existing = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", args.gppCategoryId)
          .eq("phase", args.phase)
          .eq("skillLevel", args.skillLevel)
          .eq("week", args.week)
          .eq("day", args.day)
      )
      .first();

    if (existing) {
      throw new Error(
        `Template already exists for Category ${args.gppCategoryId}, ${args.phase}, ${args.skillLevel}, Week ${args.week}, Day ${args.day}`
      );
    }

    return await ctx.db.insert("program_templates", args);
  },
});

/**
 * Upsert a program template (for seeding - creates or updates)
 */
export const upsert = mutation({
  args: {
    gppCategoryId: v.number(),
    phase: phaseValidator,
    skillLevel: skillLevelValidator,
    week: v.number(),
    day: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    estimatedDurationMinutes: v.number(), // Duration in minutes
    exercises: v.array(exercisePrescriptionValidator),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", args.gppCategoryId)
          .eq("phase", args.phase)
          .eq("skillLevel", args.skillLevel)
          .eq("week", args.week)
          .eq("day", args.day)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("program_templates", args);
    return { id, action: "created" as const };
  },
});

/**
 * Delete a template (for cleanup during development)
 */
export const remove = mutation({
  args: { templateId: v.id("program_templates") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});
