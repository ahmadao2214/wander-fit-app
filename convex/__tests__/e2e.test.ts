import { convexTest } from 'convex-test'
import schema from '../schema'
import { api, internal } from '../_generated/api'
import { convexModules } from '../../jest/convexModules'
import { isPrivateRatingEligible } from '../../lib/feedbackEligibility'

const modules = convexModules()
const newTest = () => convexTest(schema, modules)
type TestConvex = ReturnType<typeof newTest>

const email = 'e2e.1+clerk_test@example.com'
const persona = { clerkId: 'user_e2e_1', email, name: 'Verify Athlete' }

async function seedBasketball(t: TestConvex) {
  return t.run((ctx) => ctx.db.insert('sports', { name: 'Basketball', gppCategoryId: 2 }))
}

async function rowsFor(t: TestConvex) {
  return t.run(async (ctx) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()
    if (!user) return { users: 0, programs: 0, intakes: 0, user: null }
    const programs = await ctx.db
      .query('user_programs')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    const intakes = await ctx.db
      .query('intake_responses')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()
    return { users: 1, programs: programs.length, intakes: intakes.length, user }
  })
}

describe('e2e persona provisioning', () => {
  // The Today rating auto-prompt once covered the history journey's persona
  it('starts every persona inside the rating-prompt cooldown', async () => {
    const t = newTest()
    await seedBasketball(t)
    await t.mutation(internal.e2e.provision, { ...persona, state: 'onboarded' })
    await t.mutation(internal.e2e.provision, { ...persona, state: 'onboarded' })

    const states = await t.run(async (ctx) => {
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', email))
        .first()
      return ctx.db
        .query('feedback_prompt_state')
        .withIndex('by_user', (q) => q.eq('userId', user!._id))
        .collect()
    })
    expect(states).toHaveLength(1)
    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: 15,
        reassessmentPending: false,
        promptState: states[0],
        now: Date.now(),
      })
    ).toBe(false)
  })

  it('new writes a user row only', async () => {
    const t = newTest()
    await seedBasketball(t)
    await t.mutation(internal.e2e.provision, { ...persona, state: 'new' })

    const rows = await rowsFor(t)
    expect(rows).toMatchObject({ users: 1, programs: 0, intakes: 0 })
    expect(rows.user?.intakeCompletedAt).toBeUndefined()
    expect(rows.user?.onboardingCompletedAt).toBeUndefined()

    const inspected = await t.query(internal.e2e.inspect, { email })
    expect(inspected).toMatchObject({
      found: true,
      intakeCompleted: false,
      onboardingCompleted: false,
      hasProgram: false,
      phase: null,
    })
  })

  it('new resets a user that already had a program', async () => {
    const t = newTest()
    await seedBasketball(t)
    await t.mutation(internal.e2e.provision, { ...persona, state: 'onboarded' })
    expect(await rowsFor(t)).toMatchObject({ programs: 1, intakes: 1 })

    await t.mutation(internal.e2e.provision, { ...persona, state: 'new' })
    const rows = await rowsFor(t)
    expect(rows).toMatchObject({ users: 1, programs: 0, intakes: 0 })
    expect(rows.user?.onboardingSkipped).toBeUndefined()
  })

  it('inspect shows GPP week 1 day 1 and the first launch after the First Run saves', async () => {
    const t = newTest()
    const sportId = await seedBasketball(t)
    await t.mutation(internal.e2e.provision, { ...persona, state: 'new' })
    expect(await t.query(internal.e2e.inspect, { email })).toMatchObject({
      firstLaunchRecorded: false,
    })

    const athlete = t.withIdentity({ subject: persona.clerkId })
    await athlete.mutation(api.userPrograms.completeIntake, {
      sportId,
      yearsOfExperience: 0,
      preferredTrainingDaysPerWeek: 3,
      selectedTrainingDays: [1, 3, 5],
      ageGroup: '18-35',
      firstLaunchAt: Date.now() - 60_000,
    })

    expect(await t.query(internal.e2e.inspect, { email })).toMatchObject({
      found: true,
      intakeCompleted: true,
      hasProgram: true,
      phase: 'GPP',
      week: 1,
      day: 1,
      firstLaunchRecorded: true,
    })
  })

  it('remove deletes the user, program, and intake rows', async () => {
    const t = newTest()
    await seedBasketball(t)
    await t.mutation(internal.e2e.provision, { ...persona, state: 'onboarded' })

    expect(await t.mutation(internal.e2e.remove, { email })).toEqual({ deleted: true, email })
    expect(await rowsFor(t)).toMatchObject({ users: 0, programs: 0, intakes: 0 })
    expect(await t.mutation(internal.e2e.remove, { email })).toEqual({ deleted: false, email })
  })

  it('with-history adds completed GPP sessions that History lists, and remove deletes them', async () => {
    const t = newTest()
    await seedBasketball(t)
    await t.run(async (ctx) => {
      const exerciseId = await ctx.db.insert('exercises', {
        name: 'Goblet Squat',
        slug: 'goblet_squat',
        tags: [],
      })
      await ctx.db.insert('program_templates', {
        gppCategoryId: 2,
        phase: 'GPP',
        skillLevel: 'Novice',
        week: 1,
        day: 1,
        name: 'Lower Body Foundation',
        estimatedDurationMinutes: 40,
        exercises: [{ exerciseId, sets: 3, reps: '10', restSeconds: 60, orderIndex: 0 }],
      })
    })
    await t.mutation(internal.e2e.provision, { ...persona, state: 'with-history' })

    const asPersona = t.withIdentity({ subject: persona.clerkId, email })
    const history = await asPersona.query(api.gppWorkoutSessions.getHistory, {})
    // Today's session, plus every day of the two weeks before this one
    expect(history).toHaveLength(15)
    expect(new Set(history.map((s) => `${s.status} ${s.templateSnapshot?.name}`))).toEqual(
      new Set(['completed Lower Body Foundation'])
    )

    // History's progress line: "15 workouts done · 2 weeks on plan"
    const progress = await asPersona.query(api.userPrograms.getProgressSummary, {
      today: new Date().toISOString().slice(0, 10),
      timezoneOffsetMinutes: 0,
    })
    expect([progress?.daysCompleted, progress?.weeksOnPlan]).toEqual([15, 2])

    // Installed builds still call the old endpoint and read the old field names
    const legacy = await asPersona.query(api.workoutSessions.getHistory, {})
    expect(legacy[0]).toMatchObject({
      totalDuration: 45 * 60,
      workout: { name: 'Lower Body Foundation' },
      templateSnapshot: { name: 'Lower Body Foundation' },
    })

    // persona inspect lists the sessions, so the workout-loop flow can check its own
    const inspected = await t.query(internal.e2e.inspect, { email })
    expect(inspected.found && inspected.sessions).toHaveLength(15)
    expect(inspected.found && inspected.sessions[0]).toMatchObject({
      status: 'completed',
      mainExercises: 1,
      mainExercisesNotLogged: 0,
    })

    // The one main exercise (3 sets) counts as not logged when it is
    // missing, saved as skipped, or short of a set
    const [first] = await t.run((ctx) => ctx.db.query('gpp_workout_sessions').collect())
    const notLoggedAfter = async (exercises: typeof first.exercises) => {
      await t.run((ctx) => ctx.db.patch(first._id, { exercises }))
      const after = await t.query(internal.e2e.inspect, { email })
      return after.found ? after.sessions[0].mainExercisesNotLogged : null
    }
    const [main] = first.exercises
    expect(await notLoggedAfter([])).toBe(1)
    expect(await notLoggedAfter([{ ...main, skipped: true }])).toBe(1)
    expect(await notLoggedAfter([{ ...main, sets: main.sets.slice(1) }])).toBe(1)
    expect(await notLoggedAfter([main])).toBe(0)

    await t.mutation(internal.e2e.remove, { email })
    const left = await t.run((ctx) => ctx.db.query('gpp_workout_sessions').collect())
    expect(left).toEqual([])
  })
})

