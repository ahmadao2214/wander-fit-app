import { action, internalMutation, internalQuery, mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id, TableNames } from './_generated/dataModel'
import { getCurrentUser as getCurrentUserDoc, requireCurrentUser } from './authHelpers'

// Create a new user after Clerk authentication
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    // Everyone is an athlete ("client"). "trainer" is still accepted because
    // installed builds from before the trainer screens were removed send it.
    role: v.union(v.literal('trainer'), v.literal('client')),
    clerkId: v.string(),
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

    const userId = await ctx.db.insert('users', {
      // Prefer Clerk's verified email over the client-supplied one
      email: identity.email ?? args.email,
      name: args.name,
      role: args.role,
      clerkId: args.clerkId,
      createdAt: Date.now(),
    })

    return userId
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

// ─────────────────────────────────────────────────────────────────────────────
// Account deletion
//
// The athlete deletes their account from App Settings (`deleteMyAccount`), or
// Clerk reports a deletion through the `user.deleted` webhook (convex/http.ts).
// Both end in `purgeAthleteRecords`, which is idempotent so webhook retries and
// a second call after a partial failure finish cleanly.
// ─────────────────────────────────────────────────────────────────────────────

/** Tables keyed by the athlete's `userId` with a `by_user` index. */
const ATHLETE_TABLES = [
  'user_maxes',
  'intake_responses',
  'user_programs',
  'gpp_workout_sessions',
  'user_progress',
  'user_schedule_overrides',
  // Feedback the athlete sent from Profile. Tied to the account, so it goes too.
  'athlete_ratings',
  'bug_reports',
  'feature_requests',
  'feedback_prompt_state',
] as const

async function findUserByClerkId(ctx: QueryCtx, clerkId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_clerk', (q) => q.eq('clerkId', clerkId))
    .first()
}

/**
 * Legacy trainer rows affect other accounts, so deleting them is a manual job
 * (docs/CLERK_USER_CLEANUP.md). True when this user owns any.
 */
async function ownsTrainerData(ctx: QueryCtx, userId: Id<'users'>) {
  const workout = await ctx.db
    .query('workouts')
    .withIndex('by_trainer', (q) => q.eq('trainerId', userId))
    .first()
  if (workout) return true
  const client = await ctx.db
    .query('users')
    .withIndex('by_trainer', (q) => q.eq('trainerId', userId))
    .first()
  return client !== null
}

/** ConvexError data, so the app can tell the athlete to contact support. */
export const TRAINER_DATA_ERROR = 'trainer_data'

const trainerDataError = () => new ConvexError(TRAINER_DATA_ERROR)

/** Checked before Clerk is touched, so a blocked deletion deletes nothing. */
export const accountDeletionBlocker = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }): Promise<'trainer_data' | null> => {
    const user = await findUserByClerkId(ctx, clerkId)
    if (!user) return null
    return (await ownsTrainerData(ctx, user._id)) ? 'trainer_data' : null
  },
})

/**
 * Rows deleted per run of the purge. An athlete's history has no lifetime cap,
 * so one mutation can't promise to read and delete all of it.
 */
export const PURGE_BATCH_SIZE = 200

/**
 * Up to `limit` of the athlete's rows. `verifiedEmail` is the address Clerk
 * vouched for: invitations are matched on it, never on `users.email`, which
 * the athlete can edit to anyone's address (`updateUser`).
 */
