import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("trainer"), v.literal("client")),
    trainerId: v.optional(v.id("users")), // for clients only - references their trainer
    clerkId: v.string(), // from Clerk authentication
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerk", ["clerkId"])
    .index("by_trainer", ["trainerId"]),

  workouts: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    exercises: v.array(
      v.object({
        id: v.string(), // unique ID for tracking
        name: v.string(),
        sets: v.number(),
        reps: v.optional(v.number()), // for rep-based exercises
        duration: v.optional(v.number()), // seconds for time-based exercises
        restDuration: v.number(), // seconds between sets
        orderIndex: v.number(), // order of exercises in workout
        notes: v.optional(v.string()), // trainer notes for this exercise
      })
    ),
    createdAt: v.number(),
    isActive: v.boolean(), // allows trainers to deactivate workouts
  })
    .index("by_client", ["clientId"])
    .index("by_trainer", ["trainerId"])
    .index("by_client_active", ["clientId", "isActive"]),

  workoutSessions: defineTable({
    workoutId: v.id("workouts"),
    clientId: v.id("users"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalDuration: v.optional(v.number()), // seconds
    status: v.union(
      v.literal("in_progress"), 
      v.literal("completed"), 
      v.literal("abandoned")
    ),
    exercises: v.array(
      v.object({
        exerciseId: v.string(), // matches exercise.id from workout
        completed: v.boolean(),
        skipped: v.boolean(),
        notes: v.optional(v.string()), // client notes
        sets: v.array(
          v.object({
            repsCompleted: v.optional(v.number()),
            durationCompleted: v.optional(v.number()), // for time-based
            completed: v.boolean(),
            skipped: v.boolean(),
          })
        ),
      })
    ),
  })
    .index("by_client", ["clientId"])
    .index("by_workout", ["workoutId"])
    .index("by_client_status", ["clientId", "status"]),

  // Trainer-Client relationships (for managing who can assign workouts to whom)
  trainerClientRelationships: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("pending"), // client requested, trainer hasn't approved
      v.literal("inactive") // relationship ended
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trainer", ["trainerId"])
    .index("by_client", ["clientId"])
    .index("by_trainer_status", ["trainerId", "status"])
    .index("by_client_status", ["clientId", "status"]),
});
