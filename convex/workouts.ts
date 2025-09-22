import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Exercise validation schema
const exerciseSchema = v.object({
  name: v.string(),
  sets: v.number(),
  reps: v.optional(v.number()),
  duration: v.optional(v.number()),
  restDuration: v.number(),
  notes: v.optional(v.string()),
});

// Create a new workout
export const createWorkout = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    clientId: v.id("users"),
    exercises: v.array(exerciseSchema),
  },
  handler: async (ctx, args) => {
    // Get current user from auth context (this would be the trainer)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get trainer user record
    const trainer = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can create workouts");
    }

    // Verify client exists and belongs to this trainer
    const client = await ctx.db.get(args.clientId);
    if (!client || client.role !== "client") {
      throw new Error("Invalid client");
    }

    // Check if client is assigned to this trainer
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

    // Validate exercises
    if (args.exercises.length === 0) {
      throw new Error("Workout must have at least one exercise");
    }

    // Process exercises and add IDs and order
    const processedExercises = args.exercises.map((exercise, index) => ({
      ...exercise,
      id: `ex_${Date.now()}_${index}`,
      orderIndex: index,
    }));

    const workoutId = await ctx.db.insert("workouts", {
      trainerId: trainer._id,
      clientId: args.clientId,
      name: args.name,
      description: args.description,
      exercises: processedExercises,
      createdAt: Date.now(),
      isActive: true,
    });

    return {
      workoutId,
      message: "Workout created successfully",
    };
  },
});

// Get workouts for a specific client (trainer view)
export const getClientWorkouts = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_client_active", (q) => 
        q.eq("clientId", args.clientId).eq("isActive", true)
      )
      .order("desc")
      .collect();
  },
});

// Get workouts assigned to current user (client view)
export const getMyWorkouts = query({
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

    if (user.role !== "client") {
      throw new Error("Only clients can view assigned workouts");
    }

    return await ctx.db
      .query("workouts")
      .withIndex("by_client_active", (q) => 
        q.eq("clientId", user._id).eq("isActive", true)
      )
      .order("desc")
      .collect();
  },
});

// Get all workouts created by trainer
export const getTrainerWorkouts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trainer = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can view created workouts");
    }

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_trainer", (q) => q.eq("trainerId", trainer._id))
      .order("desc")
      .collect();

    // Enrich with client names
    const enrichedWorkouts = await Promise.all(
      workouts.map(async (workout) => {
        const client = await ctx.db.get(workout.clientId);
        return {
          ...workout,
          clientName: client?.name || "Unknown Client",
        };
      })
    );

    return enrichedWorkouts;
  },
});

// Get specific workout by ID
export const getWorkoutById = query({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, args) => {
    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    // Get client and trainer info
    const [client, trainer] = await Promise.all([
      ctx.db.get(workout.clientId),
      ctx.db.get(workout.trainerId),
    ]);

    return {
      ...workout,
      clientName: client?.name || "Unknown Client",
      trainerName: trainer?.name || "Unknown Trainer",
    };
  },
});

// Update workout
export const updateWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    exercises: v.optional(v.array(exerciseSchema)),
    isActive: v.optional(v.boolean()),
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
      throw new Error("Only trainers can update workouts");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.trainerId !== trainer._id) {
      throw new Error("You can only update your own workouts");
    }

    const updates: any = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.isActive !== undefined) {
      updates.isActive = args.isActive;
    }

    if (args.exercises !== undefined) {
      if (args.exercises.length === 0) {
        throw new Error("Workout must have at least one exercise");
      }
      // Process exercises and add IDs and order
      updates.exercises = args.exercises.map((exercise, index) => ({
        ...exercise,
        id: `ex_${Date.now()}_${index}`,
        orderIndex: index,
      }));
    }

    await ctx.db.patch(args.workoutId, updates);

    return {
      message: "Workout updated successfully",
      workoutId: args.workoutId,
    };
  },
});

