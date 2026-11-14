import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUser as getCurrentUserDoc,
  requireCurrentUser,
} from "./authHelpers";

// Create a new user after Clerk authentication
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    // Everyone is an athlete ("client"). "trainer" is still accepted because
    // installed builds from before the trainer screens were removed send it.
    role: v.union(v.literal("trainer"), v.literal("client")),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    // clerkId is kept in args for older app builds, but must be the caller's own
    if (args.clerkId !== identity.subject) {
      throw new Error("Cannot create a user for another account");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      throw new Error("User already exists");
    }

    const userId = await ctx.db.insert("users", {
      // Prefer Clerk's verified email over the client-supplied one
      email: identity.email ?? args.email,
      name: args.name,
      role: args.role,
      clerkId: args.clerkId,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get the signed-in user. clerkId is accepted for older app builds; any other
// account's ID returns null rather than that account's record.
export const getCurrentUser = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    if (args.clerkId !== undefined && args.clerkId !== identity.subject) {
      return null;
    }
    return await getCurrentUserDoc(ctx);
  },
});

// Get user by ID (internal: no client caller, and it returns any user's record)
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
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
    const user = await requireCurrentUser(ctx);
    if (user._id !== args.userId) {
      throw new Error("You can only update your own profile");
    }

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
