import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new user after Clerk authentication
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("trainer"), v.literal("client")),
    clerkId: v.string(),
    trainerId: v.optional(v.id("users")), // only for clients
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Validate trainer relationship if client
    if (args.role === "client" && args.trainerId) {
      const trainer = await ctx.db.get(args.trainerId);
      if (!trainer || trainer.role !== "trainer") {
        throw new Error("Invalid trainer ID");
      }
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      role: args.role,
      clerkId: args.clerkId,
      trainerId: args.trainerId,
      createdAt: Date.now(),
    });

    // If this is a client with a trainer, create the relationship
    if (args.role === "client" && args.trainerId) {
      await ctx.db.insert("trainerClientRelationships", {
        trainerId: args.trainerId,
        clientId: userId,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return userId;
  },
});

// Get current user by Clerk ID
export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get all trainers (for client signup)
export const getTrainers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "trainer"))
      .collect();
  },
});

// Get trainer's clients
export const getTrainerClients = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get active relationships
    const relationships = await ctx.db
      .query("trainerClientRelationships")
      .withIndex("by_trainer_status", (q) => 
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .collect();

    // Get client details
    const clients = await Promise.all(
      relationships.map(async (rel) => {
        const client = await ctx.db.get(rel.clientId);
        return {
          ...client,
          relationshipCreated: rel.createdAt,
        };
      })
    );

    return clients.filter(Boolean);
  },
});

// Get client's trainer
export const getClientTrainer = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client || !client.trainerId) {
      return null;
    }
    return await ctx.db.get(client.trainerId);
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(userId, updateData);
    return await ctx.db.get(userId);
  },
});

// Create trainer-client relationship (when client requests to join a trainer)
export const requestTrainerRelationship = mutation({
  args: {
    clientId: v.id("users"),
    trainerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify client and trainer exist and have correct roles
    const [client, trainer] = await Promise.all([
      ctx.db.get(args.clientId),
      ctx.db.get(args.trainerId),
    ]);

    if (!client || client.role !== "client") {
      throw new Error("Invalid client");
    }
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Invalid trainer");
    }

    // Check if relationship already exists
    const existingRelationship = await ctx.db
      .query("trainerClientRelationships")
      .filter((q) => 
        q.and(
          q.eq(q.field("clientId"), args.clientId),
          q.eq(q.field("trainerId"), args.trainerId)
        )
      )
      .first();

    if (existingRelationship) {
      throw new Error("Relationship already exists");
    }

    // Create pending relationship
    const relationshipId = await ctx.db.insert("trainerClientRelationships", {
      trainerId: args.trainerId,
      clientId: args.clientId,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return relationshipId;
  },
});

// Approve trainer-client relationship
export const approveTrainerRelationship = mutation({
  args: {
    relationshipId: v.id("trainerClientRelationships"),
    approve: v.boolean(),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db.get(args.relationshipId);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    if (relationship.status !== "pending") {
      throw new Error("Relationship is not pending approval");
    }

    if (args.approve) {
      // Approve the relationship
      await ctx.db.patch(args.relationshipId, {
        status: "active",
        updatedAt: Date.now(),
      });

      // Update client's trainerId
      await ctx.db.patch(relationship.clientId, {
        trainerId: relationship.trainerId,
      });
    } else {
      // Reject the relationship
      await ctx.db.patch(args.relationshipId, {
        status: "inactive",
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.get(args.relationshipId);
  },
});
