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