describe('e2e repeated-week persona', () => {
  it("sits at GPP week 3 of 5 with weeks 1-2 done, and Today offers week 2's first workout again", async () => {
    const t = newTest()
    await seedBasketball(t)
    await t.run(async (ctx) => {
      const exerciseId = await ctx.db.insert('exercises', {
        name: 'Goblet Squat',
        slug: 'goblet_squat',
        tags: [],
      })
      for (let week = 1; week <= 4; week++) {
        for (let day = 1; day <= 3; day++) {
          await ctx.db.insert('program_templates', {
            gppCategoryId: 2,
            phase: 'GPP',
            skillLevel: 'Novice',
            week,
            day,
            name: `W${week}D${day}`,
            estimatedDurationMinutes: 40,
            exercises: [{ exerciseId, sets: 3, reps: '10', restSeconds: 60, orderIndex: 0 }],
          })
        }
      }
    })
    await t.mutation(internal.e2e.provision, { ...persona, state: 'repeated-week' })

    const inspected = await t.query(internal.e2e.inspect, { email })
    expect(inspected.found && [inspected.phase, inspected.week, inspected.day]).toEqual([
      'GPP',
      3,
      1,
    ])
    expect(inspected.found && inspected.sessions.length).toBe(6)
    const program = await t.run((ctx) => ctx.db.query('user_programs').first())
    expect(program?.weeksPerPhase).toBe(5)

    // What the repeated-week flow sees: W2D1 to start, not done
    const asPersona = t.withIdentity({ subject: persona.clerkId, email })
    const today = await asPersona.query(api.scheduleOverrides.getTodayWorkout, {})
    expect(today?.name).toBe('W2D1')
    expect(
      await asPersona.query(api.gppWorkoutSessions.getSessionForTemplate, {
        templateId: today!._id,
      })
    ).toBeNull()
  })
})

