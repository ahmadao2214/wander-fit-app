import { internalQuery, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { getCurrentUser as getCurrentUserDoc, requireCurrentUser } from './authHelpers'

/**
 * What the athlete agreed to in the First Run's checkbox: the terms version,
 * and the age group that chose the wording. Only the age group is sent, never
 * a birth date.
 */
const termsAcceptanceValidator = v.object({
  termsVersion: v.string(),
  ageGroup: v.union(v.literal('14-17'), v.literal('18-35'), v.literal('36+')),
})

/** The users fields an acceptance sets. The guardian stamp is for 14-17 only. */
export function termsAcceptanceFields(
  acceptance: { termsVersion: string; ageGroup: '14-17' | '18-35' | '36+' },
  now: number
): Pick<Doc<'users'>, 'termsAcceptedAt' | 'termsVersion' | 'guardianConsentAcknowledgedAt'> {
  return {
    termsAcceptedAt: now,
    termsVersion: acceptance.termsVersion,
    ...(acceptance.ageGroup === '14-17' ? { guardianConsentAcknowledgedAt: now } : {}),
  }
}

// Create a new user after Clerk authentication
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    // Everyone is an athlete ("client"). "trainer" is still accepted because
    // installed builds from before the trainer screens were removed send it.
    role: v.union(v.literal('trainer'), v.literal('client')),
    clerkId: v.string(),
    // Optional for app builds from before the acceptance checkbox.
    termsAcceptance: v.optional(termsAcceptanceValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    // clerkId is kept in args for older app builds, but must be the caller's own
    if (args.clerkId !== identity.subject) {
      throw new Error('Cannot create a user for another account')
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', args.clerkId))
      .first()

    if (existingUser) {
      throw new Error('User already exists')
    }

    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      // Prefer Clerk's verified email over the client-supplied one
      email: identity.email ?? args.email,
      name: args.name,
      role: args.role,
      clerkId: args.clerkId,
      createdAt: now,
      ...(args.termsAcceptance ? termsAcceptanceFields(args.termsAcceptance, now) : {}),
    })

    return userId
  },
})

// Record the First Run acceptance for an athlete whose account already exists
// (signed in before saving the plan, so createUser doesn't run).
export const recordTermsAcceptance = mutation({
  args: { termsAcceptance: termsAcceptanceValidator },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    await ctx.db.patch(user._id, termsAcceptanceFields(args.termsAcceptance, Date.now()))
  },
})

// Get the signed-in user. clerkId is accepted for older app builds; any other
// account's ID returns null rather than that account's record.
export const getCurrentUser = query({
  args: { clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    if (args.clerkId !== undefined && args.clerkId !== identity.subject) {
      return null
    }
    return await getCurrentUserDoc(ctx)
  },
})

// Get user by ID (internal: no client caller, and it returns any user's record)
export const getUserById = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)
    if (user._id !== args.userId) {
      throw new Error('You can only update your own profile')
    }

    const { userId, ...updates } = args
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(updateData).length === 0) {
      throw new Error('No updates provided')
    }

    await ctx.db.patch(userId, updateData)
    return await ctx.db.get(userId)
  },
})

// Update the authenticated athlete's telemetry & replay privacy preferences.
// Server-side guard prevents youth (14-17) or athletes without a verified adult
// age group from enabling session replay opt-in.
export const updateTelemetryPreferences = mutation({
  args: {
    analyticsOptOut: v.optional(v.boolean()),
    sessionReplayOptIn: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx)

    if (args.sessionReplayOptIn === true) {
      if (args.analyticsOptOut === true) {
        throw new Error('Cannot enable session replays while opted out of analytics.')
      }

      const program = await ctx.db
        .query('user_programs')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first()
      const latestIntake = await ctx.db
        .query('intake_responses')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order('desc')
        .first()

      const ageGroup = program?.ageGroup ?? latestIntake?.ageGroup
      if (ageGroup !== '18-35' && ageGroup !== '36+') {
        throw new Error('Session replay opt-in is only available for adult athletes (18+).')
      }
    }

    const patch: Partial<Doc<'users'>> = {}

    if (args.analyticsOptOut !== undefined) {
      patch.analyticsOptOut = args.analyticsOptOut
      if (args.analyticsOptOut === true) {
        patch.sessionReplayOptIn = false
      }
    }

    if (args.sessionReplayOptIn !== undefined && patch.sessionReplayOptIn === undefined) {
      patch.sessionReplayOptIn = args.sessionReplayOptIn
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch)
    }

    return await ctx.db.get(user._id)
  },
})