// Duplicate workout for another client
export const duplicateWorkout = mutation({
  args: {
    workoutId: v.id("workouts"),
    newClientId: v.id("users"),
    newName: v.optional(v.string()),
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
      throw new Error("Only trainers can duplicate workouts");
    }

    const originalWorkout = await ctx.db.get(args.workoutId);
    if (!originalWorkout) {
      throw new Error("Original workout not found");
    }

    if (originalWorkout.trainerId !== trainer._id) {
      throw new Error("You can only duplicate your own workouts");
    }

    // Verify new client exists and belongs to this trainer
    const newClient = await ctx.db.get(args.newClientId);
    if (!newClient || newClient.role !== "client") {
      throw new Error("Invalid client");
    }

    const relationship = await ctx.db
      .query("trainerClientRelationships")
      .filter((q) => 
        q.and(
          q.eq(q.field("trainerId"), trainer._id),
          q.eq(q.field("clientId"), args.newClientId),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (!relationship) {
      throw new Error("Client is not assigned to this trainer");
    }

    // Create new workout with updated exercises IDs
    const newExercises = originalWorkout.exercises.map((exercise, index) => ({
      ...exercise,
      id: `ex_${Date.now()}_${index}`,
    }));

    const newWorkoutId = await ctx.db.insert("workouts", {
      trainerId: trainer._id,
      clientId: args.newClientId,
      name: args.newName || `${originalWorkout.name} (Copy)`,
      description: originalWorkout.description,
      exercises: newExercises,
      createdAt: Date.now(),
      isActive: true,
    });

    return {
      workoutId: newWorkoutId,
      message: "Workout duplicated successfully",
    };
  },
});

// Delete/deactivate workout
export const deleteWorkout = mutation({
  args: { workoutId: v.id("workouts") },
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
      throw new Error("Only trainers can delete workouts");
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout) {
      throw new Error("Workout not found");
    }

    if (workout.trainerId !== trainer._id) {
      throw new Error("You can only delete your own workouts");
    }

    // Check if workout has any sessions - if so, deactivate instead of delete
    const sessions = await ctx.db
      .query("workoutSessions")
      .withIndex("by_workout", (q) => q.eq("workoutId", args.workoutId))
      .first();

    if (sessions) {
      // Deactivate instead of delete to preserve history
      await ctx.db.patch(args.workoutId, { isActive: false });
      return {
        message: "Workout deactivated (has existing sessions)",
        action: "deactivated",
      };
    } else {
      // Safe to delete completely
      await ctx.db.delete(args.workoutId);
      return {
        message: "Workout deleted successfully",
        action: "deleted",
      };
    }
  },
});

// Get workout statistics for trainer dashboard
export const getWorkoutStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trainer = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can view workout statistics");
    }

    const [workouts, sessions] = await Promise.all([
      ctx.db
        .query("workouts")
        .withIndex("by_trainer", (q) => q.eq("trainerId", trainer._id))
        .collect(),
      ctx.db.query("workoutSessions").collect(),
    ]);

    const activeWorkouts = workouts.filter(w => w.isActive);
    const trainerSessions = sessions.filter(s => 
      workouts.some(w => w._id === s.workoutId)
    );

    const completedSessions = trainerSessions.filter(s => s.status === "completed");
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0);

    return {
      totalWorkouts: workouts.length,
      activeWorkouts: activeWorkouts.length,
      totalSessions: trainerSessions.length,
      completedSessions: completedSessions.length,
      totalTrainingMinutes: Math.round(totalDuration / 60),
      averageSessionDuration: completedSessions.length > 0 
        ? Math.round(totalDuration / completedSessions.length / 60) 
        : 0,
    };
  },
});

// Assign existing workout to another client
export const assignWorkoutToClient = mutation({
  args: {
    workoutId: v.id("workouts"),
    clientId: v.id("users"),
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
      throw new Error("Only trainers can assign workouts");
    }

    const originalWorkout = await ctx.db.get(args.workoutId);
    if (!originalWorkout) {
      throw new Error("Original workout not found");
    }

    if (originalWorkout.trainerId !== trainer._id) {
      throw new Error("You can only assign your own workouts");
    }

    // Verify new client exists and belongs to this trainer
    const newClient = await ctx.db.get(args.clientId);
    if (!newClient || newClient.role !== "client") {
      throw new Error("Invalid client");
    }

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

    // Create new workout with updated exercises IDs
    const newExercises = originalWorkout.exercises.map((exercise, index) => ({
      ...exercise,
      id: `ex_${Date.now()}_${index}`,
    }));

    const newWorkoutId = await ctx.db.insert("workouts", {
      trainerId: trainer._id,
      clientId: args.clientId,
      name: originalWorkout.name,
      description: originalWorkout.description,
      exercises: newExercises,
      createdAt: Date.now(),
      isActive: true,
    });

    return {
      workoutId: newWorkoutId,
      message: "Workout assigned successfully",
    };
  },
});
