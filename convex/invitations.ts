import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { requireCurrentUser, requireTrainer } from "./authHelpers";

// Invitations are matched on lowercased, trimmed emails
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// The email invitations are matched on: the email claim in the caller's Clerk
// token. users.email is never used because the caller can edit it (createUser,
// updateUser) and could set it to someone else's invited address.
async function getCallerEmail(ctx: QueryCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email || identity.emailVerified === false) return null;
  return normalizeEmail(identity.email);
}

// Pending invitations are scanned rather than looked up by the by_email index
// because invitations created before emails were normalized keep their
// original casing.
async function findPendingInvitation(ctx: QueryCtx, email: string) {
  const pending = await ctx.db
    .query("clientInvitations")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .collect();
  return pending.find((invitation) => normalizeEmail(invitation.email) === email) ?? null;
}

// Create a client invitation (instead of creating the user directly)
export const createClientInvitation = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    trainerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const trainer = await requireTrainer(ctx);
    if (trainer._id !== args.trainerId) {
      throw new Error("You can only send invitations as yourself");
    }

    const email = normalizeEmail(args.email);

    // Check if there's already an invitation for this email
    const existingInvitation = await ctx.db
      .query("clientInvitations")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingUser) {
      throw new Error("A user with this email already exists");
    }

    const invitationId = await ctx.db.insert("clientInvitations", {
      email,
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
    const trainer = await requireTrainer(ctx);
    if (trainer._id !== args.trainerId) {
      throw new Error("You can only view your own invitations");
    }

    return await ctx.db
      .query("clientInvitations")
      .filter((q) => q.eq(q.field("trainerId"), args.trainerId))
      .order("desc")
      .collect();
  },
});

// Get the pending invitation for the signed-in user's email (for when client
// signs up). Returns null for any other email, so it can't be used to probe
// who has been invited.
export const getInvitationByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const callerEmail = await getCallerEmail(ctx);
    if (!callerEmail || callerEmail !== normalizeEmail(args.email)) {
      return null;
    }

    return await findPendingInvitation(ctx, callerEmail);
  },
});

// Accept invitation (called during client signup). The invitation is looked
// up by the email in the caller's Clerk token; `email` is kept in args for
// older app builds. Without an email claim there is nothing to accept.
export const acceptInvitation = mutation({
  args: {
    email: v.string(),
    clientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user._id !== args.clientId) {
      throw new Error("You can only accept invitations for yourself");
    }

    const callerEmail = await getCallerEmail(ctx);
    if (!callerEmail) {
      return null;
    }

    const invitation = await findPendingInvitation(ctx, callerEmail);

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
    const trainer = await requireTrainer(ctx);

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.trainerId !== trainer._id) {
      throw new Error("You can only cancel your own invitations");
    }

    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
    });

    return { message: "Invitation cancelled successfully" };
  },
});
