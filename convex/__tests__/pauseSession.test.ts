import { convexTest } from 'convex-test'
import schema from '../schema'
import { api } from '../_generated/api'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

const fresh = () => ({ completed: false, skipped: false })
const logged = () => ({ completed: true, skipped: false, repsCompleted: 10, weight: 35 })

/** A user with a program, two templates, and an in-progress session on the first. */
async function setup() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      email: 'athlete@example.com',
      name: 'Athlete',
      clerkId: 'clerk_athlete',
      role: 'client',
      createdAt: now,
    })
    const sportId = await ctx.db.insert('sports', { name: 'Basketball', gppCategoryId: 2 })
    const intakeResponseId = await ctx.db.insert('intake_responses', {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek: 3,
      assignedGppCategoryId: 2,
      assignedSkillLevel: 'Moderate',
      intakeType: 'initial',
      completedAt: now,
    })
    const userProgramId = await ctx.db.insert('user_programs', {
      userId,
      intakeResponseId,
      gppCategoryId: 2,
      skillLevel: 'Moderate',
      currentPhase: 'GPP',
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      createdAt: now,
      updatedAt: now,
    })
    const goblet = await ctx.db.insert('exercises', {
      name: 'Goblet Squat',
      slug: 'goblet_squat',
      tags: ['squat'],
    })
    const rdl = await ctx.db.insert('exercises', {
      name: 'Romanian Deadlift',
      slug: 'romanian_deadlift',
      tags: ['hinge'],
    })
    const template = (name: string, day: number) =>
      ctx.db.insert('program_templates', {
        gppCategoryId: 2,
        phase: 'GPP',
        skillLevel: 'Moderate',
        week: 1,
        day,
        name,
        estimatedDurationMinutes: 40,
        exercises: [
          {
            exerciseId: goblet,
            sets: 3,
            reps: '10',
            restSeconds: 60,
            orderIndex: 0,
            section: 'main' as const,
          },
          {
            exerciseId: rdl,
            sets: 2,
            reps: '10',
            restSeconds: 60,
            orderIndex: 1,
            section: 'main' as const,
          },
        ],
      })
    const templateId = await template('Lower Body Foundation', 1)
    const otherTemplateId = await template('Upper Push/Pull', 2)
    const sessionId = await ctx.db.insert('gpp_workout_sessions', {
      userId,
      templateId,
      userProgramId,
      startedAt: now,
      status: 'in_progress',
      exercises: [
        { exerciseId: goblet, completed: false, skipped: false, sets: [fresh(), fresh(), fresh()] },
        { exerciseId: rdl, completed: false, skipped: false, sets: [fresh(), fresh()] },
      ],
    })
    return { goblet, rdl, templateId, otherTemplateId, sessionId }
  })
  const asAthlete = t.withIdentity({ subject: 'clerk_athlete', email: 'athlete@example.com' })
  return { t, ids, asAthlete }
}