async function takeAthleteDocs(
  ctx: MutationCtx,
  user: Doc<'users'>,
  verifiedEmail: string | undefined,
  limit: number
) {
  const sources: Array<(n: number) => Promise<Array<{ _id: Id<TableNames> }>>> = [
    ...ATHLETE_TABLES.map(
      (table) => (n: number) =>
        ctx.db
          .query(table)
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .take(n)
    ),
    (n) =>
      ctx.db
        .query('workouts')
        .withIndex('by_client', (q) => q.eq('clientId', user._id))
        .take(n),
    (n) =>
      ctx.db
        .query('workoutSessions')
        .withIndex('by_client', (q) => q.eq('clientId', user._id))
        .take(n),
    (n) =>
      ctx.db
        .query('trainerClientRelationships')
        .withIndex('by_client', (q) => q.eq('clientId', user._id))
        .take(n),
  ]
  if (verifiedEmail) {
    sources.push((n) =>
      ctx.db
        .query('clientInvitations')
        .withIndex('by_email', (q) => q.eq('email', verifiedEmail))
        .take(n)
    )
  }

  const docs: Array<{ _id: Id<TableNames> }> = []
  for (const take of sources) {
    if (docs.length >= limit) break
    docs.push(...(await take(limit - docs.length)))
  }
  return docs
}

/**
 * Deletes the Convex records of the athlete with this Clerk id, then the users
 * row. It deletes PURGE_BATCH_SIZE rows per run and reschedules itself until
 * none are left; the users row goes last, so a retry can always find the rest.
 * No users row means it already ran: returns alreadyGone.
 * Refuses (throws) when the account owns legacy trainer data.
 *
 * Legacy invitations are deleted only for `verifiedEmail`. The `user.deleted`
 * webhook carries no email, so that path leaves them (docs/CLERK_USER_CLEANUP.md).
 */
export const purgeAthleteRecords = internalMutation({
  args: { clerkId: v.string(), verifiedEmail: v.optional(v.string()) },
  handler: async (
    ctx,
    { clerkId, verifiedEmail }
  ): Promise<
    | { deleted: false; alreadyGone: true }
    | { deleted: false; inProgress: true; dependentDocs: number }
    | { deleted: true; dependentDocs: number }
  > => {
    const user = await findUserByClerkId(ctx, clerkId)
    if (!user) return { deleted: false, alreadyGone: true }

    if (await ownsTrainerData(ctx, user._id)) {
      throw trainerDataError()
    }

    const docs = await takeAthleteDocs(ctx, user, verifiedEmail, PURGE_BATCH_SIZE)
    for (const doc of docs) await ctx.db.delete(doc._id)

    if (docs.length >= PURGE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.users.purgeAthleteRecords, {
        clerkId,
        verifiedEmail,
      })
      return { deleted: false, inProgress: true, dependentDocs: docs.length }
    }

    await ctx.db.delete(user._id)

    // Anonymous analytics are keyed by the users id. No-ops until PostHog is
    // configured, and never throws, so it can't undo the purge.
    await ctx.scheduler.runAfter(0, internal.telemetry.deletePostHogPerson, {
      distinctId: user._id,
    })

    return { deleted: true, dependentDocs: docs.length }
  },
})

/**
 * The signed-in athlete deletes their own account: Clerk first, then Convex.
 * If Convex fails after Clerk succeeded, Clerk's `user.deleted` webhook runs
 * the same purge and finishes the job.
 */
export const deleteMyAccount = action({
  args: {},
  handler: async (ctx): Promise<{ deleted: true }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    const clerkId = identity.subject

    const blocker = await ctx.runQuery(internal.users.accountDeletionBlocker, { clerkId })
    if (blocker === 'trainer_data') throw trainerDataError()

    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      console.error('deleteMyAccount: CLERK_SECRET_KEY is not set on this deployment')
      throw new Error('Account deletion is not available right now. Try again later.')
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    // 404: already deleted in Clerk (an earlier attempt, or the dashboard).
    if (!response.ok && response.status !== 404) {
      // Status only: the response body and the key stay out of the logs.
      console.error('deleteMyAccount: Clerk delete failed with status', response.status)
      throw new Error('Could not delete your account. Try again.')
    }

    // A long history finishes in scheduled follow-up runs of the same purge.
    await ctx.runMutation(internal.users.purgeAthleteRecords, {
      clerkId,
      // Only an address Clerk verified may pick which invitations go.
      verifiedEmail: identity.emailVerified === true ? identity.email : undefined,
    })
    return { deleted: true }
  },
})
