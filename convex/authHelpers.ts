import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

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
