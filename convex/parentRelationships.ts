import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Parent-Athlete Relationships - Link/Unlink and Queries
 *
 * Manages the bidirectional relationships between parents and athletes:
 * - Parents can view their linked athletes
 * - Athletes can view their linked parents
 * - Either party can remove the link
 */

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all athletes linked to the current parent
 */
export const getLinkedAthletes = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.userRole !== "parent") return null;

    // Get active relationships
    const relationships = await ctx.db
      .query("parent_athlete_relationships")
      .withIndex("by_parent_status", (q) =>
        q.eq("parentUserId", user._id).eq("status", "active")
      )
      .collect();

    // Fetch athlete details
    const athletes = await Promise.all(
      relationships.map(async (rel) => {
        const athlete = await ctx.db.get(rel.athleteUserId);
        if (!athlete) return null;

        // Get athlete's program if they have one
        const program = await ctx.db
          .query("user_programs")
          .withIndex("by_user", (q) => q.eq("userId", rel.athleteUserId))
          .first();

        // Get their primary sport
        const primarySport = athlete.primarySportId
          ? await ctx.db.get(athlete.primarySportId)
          : null;

        return {
          _id: athlete._id,
          name: athlete.name,
          email: athlete.email,
          relationshipId: rel._id,
          relationshipType: rel.relationshipType,
          permissions: rel.permissions,
          linkedAt: rel.createdAt,
          // Program info
          hasProgram: !!program,
          currentPhase: program?.currentPhase,
          currentWeek: program?.currentWeek,
          primarySport: primarySport?.name,
          // Intake status
          hasCompletedIntake: !!athlete.intakeCompletedAt,
        };
      })
    );

    return athletes.filter(Boolean);
  },
});

/**
 * Get all parents linked to the current athlete
 */
export const getLinkedParents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Athletes (or clients for legacy) can have linked parents
    const isAthlete = user.userRole === "athlete" || user.role === "client" || !user.userRole;
    if (!isAthlete) return null;

    // Get active relationships
    const relationships = await ctx.db
      .query("parent_athlete_relationships")
      .withIndex("by_athlete_status", (q) =>
        q.eq("athleteUserId", user._id).eq("status", "active")
      )
      .collect();

    // Fetch parent details
    const parents = await Promise.all(
      relationships.map(async (rel) => {
        const parent = await ctx.db.get(rel.parentUserId);
        if (!parent) return null;

        return {
          _id: parent._id,
          name: parent.name,
          email: parent.email,
          relationshipId: rel._id,
          relationshipType: rel.relationshipType,
          linkedAt: rel.createdAt,
        };
      })
    );

    return parents.filter(Boolean);
  },
});

/**
 * Get a specific athlete's details (for parent viewing)
 */
export const getAthleteDetails = query({
  args: { athleteId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.userRole !== "parent") return null;

    // Verify relationship exists
    const relationship = await ctx.db
      .query("parent_athlete_relationships")
      .withIndex("by_parent", (q) => q.eq("parentUserId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("athleteUserId"), args.athleteId),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!relationship) {
      return null; // Not authorized to view this athlete
    }

    const athlete = await ctx.db.get(args.athleteId);
    if (!athlete) return null;

    // Get athlete's program
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteId))
      .first();

    // Get their sports
    const athleteSports = await ctx.db
      .query("athlete_sports")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteId))
      .collect();

    const sportsWithDetails = await Promise.all(
      athleteSports.map(async (as) => {
        const sport = await ctx.db.get(as.sportId);
        return {
          ...as,
          sportName: sport?.name,
        };
      })
    );

    return {
      _id: athlete._id,
      name: athlete.name,
      email: athlete.email,
      createdAt: athlete.createdAt,
      intakeCompletedAt: athlete.intakeCompletedAt,
      program: program
        ? {
            currentPhase: program.currentPhase,
            currentWeek: program.currentWeek,
            currentDay: program.currentDay,
            skillLevel: program.skillLevel,
            gppCategoryId: program.gppCategoryId,
          }
        : null,
      sports: sportsWithDetails,
      relationship: {
        _id: relationship._id,
        type: relationship.relationshipType,
        permissions: relationship.permissions,
        linkedAt: relationship.createdAt,
      },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove a parent-athlete relationship
 * Can be called by either the parent or the athlete
 */
export const unlinkRelationship = mutation({
  args: {
    relationshipId: v.id("parent_athlete_relationships"),
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

    const relationship = await ctx.db.get(args.relationshipId);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Verify user is part of this relationship
    const isParent = relationship.parentUserId === user._id;
    const isAthlete = relationship.athleteUserId === user._id;

    if (!isParent && !isAthlete) {
      throw new Error("You are not part of this relationship");
    }

    // Mark relationship as removed (soft delete)
    await ctx.db.patch(args.relationshipId, {
      status: "removed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update relationship permissions (parent only)
 */
export const updatePermissions = mutation({
  args: {
    relationshipId: v.id("parent_athlete_relationships"),
    permissions: v.union(v.literal("full"), v.literal("view_only")),
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

    const relationship = await ctx.db.get(args.relationshipId);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Only the parent can update permissions
    if (relationship.parentUserId !== user._id) {
      throw new Error("Only parents can update permissions");
    }

    await ctx.db.patch(args.relationshipId, {
      permissions: args.permissions,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
