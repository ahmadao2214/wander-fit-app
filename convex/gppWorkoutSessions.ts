import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * GPP Workout Sessions - Execution Tracking
 * 
 * Tracks workout execution against program templates.
 * Athletes create sessions for their scheduled workout of the day.
 */

// Validators
const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

const sessionStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("abandoned")
);

const setCompletionValidator = v.object({
  repsCompleted: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  weight: v.optional(v.number()),
  rpe: v.optional(v.number()), // Rate of Perceived Exertion 1-10
  completed: v.boolean(),
  skipped: v.boolean(),
});

const exerciseCompletionValidator = v.object({
  exerciseId: v.id("exercises"),
  completed: v.boolean(),
  skipped: v.boolean(),
  notes: v.optional(v.string()),
  sets: v.array(setCompletionValidator),
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current in-progress session for the user
 * 
 * NOTE: This query is defensive and returns null on any error
 * to prevent client crashes when data is inconsistent.
 */
export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        return null;
      }

      const session = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", "in_progress")
        )
        .first();

      if (!session) {
        return null;
      }

      // Get the template for context (may be null if deleted)
      const template = await ctx.db.get(session.templateId);

      return {
        ...session,
        template,
      };
    } catch (error) {
      console.error("getCurrentSession error:", error);
      return null;
    }
  },
});

/**
 * Get the most recent session for a specific template
 * Used to check if today's workout has been completed
 * 
 * NOTE: This query is defensive and returns null on any error
 * to prevent client crashes when data is inconsistent or when
 * called with invalid parameters from older client builds.
 * 
 * The templateId is optional to allow old clients that might pass
 * undefined values to gracefully fail instead of throwing validation errors.
 */
export const getSessionForTemplate = query({
  args: { templateId: v.optional(v.id("program_templates")) },
  handler: async (ctx, args) => {
    try {
      // Early return if no templateId provided
      if (!args.templateId) {
        return null;
      }

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        return null;
      }

      // Get the most recent session for this template
      // templateId is guaranteed to be defined here since we check above
      const sessions = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_template", (q) => q.eq("templateId", args.templateId!))
        .order("desc")
        .take(10);

      // Find the user's session (most recent)
      const userSession = sessions.find(s => s.userId === user._id);

      if (!userSession) {
        return null;
      }

      // Get the template for context (may be null if deleted)
      const template = await ctx.db.get(userSession.templateId);

      return {
        ...userSession,
        template,
      };
    } catch (error) {
      // Log error for debugging but don't crash the client
      console.error("getSessionForTemplate error:", error);
      return null;
    }
  },
});

/**
 * Get a specific session by ID with full details
 */
