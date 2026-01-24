import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Temporary debug query to find users by email pattern
export const searchUsersByEmail = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    // Return all users for now, we'll filter client-side
    return allUsers.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      clerkId: u.clerkId,
      createdAt: u.createdAt,
      intakeCompletedAt: u.intakeCompletedAt,
      onboardingCompletedAt: u.onboardingCompletedAt,
      onboardingProgress: u.onboardingProgress,
    }));
  },
});

// Create user for testing/debugging (admin only)
export const createUserForClerkId = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return { error: "User already exists", user: existingUser };
    }

    // Create the user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      clerkId: args.clerkId,
      role: "client",
      createdAt: Date.now(),
    });

    const user = await ctx.db.get(userId);
    return { success: true, user };
  },
});

// Search users by email pattern
export const searchUsersByPattern = query({
  args: { pattern: v.string() },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const matched = allUsers.filter(u =>
      u.email.toLowerCase().includes(args.pattern.toLowerCase()) ||
      u.name.toLowerCase().includes(args.pattern.toLowerCase())
    );

    const results = [];
    for (const user of matched) {
      const intakes = await ctx.db
        .query("intake_responses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const programs = await ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      results.push({
        user,
        intakes,
        programs,
      });
    }

    return results;
  },
});

// Get all data for a specific user
export const getUserData = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Find user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { error: "User not found" };
    }

    // Get intake_responses
    const intakeResponses = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user_programs
    const userPrograms = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user_maxes
    const userMaxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get sports for context
    const sports = await ctx.db.query("sports").collect();

    return {
      user,
      intakeResponses,
      userPrograms,
      userMaxes,
      sports,
    };
  },
});
