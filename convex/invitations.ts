import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a client invitation (instead of creating the user directly)
export const createClientInvitation = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    trainerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the trainer exists and has the right role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Invalid trainer");
    }

    // Check if there's already an invitation for this email
    const existingInvitation = await ctx.db
      .query("clientInvitations")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    const invitationId = await ctx.db.insert("clientInvitations", {
      email: args.email,
      name: args.name,
      trainerId: args.trainerId,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return invitationId;
  },
});

// Get invitations sent by a trainer
export const getTrainerInvitations = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clientInvitations")
      .filter((q) => q.eq(q.field("trainerId"), args.trainerId))
      .order("desc")
      .collect();
  },
});

// Get invitation by email (for when client signs up)
// SECURITY: Requires authentication to prevent enumeration attacks
export const getInvitationByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Require authentication to prevent unauthorized email enumeration
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify the authenticated user is querying their own email
    if (identity.email !== args.email) {
      throw new Error("Can only query invitations for your own email");
    }

    return await ctx.db
      .query("clientInvitations")
      .filter((q) =>
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();
  },
});

// Accept invitation (called during client signup)
export const acceptInvitation = mutation({
  args: {
    email: v.string(),
    clientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("clientInvitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (!invitation) {
      return null; // No invitation found, that's ok
    }

    // Check if invitation is expired
    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Update the user with the trainer relationship
    await ctx.db.patch(args.clientId, {
      trainerId: invitation.trainerId,
    });

    // Create the trainer-client relationship
    await ctx.db.insert("trainerClientRelationships", {
      trainerId: invitation.trainerId,
      clientId: args.clientId,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    return invitation.trainerId;
  },
});

// Cancel/delete invitation
export const cancelInvitation = mutation({
  args: { invitationId: v.id("clientInvitations") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
    });

    return { message: "Invitation cancelled successfully" };
  },
});
