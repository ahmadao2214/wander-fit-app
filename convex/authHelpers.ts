import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Shared auth checks for public Convex functions.
 *
 * Every public query/mutation that touches user data must derive the caller
 * from `ctx.auth`, never from a client-supplied ID. Functions that are only
 * for seeding, debugging or migrations are `internal*` instead and do not
 * need these helpers.
 */

/** The caller's users row, or null when unauthenticated or not yet created. */
export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .first();
}

/** The caller's users row; throws when unauthenticated or missing. */
export async function requireCurrentUser(ctx: QueryCtx): Promise<Doc<"users">> {
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

  return user;
}

/** The caller's users row, which must have the trainer role. */
export async function requireTrainer(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "trainer") {
    throw new Error("Only trainers can do this");
  }
  return user;
}

/** Whether `trainerId` has an active relationship with `clientId`. */
export async function hasActiveTrainerRelationship(
  ctx: QueryCtx,
  trainerId: Id<"users">,
  clientId: Id<"users">
): Promise<boolean> {
  const relationship = await ctx.db
    .query("trainerClientRelationships")
    .withIndex("by_trainer_status", (q) =>
      q.eq("trainerId", trainerId).eq("status", "active")
    )
    .filter((q) => q.eq(q.field("clientId"), clientId))
    .first();
  return relationship !== null;
}

/**
 * Whether `viewer` may read data belonging to `ownerId`: the owner
 * themselves, or a trainer with an active relationship to them.
 */
export async function canViewUserData(
  ctx: QueryCtx,
  viewer: Doc<"users">,
  ownerId: Id<"users">
): Promise<boolean> {
  if (viewer._id === ownerId) return true;
  if (viewer.role !== "trainer") return false;
  return await hasActiveTrainerRelationship(ctx, viewer._id, ownerId);
}
