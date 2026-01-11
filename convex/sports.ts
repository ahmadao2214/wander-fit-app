import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sports & GPP Categories
 * 
 * Maps user's sport selection to a GPP Category (1-4) during intake.
 * Also provides GPP category metadata for UI display.
 * 
 * RESEARCH CONSIDERATION: Sports can map to multiple GPP categories based on position.
 * Example: Football could be Category 2 (Explosive - Linebacker) or Category 3 (Rotational - QB)
 * This is captured as an open question for future iteration.
 */

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all sports (for intake sport selection screen)
 * Sorted alphabetically by name
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const sports = await ctx.db.query("sports").collect();
    return sports.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get sport by ID
 */
export const getById = query({
  args: { sportId: v.id("sports") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sportId);
  },
});

/**
 * Get sport by name
 */
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Get all sports in a specific GPP category
 */
export const getByCategory = query({
  args: { gppCategoryId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sports")
      .withIndex("by_category", (q) => q.eq("gppCategoryId", args.gppCategoryId))
      .collect();
  },
});

/**
 * Get all GPP categories with their metadata
 */
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("gpp_categories").collect();
    return categories.sort((a, b) => a.categoryId - b.categoryId);
  },
});

/**
 * Get GPP category by ID
 */
export const getCategoryById = query({
  args: { categoryId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gpp_categories")
      .withIndex("by_category_id", (q) => q.eq("categoryId", args.categoryId))
      .first();
  },
});

/**
 * Get sports grouped by category (for intake UI)
 */
export const getSportsGroupedByCategory = query({
  args: {},
  handler: async (ctx) => {
    const [sports, categories] = await Promise.all([
      ctx.db.query("sports").collect(),
      ctx.db.query("gpp_categories").collect(),
    ]);

    const grouped = categories
      .sort((a, b) => a.categoryId - b.categoryId)
      .map((category) => ({
        category,
        sports: sports
          .filter((s) => s.gppCategoryId === category.categoryId)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));

    return grouped;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS (For seeding)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new sport
 */
export const createSport = mutation({
  args: {
    name: v.string(),
    gppCategoryId: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Sport "${args.name}" already exists`);
    }

    return await ctx.db.insert("sports", args);
  },
});

/**
 * Create a GPP category
 */
export const createCategory = mutation({
  args: {
    categoryId: v.number(),
    name: v.string(),
    shortName: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("gpp_categories")
      .withIndex("by_category_id", (q) => q.eq("categoryId", args.categoryId))
      .first();

    if (existing) {
      throw new Error(`Category ${args.categoryId} already exists`);
    }

    return await ctx.db.insert("gpp_categories", args);
  },
});

/**
 * Bulk seed sports and categories
 */
export const seedSportsAndCategories = mutation({
  args: {
    categories: v.array(
      v.object({
        categoryId: v.number(),
        name: v.string(),
        shortName: v.string(),
        description: v.string(),
        tags: v.array(v.string()),
      })
    ),
    sports: v.array(
      v.object({
        name: v.string(),
        gppCategoryId: v.number(),
        description: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = {
      categories: { created: 0, skipped: 0 },
      sports: { created: 0, skipped: 0 },
    };

    for (const category of args.categories) {
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

    for (const sport of args.sports) {
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

    return results;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SPORT BROWSER QUERIES (Preview Mode)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get athlete's sports (primary + additional) for browse filtering
 */
export const getAthleteSports = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Get athlete_sports records
    const athleteSports = await ctx.db
      .query("athlete_sports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Fetch sport details
    const sportsWithDetails = await Promise.all(
      athleteSports.map(async (as) => {
        const sport = await ctx.db.get(as.sportId);
        if (!sport) return null;

        const category = await ctx.db
          .query("gpp_categories")
          .withIndex("by_category_id", (q) => q.eq("categoryId", sport.gppCategoryId))
          .first();

        return {
          ...as,
          sport,
          category,
        };
      })
    );

    return sportsWithDetails.filter(Boolean);
  },
});

/**
 * Get browsable sports (sports the athlete is training for, excluding primary)
 * These are "preview mode" sports where athlete can see but not start workouts
 */
export const getBrowsableSports = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Get athlete's additional sports (not primary)
    const athleteSports = await ctx.db
      .query("athlete_sports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isPrimary"), false))
      .collect();

    // Fetch sport details with category info
    const sportsWithDetails = await Promise.all(
      athleteSports.map(async (as) => {
        const sport = await ctx.db.get(as.sportId);
        if (!sport) return null;

        const category = await ctx.db
          .query("gpp_categories")
          .withIndex("by_category_id", (q) => q.eq("categoryId", sport.gppCategoryId))
          .first();

        return {
          sportId: sport._id,
          sportName: sport.name,
          categoryId: sport.gppCategoryId,
          categoryName: category?.name ?? "Unknown",
          categoryShortName: category?.shortName ?? "?",
          description: sport.description,
        };
      })
    );

    return sportsWithDetails.filter(Boolean);
  },
});

/**
 * Get preview workouts for a browsable sport
 * Shows workout structure without allowing athlete to start them
 */
export const getPreviewWorkouts = query({
  args: {
    sportId: v.id("sports"),
    phase: v.optional(v.union(v.literal("GPP"), v.literal("SPP"), v.literal("SSP"))),
    week: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Verify user has this as an additional sport (not primary)
    const athleteSport = await ctx.db
      .query("athlete_sports")
      .withIndex("by_user_sport", (q) =>
        q.eq("userId", user._id).eq("sportId", args.sportId)
      )
      .first();

    if (!athleteSport) {
      return { error: "Sport not in your training list", workouts: [] };
    }

    if (athleteSport.isPrimary) {
      return { error: "Use your main program for primary sport", workouts: [] };
    }

    // Get the sport's GPP category
    const sport = await ctx.db.get(args.sportId);
    if (!sport) {
      return { error: "Sport not found", workouts: [] };
    }

    // Get gpp_category document ID
    const category = await ctx.db
      .query("gpp_categories")
      .withIndex("by_category_id", (q) => q.eq("categoryId", sport.gppCategoryId))
      .first();

    if (!category) {
      return { error: "Category not found", workouts: [] };
    }

    // Default to GPP phase week 1 if not specified
    const phase = args.phase ?? "GPP";
    const week = args.week ?? 1;

    // Get user's skill level from their program
    const userProgram = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const skillLevel = userProgram?.skillLevel ?? "beginner";

    // Fetch templates for preview
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", category._id)
          .eq("phase", phase)
          .eq("skillLevel", skillLevel)
          .eq("week", week)
      )
      .collect();

    // Get exercises for each template (limited preview)
    const workoutsPreview = await Promise.all(
      templates.map(async (template) => {
        // Only get first 3 exercises for preview
        const exercisePreviews = await Promise.all(
          template.exercises.slice(0, 3).map(async (ex: any) => {
            const exercise = await ctx.db.get(ex.exerciseId);
            return {
              name: exercise?.name ?? "Unknown",
              sets: ex.sets,
              reps: ex.reps,
            };
          })
        );

        return {
          templateId: template._id,
          day: template.day,
          focus: template.focus,
          exerciseCount: template.exercises.length,
          exercisePreview: exercisePreviews,
          isPreviewOnly: true,
        };
      })
    );

    return {
      sportName: sport.name,
      categoryName: category.name,
      phase,
      week,
      skillLevel,
      workouts: workoutsPreview.sort((a, b) => a.day - b.day),
    };
  },
});