export const getById = query({
  args: { sessionId: v.id("gpp_workout_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const template = await ctx.db.get(session.templateId);
    if (!template) {
      return { ...session, template: null, exerciseDetails: [] };
    }

    // Fetch all exercise details
    const exerciseIds = template.exercises.map((e) => e.exerciseId);
    const exercises = await Promise.all(
      exerciseIds.map((id) => ctx.db.get(id))
    );

    const exerciseMap = new Map(
      exercises.filter(Boolean).map((ex) => [ex!._id.toString(), ex!])
    );

    return {
      ...session,
      template: {
        ...template,
        exercises: template.exercises.map((prescription) => ({
          ...prescription,
          exercise: exerciseMap.get(prescription.exerciseId.toString()),
        })),
      },
    };
  },
});

/**
 * Get session history for the current user
 */
export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit || 20;

    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Enrich with template names
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const template = await ctx.db.get(session.templateId);
        return {
          ...session,
          templateName: template?.name || "Unknown Workout",
          phase: template?.phase,
          week: template?.week,
          day: template?.day,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get IDs of all templates that have completed sessions
 * Used by Program tab to show completion status on workout cards
 */
export const getCompletedTemplateIds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get all completed sessions for this user
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Return unique template IDs
    const templateIds = [...new Set(completedSessions.map((s) => s.templateId))];
    return templateIds;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a new workout session
 */
export const startSession = mutation({
  args: {
    templateId: v.id("program_templates"),
    exerciseOrder: v.optional(v.array(v.number())), // Custom exercise order from workout summary
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

    // Get user's program for linking
    const userProgram = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!userProgram) {
      throw new Error("No active program found. Please complete intake first.");
    }

    // Check for existing in-progress session
    const existingSession = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "in_progress")
      )
      .first();

    if (existingSession) {
      // Return existing session instead of creating new one
      return {
        sessionId: existingSession._id,
        isExisting: true,
        message: "Resuming existing workout session",
      };
    }

    // Get the template to initialize exercises
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Workout template not found");
    }

    // Initialize exercise tracking structure
    const initialExercises = template.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      completed: false,
      skipped: false,
      sets: Array(ex.sets)
        .fill(null)
        .map(() => ({
          repsCompleted: undefined,
          durationSeconds: undefined,
          weight: undefined,
          rpe: undefined,
          completed: false,
          skipped: false,
        })),
    }));

    const now = Date.now();

    const sessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId: user._id,
      templateId: args.templateId,
      userProgramId: userProgram._id,
      startedAt: now,
      status: "in_progress",
      exercises: initialExercises,
      // Persist custom exercise order if provided from workout summary
      exerciseOrder: args.exerciseOrder,
      templateSnapshot: {
        name: template.name,
        phase: template.phase,
        week: template.week,
        day: template.day,
        workoutDate: now,
      },
    });

    return {
      sessionId,
      isExisting: false,
      message: "Workout session started",
    };
  },
});

/**
 * Update session progress (called periodically during workout)
 */
export const updateProgress = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exercises: v.array(exerciseCompletionValidator),
    exerciseOrder: v.optional(v.array(v.number())), // For reordering (indices into template.exercises)
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

    if (session.userId !== user._id) {
      throw new Error("Not authorized to update this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("Cannot update a completed or abandoned session");
    }

    // Build update object
    const updates: { exercises: typeof args.exercises; exerciseOrder?: number[] } = {
      exercises: args.exercises,
    };

    // Include exercise order if provided
    if (args.exerciseOrder) {
      updates.exerciseOrder = args.exerciseOrder;
    }

    await ctx.db.patch(args.sessionId, updates);

    return { success: true };
  },
});

/**
 * Complete the workout session
 */
export const completeSession = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exercises: v.array(exerciseCompletionValidator),
    exerciseOrder: v.optional(v.array(v.number())), // Persist exercise order on complete
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

    if (session.userId !== user._id) {
      throw new Error("Not authorized to complete this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const now = Date.now();
    const totalDurationSeconds = Math.round((now - session.startedAt) / 1000);

    const updates: {
      exercises: typeof args.exercises;
      completedAt: number;
      totalDurationSeconds: number;
      status: "completed";
      exerciseOrder?: number[];
    } = {
      exercises: args.exercises,
      completedAt: now,
      totalDurationSeconds,
      status: "completed",
    };

    if (args.exerciseOrder) {
      updates.exerciseOrder = args.exerciseOrder;
    }

    await ctx.db.patch(args.sessionId, updates);

    // Update user program's last workout date
    const userProgram = await ctx.db.get(session.userProgramId);
    if (userProgram) {
      await ctx.db.patch(userProgram._id, {
        lastWorkoutDate: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      totalDurationSeconds,
      message: "Workout completed!",
    };
  },
});

/**
 * Abandon the workout session
 */
export const abandonSession = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exercises: v.optional(v.array(exerciseCompletionValidator)),
    exerciseOrder: v.optional(v.array(v.number())), // Persist exercise order on abandon
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

    if (session.userId !== user._id) {
      throw new Error("Not authorized to abandon this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const updates: { 
      status: "abandoned"; 
      exercises?: typeof args.exercises;
      exerciseOrder?: number[];
    } = {
      status: "abandoned",
    };

    if (args.exercises) {
      updates.exercises = args.exercises;
    }

    if (args.exerciseOrder) {
      updates.exerciseOrder = args.exerciseOrder;
    }

    await ctx.db.patch(args.sessionId, updates);

    return { success: true, message: "Workout session abandoned" };
  },
});
