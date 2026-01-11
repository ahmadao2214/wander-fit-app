import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Parent Invitations - Invitation Flow for Parent-Athlete Linking
 *
 * Flow:
 * 1. Parent creates invitation → generates unique 6-character code
 * 2. Parent shares code with athlete (verbal, text, etc.)
 * 3. Athlete enters code in their app
 * 4. System validates code and creates relationship
 * 5. Both parent and athlete can see the link
 *
 * Invitations expire after 7 days by default.
 */

// Generate a random 6-character alphanumeric code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all pending invitations for the current parent
 */
export const getMyInvitations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.userRole !== "parent") return null;

    const invitations = await ctx.db
      .query("parent_invitations")
      .withIndex("by_parent", (q) => q.eq("parentUserId", user._id))
      .collect();

    // Filter and update expired invitations
    const now = Date.now();
    const validInvitations = [];

    for (const inv of invitations) {
      if (inv.status === "pending" && inv.expiresAt < now) {
        // Mark as expired
        await ctx.db.patch(inv._id, { status: "expired" });
      } else if (inv.status !== "revoked") {
        validInvitations.push(inv);
      }
    }

    return validInvitations;
  },
});

/**
 * Get invitation by code (for athletes accepting)
 */
export const getInvitationByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("parent_invitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.code.toUpperCase()))
      .first();

    if (!invitation) return null;

    // Check if expired
    if (invitation.status === "pending" && invitation.expiresAt < Date.now()) {
      return { ...invitation, status: "expired" as const };
    }

    // Get parent info for display
    const parent = await ctx.db.get(invitation.parentUserId);

    return {
      ...invitation,
      parentName: parent?.name || "Parent",
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new invitation
 * Only parents can create invitations
 */
export const createInvitation = mutation({
  args: {
    athleteEmail: v.optional(v.string()), // Optional: for directed invites
    expiresInDays: v.optional(v.number()), // Default: 7 days
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

    if (user.userRole !== "parent") {
      throw new Error("Only parents can create invitations");
    }

    // Generate unique code
    let inviteCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      inviteCode = generateInviteCode();
      const existing = await ctx.db
        .query("parent_invitations")
        .withIndex("by_code", (q) => q.eq("inviteCode", inviteCode))
        .first();

      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique code. Please try again.");
    }

    const now = Date.now();
    const expiresInDays = args.expiresInDays ?? 7;
    const expiresAt = now + expiresInDays * 24 * 60 * 60 * 1000;

    const invitationId = await ctx.db.insert("parent_invitations", {
      parentUserId: user._id,
      inviteCode,
      athleteEmail: args.athleteEmail,
      expiresAt,
      status: "pending",
      createdAt: now,
    });

    return {
      invitationId,
      inviteCode,
      expiresAt,
    };
  },
});

/**
 * Accept an invitation (called by athlete)
 * Creates the parent-athlete relationship
 */
export const acceptInvitation = mutation({
  args: {
    code: v.string(),
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

    // Athletes (or clients for legacy) can accept invitations
    const isAthlete = user.userRole === "athlete" || user.role === "client" || !user.userRole;
    if (!isAthlete) {
      throw new Error("Only athletes can accept parent invitations");
    }

    // Find the invitation
    const invitation = await ctx.db
      .query("parent_invitations")
      .withIndex("by_code", (q) => q.eq("inviteCode", args.code.toUpperCase()))
      .first();

    if (!invitation) {
      throw new Error("Invalid invitation code");
    }

    if (invitation.status !== "pending") {
      throw new Error(`Invitation has already been ${invitation.status}`);
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Invitation has expired");
    }

    // Check if directed to specific email
    if (invitation.athleteEmail && invitation.athleteEmail !== user.email) {
      throw new Error("This invitation is for a different athlete");
    }

    // Check if relationship already exists
    const existingRelationship = await ctx.db
      .query("parent_athlete_relationships")
      .withIndex("by_parent", (q) => q.eq("parentUserId", invitation.parentUserId))
      .filter((q) => q.eq(q.field("athleteUserId"), user._id))
      .first();

    if (existingRelationship && existingRelationship.status === "active") {
      throw new Error("You are already linked to this parent");
    }

    const now = Date.now();

    // Create or reactivate the relationship
    let relationshipId;
    if (existingRelationship) {
      await ctx.db.patch(existingRelationship._id, {
        status: "active",
        updatedAt: now,
      });
      relationshipId = existingRelationship._id;
    } else {
      relationshipId = await ctx.db.insert("parent_athlete_relationships", {
        parentUserId: invitation.parentUserId,
        athleteUserId: user._id,
        relationshipType: "parent",
        permissions: "full",
        status: "active",
        createdAt: now,
      });
    }

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: now,
      acceptedByUserId: user._id,
    });

    return {
      success: true,
      relationshipId,
      parentUserId: invitation.parentUserId,
    };
  },
});

/**
 * Revoke an invitation (called by parent)
 */
export const revokeInvitation = mutation({
  args: {
    invitationId: v.id("parent_invitations"),
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

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.parentUserId !== user._id) {
      throw new Error("You can only revoke your own invitations");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only revoke pending invitations");
    }

    await ctx.db.patch(args.invitationId, {
      status: "revoked",
    });

    return { success: true };
  },
});
