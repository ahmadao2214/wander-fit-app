import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Completed set schema
const completedSetSchema = v.object({
  repsCompleted: v.optional(v.number()),
  durationCompleted: v.optional(v.number()),
  completed: v.boolean(),
  skipped: v.boolean(),
});

// Completed exercise schema
const completedExerciseSchema = v.object({
  exerciseId: v.string(),
  completed: v.boolean(),
  skipped: v.boolean(),
  notes: v.optional(v.string()),
  sets: v.array(completedSetSchema),
});

// Start a new workout session
export const startWorkoutSession = mutation({
  args: {
    workoutId: v.id("workouts"),
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

    // Only trainers are explicitly excluded from starting workout sessions
    if (user.role === "trainer") {
      throw new Error("Trainers cannot start workout sessions");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.clientId !== user._id) {
      throw new Error("You can only start your own workouts");
    }

    if (!workout.isActive) {
      throw new Error("Cannot start an inactive workout");
    }

    // Check if there's already an active session for this workout
    const existingSession = await ctx.db
      .query("workoutSessions")
      .withIndex("by_client_status", (q) => 
        q.eq("clientId", user._id).eq("status", "in_progress")
      )
      .first();

    if (existingSession) {
      throw new Error("You already have an active workout session");
    }

    // Initialize exercises structure based on workout
    const initialExercises = workout.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      completed: false,
      skipped: false,
      sets: Array(exercise.sets).fill(null).map(() => ({
        repsCompleted: undefined,
        durationCompleted: undefined,
        completed: false,
        skipped: false,
      })),
    }));

    const sessionId = await ctx.db.insert("workoutSessions", {
      workoutId: args.workoutId,
      clientId: user._id,
      startedAt: Date.now(),
      status: "in_progress",
      exercises: initialExercises,
    });

    return {
      sessionId,
      message: "Workout session started successfully",
    };
  },
});

// Update workout session progress
export const updateSessionProgress = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    exercises: v.array(completedExerciseSchema),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.clientId !== user._id) {
      throw new Error("You can only update your own sessions");
    }

    if (session.status !== "in_progress") {
      throw new Error("Cannot update a completed or abandoned session");
    }

    await ctx.db.patch(args.sessionId, {
      exercises: args.exercises,
    });

    return {
      message: "Session progress updated successfully",
    };
  },
});

// Complete workout session
export const completeWorkoutSession = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    exercises: v.array(completedExerciseSchema),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.clientId !== user._id) {
      throw new Error("You can only complete your own sessions");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const now = Date.now();
    const totalDuration = Math.round((now - session.startedAt) / 1000); // in seconds

    await ctx.db.patch(args.sessionId, {
      exercises: args.exercises,
      completedAt: now,
      totalDuration,
      status: "completed",
    });

    return {
      message: "Workout session completed successfully",
      totalDuration,
    };
  },
});

// Abandon workout session
export const abandonWorkoutSession = mutation({
  args: {
    sessionId: v.id("workoutSessions"),
    exercises: v.optional(v.array(completedExerciseSchema)),
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

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.clientId !== user._id) {
      throw new Error("You can only abandon your own sessions");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const updates: any = {
      status: "abandoned",
    };

    if (args.exercises) {
      updates.exercises = args.exercises;
    }

    await ctx.db.patch(args.sessionId, updates);

    return {
      message: "Workout session abandoned",
    };
  },
});

// Get current active session for user
export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
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

    // Only trainers are explicitly excluded - all other users (including undefined role) are athletes
    if (user.role === "trainer") {
      // Trainers don't have personal workout sessions, just return null
      return null;
    }

    const session = await ctx.db
      .query("workoutSessions")
      .withIndex("by_client_status", (q) => 
        q.eq("clientId", user._id).eq("status", "in_progress")
      )
      .first();

    if (!session) {
      return null;
    }

    // Enrich with workout details
    const workout = await ctx.db.get(session.workoutId);
    
    return {
      ...session,
      workout,
    };
  },
});

// Get session history for client
export const getSessionHistory = query({
  args: {
    limit: v.optional(v.number()),
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

    // Only trainers are explicitly excluded - return empty for them
    if (user.role === "trainer") {
      return [];
    }

    const limit = args.limit || 20;
    
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_client", (q) => q.eq("clientId", user._id))
      .order("desc")
      .take(limit);

    // Enrich with workout details
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const workout = await ctx.db.get(session.workoutId);
        return {
          ...session,
          workoutName: workout?.name || "Unknown Workout",
        };
      })
    );

    return enrichedSessions;
  },
});

/**
 * @deprecated Alias for getSessionHistory - kept for backward compatibility with old clients
 */
export const getHistory = getSessionHistory;

// Get client session history for trainer view
export const getClientSessionHistory = query({
  args: {
    clientId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trainer = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can view client session history");
    }

    // Verify client belongs to this trainer
    const relationship = await ctx.db
      .query("trainerClientRelationships")
      .filter((q) => 
        q.and(
          q.eq(q.field("trainerId"), trainer._id),
          q.eq(q.field("clientId"), args.clientId),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!relationship) {
      throw new Error("Client is not assigned to this trainer");
    }

    const limit = args.limit || 20;
    
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(limit);

    // Enrich with workout details
    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        const workout = await ctx.db.get(session.workoutId);
        return {
          ...session,
          workoutName: workout?.name || "Unknown Workout",
        };
      })
    );

    return enrichedSessions;
  },
});

// Get session by ID with full details
export const getSessionById = query({
  args: { sessionId: v.id("workoutSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const [workout, client] = await Promise.all([
      ctx.db.get(session.workoutId),
      ctx.db.get(session.clientId),
    ]);

    return {
      ...session,
      workout,
      clientName: client?.name || "Unknown Client",
    };
  },
});

// Get session analytics for trainer
export const getSessionAnalytics = query({
  args: {
    clientId: v.optional(v.id("users")),
    timeframe: v.optional(v.union(v.literal("week"), v.literal("month"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trainer = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can view session analytics");
    }

    // Get timeframe filter
    const timeframe = args.timeframe || "month";
    const now = Date.now();
    let startTime = 0;

    switch (timeframe) {
      case "week":
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startTime = 0;
        break;
    }

    // Get trainer's workouts
    const trainerWorkouts = await ctx.db
      .query("workouts")
      .withIndex("by_trainer", (q) => q.eq("trainerId", trainer._id))
      .collect();

    const workoutIds = trainerWorkouts.map(w => w._id);

    // Get sessions for trainer's workouts
    let sessions = await ctx.db.query("workoutSessions").collect();
    sessions = sessions.filter(s => 
      workoutIds.includes(s.workoutId) && 
      s.startedAt >= startTime &&
      (args.clientId ? s.clientId === args.clientId : true)
    );

    const completedSessions = sessions.filter(s => s.status === "completed");
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      abandonedSessions: sessions.filter(s => s.status === "abandoned").length,
      completionRate: sessions.length > 0 
        ? Math.round((completedSessions.length / sessions.length) * 100) 
        : 0,
      totalMinutes: Math.round(totalDuration / 60),
      averageSessionMinutes: completedSessions.length > 0 
        ? Math.round(totalDuration / completedSessions.length / 60) 
        : 0,
      timeframe,
    };
  },
});