describe('e2e template seed', () => {
  // Mirrors scripts/verify/run.mjs: seed:seedAll, then the generator per category.
  it('gives the e2e database the generated Day 1 that production serves', async () => {
    const t = newTest()
    await t.mutation(internal.seed.seedAll, {})
    // An older hand-written seed row must be replaced, not kept.
    await t.mutation(internal.seed.seedAllSkillLevelTemplates, {})
    for (const categoryId of [1, 2, 3, 4]) {
      await t.mutation(internal.generateTemplates.regenerateCategoryTemplates, {
        categoryId,
        failOnErrors: true,
      })
    }

    const day1 = await t.query(api.programTemplates.getWorkout, {
      gppCategoryId: 2,
      phase: 'GPP',
      skillLevel: 'Novice',
      week: 1,
      day: 1,
    })
    expect(day1?.name).toBe('Lower Body A - Foundation')

    const count = await t.run(
      async (ctx) => (await ctx.db.query('program_templates').collect()).length
    )
    expect(count).toBe(4 * 3 * 3 * 4 * 7)

    // A second seed (every deploy) keeps template IDs, so saved sessions
    // still open their workout.
    await t.mutation(internal.generateTemplates.regenerateCategoryTemplates, {
      categoryId: 2,
      failOnErrors: true,
    })
    const again = await t.query(api.programTemplates.getWorkout, {
      gppCategoryId: 2,
      phase: 'GPP',
      skillLevel: 'Novice',
      week: 1,
      day: 1,
    })
    expect(again?._id).toBe(day1?._id)
    const recount = await t.run(
      async (ctx) => (await ctx.db.query('program_templates').collect()).length
    )
    expect(recount).toBe(count)
  }, 60_000)
})
