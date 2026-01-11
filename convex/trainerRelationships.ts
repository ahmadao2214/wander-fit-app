import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the trainer for an athlete
 */
export const getAthleteTrainer = query({
  args: { athleteUserId: v.id("users") },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_athlete_status", (q) =>
        q.eq("athleteUserId", args.athleteUserId).eq("status", "active")
      )
      .first();

    if (!relationship) {
      return null;
    }

    const trainer = await ctx.db.get(relationship.trainerId);
    if (!trainer) {
      return null;
    }

    return {
      relationshipId: relationship._id,
      trainerId: trainer._id,
      trainerName: trainer.name,
      trainerEmail: trainer.email,
      linkedAt: relationship.createdAt,
    };
  },
});

/**
 * Get all athletes for a trainer
 * Optimized with batch queries to avoid N+1 performance issues
 */
export const getTrainerAthletes = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .collect();

    if (relationships.length === 0) {
      return [];
    }

    const athleteIds = relationships.map((r) => r.athleteUserId);

    // Batch fetch all athletes in parallel
    const athletePromises = athleteIds.map((id) => ctx.db.get(id));
    const athletes = await Promise.all(athletePromises);
    const athleteMap = new Map(
      athletes.filter(Boolean).map((a) => [a!._id, a])
    );

    // Batch fetch all programs in parallel
    const programPromises = athleteIds.map((id) =>
      ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .first()
    );
    const programs = await Promise.all(programPromises);
    const programMap = new Map(
      programs.map((p, i) => [athleteIds[i], p])
    );

    // Collect all intake IDs that need fetching
    const intakeIds = programs
      .filter((p) => p?.intakeResponseId)
      .map((p) => p!.intakeResponseId);

    // Batch fetch all intakes in parallel
    const intakePromises = intakeIds.map((id) => ctx.db.get(id));
    const intakes = await Promise.all(intakePromises);
    const intakeMap = new Map(
      intakes.filter(Boolean).map((i) => [i!._id, i])
    );

    // Collect all sport IDs that need fetching
    const sportIds = [...new Set(
      intakes.filter((i) => i?.sportId).map((i) => i!.sportId)
    )];

    // Batch fetch all sports in parallel
    const sportPromises = sportIds.map((id) => ctx.db.get(id));
    const sports = await Promise.all(sportPromises);
    const sportMap = new Map(
      sports.filter(Boolean).map((s) => [s!._id, s])
    );

    // Build result using pre-fetched data
    const result = relationships
      .map((rel) => {
        const athlete = athleteMap.get(rel.athleteUserId);
        if (!athlete) return null;

        const program = programMap.get(rel.athleteUserId);
        const intake = program ? intakeMap.get(program.intakeResponseId) : null;
        const sport = intake ? sportMap.get(intake.sportId) : null;

        return {
          relationshipId: rel._id,
          athleteUserId: athlete._id,
          athleteName: athlete.name,
          athleteEmail: athlete.email,
          linkedAt: rel.createdAt,
          hasProgram: !!program,
          currentPhase: program?.currentPhase ?? null,
          currentWeek: program?.currentWeek ?? null,
          currentDay: program?.currentDay ?? null,
          lastWorkoutDate: program?.lastWorkoutDate ?? null,
          sportName: sport?.name ?? null,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    return result;
  },
});

/**
 * Remove trainer-athlete relationship (either party can call)
 */
export const removeRelationship = mutation({
  args: {
    relationshipId: v.id("trainer_athlete_relationships"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db.get(args.relationshipId);

    if (!relationship) {
      throw new Error("Relationship not found");
    }

    if (relationship.status !== "active") {
      throw new Error("Relationship is not active");
    }

    // Verify the requesting user is either the trainer or the athlete
    if (
      relationship.trainerId !== args.requestingUserId &&
      relationship.athleteUserId !== args.requestingUserId
    ) {
      throw new Error("You can only remove your own relationships");
    }

    await ctx.db.patch(args.relationshipId, {
      status: "removed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check if a user has any active trainer relationship
 */
export const hasActiveTrainer = query({
  args: { athleteUserId: v.id("users") },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_athlete_status", (q) =>
        q.eq("athleteUserId", args.athleteUserId).eq("status", "active")
      )
      .first();

    return !!relationship;
  },
});

/**
 * Get athlete count for a trainer
 */
export const getAthleteCount = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    const relationships = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .collect();

    return relationships.length;
  },
});

/**
 * Get relationship between trainer and athlete
 */
export const getRelationship = query({
  args: {
    trainerId: v.id("users"),
    athleteUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Query by trainer and filter for the specific athlete
    const relationships = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .collect();

    return relationships.find((r) => r.athleteUserId === args.athleteUserId) ?? null;
  },
});
