import { convexTest } from 'convex-test'
import { ConvexError } from 'convex/values'
import schema from '../schema'
import { api, internal } from '../_generated/api'
import { PURGE_BATCH_SIZE } from '../users'
import type { Id, TableNames } from '../_generated/dataModel'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

/** Every table an athlete's account deletion clears. */
const PURGED_TABLES = [
  'user_maxes',
  'intake_responses',
  'user_programs',
  'gpp_workout_sessions',
  'user_progress',
  'user_schedule_overrides',
  'athlete_ratings',
  'bug_reports',
  'feature_requests',
  'feedback_prompt_state',
  'workouts',
  'workoutSessions',
  'trainerClientRelationships',
  'clientInvitations',
] as const satisfies readonly TableNames[]

const context = { platform: 'ios' as const, appVersion: '1.0.0', screenRoute: '/(athlete)/profile' }

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0]

/** One row in every purged table for this athlete; legacy rows point at `trainerId`. */
async function seedAthlete(
  ctx: Ctx,
  { clerkId, email, trainerId }: { clerkId: string; email: string; trainerId: Id<'users'> }
) {
  const now = Date.now()
  const userId = await ctx.db.insert('users', {
    email,
    name: clerkId,
    clerkId,
    createdAt: now,
    intakeCompletedAt: now,
  })
  const sportId = await ctx.db.insert('sports', { name: `Sport ${clerkId}`, gppCategoryId: 2 })
  const exerciseId = await ctx.db.insert('exercises', {
    name: 'Back Squat',
    slug: `back_squat_${clerkId}`,
    tags: ['squat'],
  })
  const templateId = await ctx.db.insert('program_templates', {
    gppCategoryId: 2,
    phase: 'GPP',
    skillLevel: 'Novice',
    week: 1,
    day: 1,
    name: 'Lower Body Foundation',
    estimatedDurationMinutes: 40,
    exercises: [{ exerciseId, sets: 3, reps: '8', restSeconds: 60, orderIndex: 0 }],
  })
  const intakeResponseId = await ctx.db.insert('intake_responses', {
    userId,
    sportId,
    yearsOfExperience: 2,
    preferredTrainingDaysPerWeek: 3,
    assignedGppCategoryId: 2,
    assignedSkillLevel: 'Novice',
    intakeType: 'initial',
    completedAt: now,
  })
  const userProgramId = await ctx.db.insert('user_programs', {
    userId,
    intakeResponseId,
    gppCategoryId: 2,
    skillLevel: 'Novice',
    currentPhase: 'GPP',
    currentWeek: 1,
    currentDay: 1,
    phaseStartDate: now,
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('user_maxes', {
    userId,
    exerciseId,
    oneRepMax: 225,
    source: 'user_input',
    recordedAt: now,
  })
  await ctx.db.insert('gpp_workout_sessions', {
    userId,
    templateId,
    userProgramId,
    startedAt: now,
    status: 'completed',
    exercises: [
      {
        exerciseId,
        completed: true,
        skipped: false,
        sets: [{ repsCompleted: 8, weight: 135, completed: true, skipped: false }],
      },
    ],
  })
  await ctx.db.insert('user_progress', {
    userId,
    userProgramId,
    daysCompleted: 1,
    weeksCompleted: 0,
    blocksCompleted: 0,
    uniqueExercisesPerformed: [exerciseId],
    totalExercisesInCategory: 10,
    averageWorkoutsPerWeek: 1,
    currentStreak: 1,
    longestStreak: 1,
    updatedAt: now,
  })
  await ctx.db.insert('user_schedule_overrides', {
    userId,
    userProgramId,
    slotOverrides: [{ phase: 'GPP', week: 1, day: 1, templateId }],
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('athlete_ratings', {
    userId,
    isInternal: false,
    stars: 5,
    trigger: 'profile_manual',
    completedWorkoutsAtSubmission: 1,
    context,
    createdAt: now,
  })
  await ctx.db.insert('bug_reports', {
    userId,
    isInternal: false,
    title: 'Timer froze',
    details: 'Rest timer stopped at 0:12',
    severity: 'minor',
    source: 'profile',
    context,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('feature_requests', {
    userId,
    isInternal: false,
    category: 'other',
    title: 'Dark mode',
    details: 'Please',
    context,
    status: 'new',
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('feedback_prompt_state', {
    userId,
    ratingDismissCount: 0,
    storeReviewRequestCount: 0,
    updatedAt: now,
  })
  const workoutId = await ctx.db.insert('workouts', {
    trainerId,
    clientId: userId,
    name: 'Legacy workout',
    exercises: [],
    createdAt: now,
    isActive: true,
  })
  await ctx.db.insert('workoutSessions', {
    workoutId,
    clientId: userId,
    startedAt: now,
    status: 'completed',
    exercises: [],
  })
  await ctx.db.insert('trainerClientRelationships', {
    trainerId,
    clientId: userId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.insert('clientInvitations', {
    email,
    name: clerkId,
    trainerId,
    status: 'accepted',
    createdAt: now,
    expiresAt: now,
  })
  return { userId, exerciseId, templateId }
}

// Purges schedule the PostHog deletion; each test drains it in afterEach.
let current: ReturnType<typeof convexTest> | null = null

async function setup() {
  const t = convexTest(schema, modules)
  current = t
  const ids = await t.run(async (ctx) => {
    // A legacy trainer whose shared rows reference both athletes.
    const trainerId = await ctx.db.insert('users', {
      email: 'trainer@example.com',
      name: 'Trainer',
      clerkId: 'clerk_trainer',
      role: 'trainer',
      createdAt: Date.now(),
    })
    // The athlete the trainer row "owns", so the trainer guard has something to find.
    await ctx.db.insert('users', {
      email: 'owned@example.com',
      name: 'Owned',
      clerkId: 'clerk_owned',
      trainerId,
      createdAt: Date.now(),
    })
    const athlete = await seedAthlete(ctx, {
      clerkId: 'clerk_athlete',
      email: 'athlete@example.com',
      trainerId,
    })
    const bystander = await seedAthlete(ctx, {
      clerkId: 'clerk_bystander',
      email: 'bystander@example.com',
      trainerId,
    })
    return { trainerId, athlete: athlete.userId, bystander: bystander.userId }
  })
  return { t, ...ids }
}

/** Rows per table that still reference this user (by userId, clientId, or invite email). */
async function rowsFor(t: ReturnType<typeof convexTest>, userId: Id<'users'>, email: string) {
  return await t.run(async (ctx) => {
    const counts: Record<string, number> = {}
    for (const table of PURGED_TABLES) {
      const rows = (await ctx.db.query(table).collect()) as Array<Record<string, unknown>>
      counts[table] = rows.filter(
        (row) => row.userId === userId || row.clientId === userId || row.email === email
      ).length
    }
    counts.users = (await ctx.db.get(userId)) ? 1 : 0
    return counts
  })
}

const allZero = Object.fromEntries([...PURGED_TABLES, 'users'].map((table) => [table, 0]))
const allOne = Object.fromEntries([...PURGED_TABLES, 'users'].map((table) => [table, 1]))

const saved = { ...process.env }
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
  delete process.env.POSTHOG_PERSONAL_API_KEY
  delete process.env.POSTHOG_PROJECT_ID
  process.env.CLERK_SECRET_KEY = 'sk_test_unit'
})
afterEach(async () => {
  if (current) await current.finishAllScheduledFunctions(jest.runAllTimers)
  current = null
  jest.useRealTimers()
  jest.restoreAllMocks()
  process.env = { ...saved }
})

describe('users.purgeAthleteRecords', () => {
  it('deletes the athlete from every table and leaves other athletes alone', async () => {
    const { t, athlete, bystander } = await setup()
    expect(await rowsFor(t, athlete, 'athlete@example.com')).toEqual(allOne)

    const result = await t.mutation(internal.users.purgeAthleteRecords, {
      clerkId: 'clerk_athlete',
      verifiedEmail: 'athlete@example.com',
    })

    expect(result).toEqual({ deleted: true, dependentDocs: PURGED_TABLES.length })
    expect(await rowsFor(t, athlete, 'athlete@example.com')).toEqual(allZero)
    expect(await rowsFor(t, bystander, 'bystander@example.com')).toEqual(allOne)
  })

  it('leaves invitations alone without a verified email, even when users.email matches', async () => {
    const { t, athlete, bystander } = await setup()
    // The athlete points their editable profile email at someone else's address.
    await t.run((ctx) => ctx.db.patch(athlete, { email: 'bystander@example.com' }))

    await t.mutation(internal.users.purgeAthleteRecords, { clerkId: 'clerk_athlete' })

    expect(await t.run((ctx) => ctx.db.get(athlete))).toBeNull()
    const invitations = await t.run((ctx) => ctx.db.query('clientInvitations').collect())
    expect(invitations.map((row) => row.email).sort()).toEqual([
      'athlete@example.com',
      'bystander@example.com',
    ])
    expect((await rowsFor(t, bystander, 'bystander@example.com')).users).toBe(1)
  })

  it('purges a long history in batches and deletes the users row last', async () => {
    const { t, athlete } = await setup()
    const extra = PURGE_BATCH_SIZE * 2 + 5
    await t.run(async (ctx) => {
      const exercise = await ctx.db.query('exercises').first()
      for (let i = 0; i < extra; i++) {
        await ctx.db.insert('user_maxes', {
          userId: athlete,
          exerciseId: exercise!._id,
          oneRepMax: 100 + i,
          source: 'user_input',
          recordedAt: i,
        })
      }
    })

    const first = await t.mutation(internal.users.purgeAthleteRecords, {
      clerkId: 'clerk_athlete',
      verifiedEmail: 'athlete@example.com',
    })
    expect(first).toEqual({ deleted: false, inProgress: true, dependentDocs: PURGE_BATCH_SIZE })
    // Still there, so the follow-up run (or a webhook retry) can find the rest.
    expect(await t.run((ctx) => ctx.db.get(athlete))).not.toBeNull()

    await t.finishAllScheduledFunctions(jest.runAllTimers)

    expect(await rowsFor(t, athlete, 'athlete@example.com')).toEqual(allZero)
  })

  it('schedules the PostHog person deletion for the athlete', async () => {
    const { t, athlete } = await setup()
    await t.mutation(internal.users.purgeAthleteRecords, { clerkId: 'clerk_athlete' })
    const scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect())
    expect(scheduled.map((job) => [job.name, job.args[0]])).toEqual([
      ['telemetry:deletePostHogPerson', { distinctId: athlete }],
    ])
  })

  it('returns alreadyGone without throwing when there is no users row', async () => {
    const { t } = await setup()
    await t.mutation(internal.users.purgeAthleteRecords, { clerkId: 'clerk_athlete' })

    const again = await t.mutation(internal.users.purgeAthleteRecords, {
      clerkId: 'clerk_athlete',
    })
    expect(again).toEqual({ deleted: false, alreadyGone: true })

    const never = await t.mutation(internal.users.purgeAthleteRecords, {
      clerkId: 'clerk_never_existed',
    })
    expect(never).toEqual({ deleted: false, alreadyGone: true })
  })

  it('refuses to delete an account that owns legacy trainer data, and deletes nothing', async () => {
    const { t, trainerId } = await setup()
    await expect(
      t.mutation(internal.users.purgeAthleteRecords, { clerkId: 'clerk_trainer' })
    ).rejects.toThrow()
    expect(await t.run((ctx) => ctx.db.get(trainerId))).not.toBeNull()
  })
})

describe('users.deleteMyAccount', () => {
  const ATHLETE_IDENTITY = {
    subject: 'clerk_athlete',
    email: 'athlete@example.com',
    emailVerified: true,
  }

  const clerkOk = () =>
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))

  it('rejects a caller who is not signed in, before calling Clerk', async () => {
    const { t, athlete } = await setup()
    const fetchSpy = clerkOk()
    await expect(t.action(api.users.deleteMyAccount, {})).rejects.toThrow('Not authenticated')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await t.run((ctx) => ctx.db.get(athlete))).not.toBeNull()
  })

  it('deletes the Clerk user, then every Convex record', async () => {
    const { t, athlete } = await setup()
    const fetchSpy = clerkOk()

    const result = await t
      .withIdentity(ATHLETE_IDENTITY)
      .action(api.users.deleteMyAccount, {})

    expect(result).toEqual({ deleted: true })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toBe('https://api.clerk.com/v1/users/clerk_athlete')
    expect(init?.method).toBe('DELETE')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_unit')
    expect(await rowsFor(t, athlete, 'athlete@example.com')).toEqual(allZero)
  })

  it('treats a Clerk 404 as already deleted and still purges Convex', async () => {
    const { t, athlete } = await setup()
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))

    const result = await t
      .withIdentity(ATHLETE_IDENTITY)
      .action(api.users.deleteMyAccount, {})

    expect(result).toEqual({ deleted: true })
    expect(await rowsFor(t, athlete, 'athlete@example.com')).toEqual(allZero)
  })

  it('keeps every Convex record when Clerk fails', async () => {
    const { t, athlete } = await setup()
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      t.withIdentity(ATHLETE_IDENTITY).action(api.users.deleteMyAccount, {})
    ).rejects.toThrow('Could not delete your account')
    expect(await rowsFor(t, athlete, 'athlete@example.com')).toEqual(allOne)
  })

  it('refuses without calling Clerk when CLERK_SECRET_KEY is unset', async () => {
    const { t, athlete } = await setup()
    delete process.env.CLERK_SECRET_KEY
    const fetchSpy = clerkOk()
    jest.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      t.withIdentity(ATHLETE_IDENTITY).action(api.users.deleteMyAccount, {})
    ).rejects.toThrow('not available')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(await t.run((ctx) => ctx.db.get(athlete))).not.toBeNull()
  })

  it('refuses a trainer-owned account before deleting it in Clerk', async () => {
    const { t } = await setup()
    const fetchSpy = clerkOk()

    const error = await t
      .withIdentity({ subject: 'clerk_trainer' })
      .action(api.users.deleteMyAccount, {})
      .catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ConvexError)
    // The app's client decodes the data; convex-test hands it back JSON-encoded.
    const data = (error as ConvexError<string>).data
    expect(typeof data === 'string' && data.startsWith('"') ? JSON.parse(data) : data).toBe(
      'trainer_data'
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('finishes cleanly when the Convex row is already gone', async () => {
    const { t } = await setup()
    clerkOk()
    await t.mutation(internal.users.purgeAthleteRecords, { clerkId: 'clerk_athlete' })

    const result = await t
      .withIdentity(ATHLETE_IDENTITY)
      .action(api.users.deleteMyAccount, {})
    expect(result).toEqual({ deleted: true })
  })
})
