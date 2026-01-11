import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Exercise Library Queries & Mutations
 *
 * Exercises are static reference data - typically seeded once and rarely modified.
 * These functions support both querying for workout display and seeding.
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a user is a trainer.
 * Uses role field if set (backwards compatibility), otherwise checks relationships.
 * Also checks for pending invitations to support new trainers (bootstrapping).
 */
async function isTrainer(ctx: any, userId: Id<"users">): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  // Check deprecated role field first for backwards compatibility
  if (user.role === "trainer") return true;

  // Check if user has any active athlete relationships (makes them a trainer)
  const hasAthletes = await ctx.db
    .query("trainer_athlete_relationships")
    .withIndex("by_trainer_status", (q: any) =>
      q.eq("trainerId", userId).eq("status", "active")
    )
    .first();

  if (hasAthletes) return true;

  // Check if user has any pending invitations (trainer bootstrapping)
  const hasPendingInvitations = await ctx.db
    .query("trainer_invitations")
    .withIndex("by_trainer_status", (q: any) =>
      q.eq("trainerId", userId).eq("status", "pending")
    )
    .first();

  return !!hasPendingInvitations;
}

/**
 * Validate and clean array values (tags, equipment)
 * Removes empty strings, trims whitespace, removes duplicates
 */
function validateStringArray(arr: string[], fieldName: string): string[] {
  const cleaned = arr
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Remove duplicates
  const unique = [...new Set(cleaned)];

  if (unique.length === 0 && arr.length > 0) {
    throw new Error(`${fieldName} cannot contain only empty values`);
  }

  return unique;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all exercises in the library
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("exercises").collect();
  },
});

/**
 * Get exercise by ID
 */
export const getById = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.exerciseId);
  },
});

/**
 * Get exercise by slug (stable identifier)
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Get multiple exercises by IDs (for loading workout blocks)
 */
export const getByIds = query({
  args: { exerciseIds: v.array(v.id("exercises")) },
  handler: async (ctx, args) => {
    const exercises = await Promise.all(
      args.exerciseIds.map((id) => ctx.db.get(id))
    );
    return exercises.filter(Boolean);
  },
});

/**
 * Search exercises by tag
 */
export const getByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const allExercises = await ctx.db.query("exercises").collect();
    return allExercises.filter((ex) => ex.tags.includes(args.tag));
  },
});

/**
 * Get exercises by multiple tags (AND logic)
 */
export const getByTags = query({
  args: { tags: v.array(v.string()) },
  handler: async (ctx, args) => {
    const allExercises = await ctx.db.query("exercises").collect();
    return allExercises.filter((ex) =>
      args.tags.every((tag) => ex.tags.includes(tag))
    );
  },
});

/**
 * Get unique tags from all exercises (for filter UI)
 */
export const getAllTags = query({
  args: {},
  handler: async (ctx) => {
    const exercises = await ctx.db.query("exercises").collect();
    const tagSet = new Set<string>();
    exercises.forEach((ex) => ex.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS (For seeding and admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new exercise (for seeding)
 */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    cues: v.optional(v.array(v.string())),
    tags: v.array(v.string()),
    equipment: v.optional(v.array(v.string())),
    difficulty: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Check if exercise with this slug already exists
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new Error(`Exercise with slug "${args.slug}" already exists`);
    }

    return await ctx.db.insert("exercises", args);
  },
});

/**
 * Upsert exercise by slug (for seeding - creates or updates)
 */
export const upsertBySlug = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    cues: v.optional(v.array(v.string())),
    tags: v.array(v.string()),
    equipment: v.optional(v.array(v.string())),
    difficulty: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }

    return await ctx.db.insert("exercises", args);
  },
});

/**
 * Create exercise as trainer (trainer-only)
 * Trainers can add new exercises to the shared library
 */
export const createAsTrainer = mutation({
  args: {
    trainerId: v.id("users"),
    name: v.string(),
    instructions: v.optional(v.string()),
    tags: v.array(v.string()),
    equipment: v.optional(v.array(v.string())),
    difficulty: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
    progressions: v.optional(v.object({
      easier: v.optional(v.string()),
      harder: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Verify trainer status using relationship check
    const trainerStatus = await isTrainer(ctx, args.trainerId);
    if (!trainerStatus) {
      throw new Error("Only trainers can create exercises");
    }

    // Validate name
    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Exercise name cannot be empty");
    }
    if (trimmedName.length > 200) {
      throw new Error("Exercise name is too long (max 200 characters)");
    }

    // Validate and clean tags
    const validatedTags = validateStringArray(args.tags, "Tags");
    if (validatedTags.length === 0) {
      throw new Error("At least one tag is required");
    }

    // Validate and clean equipment (if provided)
    const validatedEquipment = args.equipment
      ? validateStringArray(args.equipment, "Equipment")
      : undefined;

    // Generate slug from name
    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    // Check if exercise with this slug already exists
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error(`An exercise with a similar name already exists`);
    }

    const exerciseId = await ctx.db.insert("exercises", {
      name: trimmedName,
      slug,
      instructions: args.instructions?.trim(),
      tags: validatedTags,
      equipment: validatedEquipment,
      difficulty: args.difficulty,
      progressions: args.progressions,
    });

    return { exerciseId, slug };
  },
});

/**
 * Search exercises with filters
 */
export const search = query({
  args: {
    query: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    difficulty: v.optional(
      v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("advanced")
      )
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let exercises = await ctx.db.query("exercises").collect();

    // Filter by search query
    if (args.query) {
      const searchQuery = args.query.toLowerCase();
      exercises = exercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(searchQuery) ||
          ex.slug.toLowerCase().includes(searchQuery) ||
          ex.tags.some((tag) => tag.toLowerCase().includes(searchQuery)) ||
          ex.instructions?.toLowerCase().includes(searchQuery)
      );
    }

    // Filter by tags (OR logic for flexibility)
    if (args.tags && args.tags.length > 0) {
      exercises = exercises.filter((ex) =>
        args.tags!.some((tag) => ex.tags.includes(tag))
      );
    }

    // Filter by difficulty
    if (args.difficulty) {
      exercises = exercises.filter((ex) => ex.difficulty === args.difficulty);
    }

    const total = exercises.length;

    // Apply pagination
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 50;
    exercises = exercises.slice(offset, offset + limit);

    return {
      exercises,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Bulk insert exercises (for initial seeding)
 */
export const bulkInsert = mutation({
  args: {
    exercises: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
        videoUrl: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        instructions: v.optional(v.string()),
        cues: v.optional(v.array(v.string())),
        tags: v.array(v.string()),
        equipment: v.optional(v.array(v.string())),
        difficulty: v.optional(
          v.union(
            v.literal("beginner"),
            v.literal("intermediate"),
            v.literal("advanced")
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.exercises.map(async (exercise) => {
        const existing = await ctx.db
          .query("exercises")
          .withIndex("by_slug", (q) => q.eq("slug", exercise.slug))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, exercise);
          return { slug: exercise.slug, id: existing._id, action: "updated" };
        }

        const id = await ctx.db.insert("exercises", exercise);
        return { slug: exercise.slug, id, action: "created" };
      })
    );

    return results;
  },
});

