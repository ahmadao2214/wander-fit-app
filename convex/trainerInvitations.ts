import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random 6-character invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude similar chars (0, O, I, 1)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a trainer invitation with unique invite code
 * Optionally restrict to specific athlete email
 */
export const createInvitation = mutation({
  args: {
    trainerId: v.id("users"),
    athleteEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify the trainer exists and has the right role
    const trainer = await ctx.db.get(args.trainerId);
    if (!trainer || trainer.role !== "trainer") {
      throw new Error("Only trainers can create invitations");
    }

    // Generate a unique invite code
    let inviteCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      inviteCode = generateInviteCode();
      const existingCode = await ctx.db
        .query("trainer_invitations")
        .withIndex("by_code", (q) => q.eq("inviteCode", inviteCode))
        .first();
      isUnique = !existingCode;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error("Failed to generate unique invite code. Please try again.");
    }

    const invitationId = await ctx.db.insert("trainer_invitations", {
      trainerId: args.trainerId,
      inviteCode,
      athleteEmail: args.athleteEmail,
      status: "pending",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: Date.now(),
    });

    return { invitationId, inviteCode };
  },
});

/**
 * Get all invitations for a trainer
 */
export const getTrainerInvitations = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainer_invitations")
      .withIndex("by_trainer", (q) => q.eq("trainerId", args.trainerId))
      .order("desc")
      .collect();
  },
});

/**
 * Get pending invitations for a trainer
 */
export const getPendingInvitations = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trainer_invitations")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "pending")
      )
      .order("desc")
      .collect();
  },
});

/**
 * Validate an invite code (check if it exists and is valid)
 */
export const validateInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("trainer_invitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();

    if (!invitation) {
      return { valid: false, error: "Invalid invitation code" };
    }

    if (invitation.status !== "pending") {
      return { valid: false, error: "This invitation is no longer valid" };
    }

    if (invitation.expiresAt < Date.now()) {
      return { valid: false, error: "This invitation has expired" };
    }

    // Get trainer info
    const trainer = await ctx.db.get(invitation.trainerId);

    return {
      valid: true,
      invitation: {
        _id: invitation._id,
        trainerId: invitation.trainerId,
        trainerName: trainer?.name ?? "Unknown Trainer",
        athleteEmail: invitation.athleteEmail,
        expiresAt: invitation.expiresAt,
      },
    };
  },
});

/**
 * Accept a trainer invitation
 * Enforces one-trainer-per-athlete limit
 */
export const acceptInvitation = mutation({
  args: {
    inviteCode: v.string(),
    athleteUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the invitation
    const invitation = await ctx.db
      .query("trainer_invitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.inviteCode.toUpperCase()))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation code");
    }

    if (invitation.status !== "pending") {
      throw new Error("This invitation is no longer valid");
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Get the athlete
    const athlete = await ctx.db.get(args.athleteUserId);
    if (!athlete) {
      throw new Error("Athlete not found");
    }

    // If invitation is restricted to specific email, verify it matches
    if (invitation.athleteEmail && invitation.athleteEmail !== athlete.email) {
      throw new Error("This invitation is for a different email address");
    }

    // Check if athlete already has a trainer (one-trainer limit)
    const existingRelationship = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_athlete_status", (q) =>
        q.eq("athleteUserId", args.athleteUserId).eq("status", "active")
      )
      .first();

    if (existingRelationship) {
      throw new Error("You already have a trainer linked. Please unlink your current trainer first.");
    }

    // Create the trainer-athlete relationship
    await ctx.db.insert("trainer_athlete_relationships", {
      trainerId: invitation.trainerId,
      athleteUserId: args.athleteUserId,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
      acceptedByUserId: args.athleteUserId,
    });

    return { trainerId: invitation.trainerId };
  },
});

/**
 * Revoke a pending invitation (trainer only)
 */
export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("trainer_invitations"),
    trainerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.trainerId !== args.trainerId) {
      throw new Error("You can only revoke your own invitations");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only revoke pending invitations");
    }

    await ctx.db.patch(args.invitationId, { status: "revoked" });

    return { success: true };
  },
});