describe('pausing a workout from Exit', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('keeps the logged sets when the athlete exits and resumes (regression)', async () => {
    const { asAthlete, ids } = await setup()
    const exercises = [
      {
        exerciseId: ids.goblet,
        completed: false,
        skipped: false,
        sets: [logged(), logged(), fresh()],
      },
      { exerciseId: ids.rdl, completed: false, skipped: false, sets: [fresh(), fresh()] },
    ]

    // X → Exit
    await asAthlete.mutation(api.gppWorkoutSessions.pauseSession, {
      sessionId: ids.sessionId,
      exercises,
      exerciseOrder: [1, 0],
    })

    // Today still finds it as the in-progress session
    const current = await asAthlete.query(api.gppWorkoutSessions.getCurrentSession, {})
    expect(current?._id).toBe(ids.sessionId)
    expect(current?.status).toBe('in_progress')
    expect(typeof current?.pausedAt).toBe('number')

    // Starting the same workout again resumes it instead of starting over
    const started = await asAthlete.mutation(api.gppWorkoutSessions.startSession, {
      templateId: ids.templateId,
    })
    expect(started).toMatchObject({ sessionId: ids.sessionId, isExisting: true })

    await asAthlete.mutation(api.gppWorkoutSessions.resumeSession, { sessionId: ids.sessionId })
    const resumed = await asAthlete.query(api.gppWorkoutSessions.getById, {
      sessionId: ids.sessionId,
    })
    expect(resumed?.status).toBe('in_progress')
    expect(resumed?.pausedAt).toBeUndefined()
    expect(resumed?.exerciseOrder).toEqual([1, 0])
    expect(resumed?.exercises[0].sets.map((s) => s.completed)).toEqual([true, true, false])
    expect(resumed?.exercises[0].sets[0]).toMatchObject({ repsCompleted: 10, weight: 35 })
  })

  it("leaves the paused time out of the workout's duration", async () => {
    jest.useFakeTimers({
      now: new Date(2026, 10, 13, 9, 0, 0),
      doNotFake: ['nextTick', 'setImmediate'],
    })
    const { asAthlete, ids, t } = await setup()
    const exercises = [
      {
        exerciseId: ids.goblet,
        completed: true,
        skipped: false,
        sets: [logged(), logged(), logged()],
      },
      { exerciseId: ids.rdl, completed: true, skipped: false, sets: [logged(), logged()] },
    ]

    jest.setSystemTime(new Date(2026, 10, 13, 9, 10, 0)) // 10 minutes in
    await asAthlete.mutation(api.gppWorkoutSessions.pauseSession, {
      sessionId: ids.sessionId,
      exercises,
    })
    jest.setSystemTime(new Date(2026, 10, 14, 9, 0, 0)) // back the next day
    await asAthlete.mutation(api.gppWorkoutSessions.resumeSession, { sessionId: ids.sessionId })
    jest.setSystemTime(new Date(2026, 10, 14, 9, 15, 0)) // 15 more minutes
    const result = await asAthlete.mutation(api.gppWorkoutSessions.completeSession, {
      sessionId: ids.sessionId,
      exercises,
    })

    expect(result.totalDurationSeconds).toBe(25 * 60)
    const stored = await t.run((ctx) => ctx.db.get(ids.sessionId))
    expect(stored?.totalDurationSeconds).toBe(25 * 60)
  })

  it("resuming twice doesn't count the pause twice", async () => {
    const { asAthlete, ids, t } = await setup()
    await asAthlete.mutation(api.gppWorkoutSessions.pauseSession, { sessionId: ids.sessionId })
    await asAthlete.mutation(api.gppWorkoutSessions.resumeSession, { sessionId: ids.sessionId })
    const once = await t.run((ctx) => ctx.db.get(ids.sessionId))
    await asAthlete.mutation(api.gppWorkoutSessions.resumeSession, { sessionId: ids.sessionId })
    const twice = await t.run((ctx) => ctx.db.get(ids.sessionId))
    expect(twice?.pausedSeconds).toBe(once?.pausedSeconds)
  })

  it("won't start a different workout over a paused one", async () => {
    const { asAthlete, ids } = await setup()
    await asAthlete.mutation(api.gppWorkoutSessions.pauseSession, { sessionId: ids.sessionId })
    await expect(
      asAthlete.mutation(api.gppWorkoutSessions.startSession, { templateId: ids.otherTemplateId })
    ).rejects.toThrow(/paused workout/)
    const current = await asAthlete.query(api.gppWorkoutSessions.getCurrentSession, {})
    expect(current?._id).toBe(ids.sessionId)
  })

  it('discarding stays a separate choice and keeps the record', async () => {
    const { asAthlete, ids, t } = await setup()
    await asAthlete.mutation(api.gppWorkoutSessions.pauseSession, { sessionId: ids.sessionId })
    await asAthlete.mutation(api.gppWorkoutSessions.abandonSession, { sessionId: ids.sessionId })
    expect(await asAthlete.query(api.gppWorkoutSessions.getCurrentSession, {})).toBeNull()
    const stored = await t.run((ctx) => ctx.db.get(ids.sessionId))
    expect(stored?.status).toBe('abandoned')
  })

  it('only the athlete can pause their session', async () => {
    const { t, ids } = await setup()
    await t.run((ctx) =>
      ctx.db.insert('users', {
        email: 'other@example.com',
        name: 'Other',
        clerkId: 'clerk_other',
        role: 'client',
        createdAt: Date.now(),
      })
    )
    const asOther = t.withIdentity({ subject: 'clerk_other', email: 'other@example.com' })
    await expect(
      asOther.mutation(api.gppWorkoutSessions.pauseSession, { sessionId: ids.sessionId })
    ).rejects.toThrow(/Not authorized/)
  })
})
