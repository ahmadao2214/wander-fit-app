import { convexTest } from 'convex-test'
import schema from '../schema'
import { api } from '../_generated/api'
import { convexModules } from '../../jest/convexModules'
import type { Id } from '../_generated/dataModel'

const modules = convexModules()

const logged = () => ({ completed: true, skipped: false, repsCompleted: 10, weight: 35 })

/**
 * One athlete with a completed session on a shared template, then many other
 * athletes' sessions on the same template, all newer.
 */
async function setup(otherAthletes: number) {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const now = Date.now()
    const sportId = await ctx.db.insert('sports', { name: 'Basketball', gppCategoryId: 2 })
    const goblet = await ctx.db.insert('exercises', {
      name: 'Goblet Squat',
      slug: 'goblet_squat',
      tags: ['squat'],
    })
    const templateId = await ctx.db.insert('program_templates', {
      gppCategoryId: 2,
      phase: 'GPP',
      skillLevel: 'Moderate',
      week: 1,
      day: 1,
      name: 'Lower Body Foundation',
      estimatedDurationMinutes: 40,
      exercises: [
        {
          exerciseId: goblet,
          sets: 1,
          reps: '10',
          restSeconds: 60,
          orderIndex: 0,
          section: 'main' as const,
        },
      ],
    })

    const athlete = async (n: number) => {
      const userId = await ctx.db.insert('users', {
        email: `athlete${n}@example.com`,
        name: `Athlete ${n}`,
        clerkId: `clerk_${n}`,
        role: 'client',
        createdAt: now,
      })
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
      const sessionId = await ctx.db.insert('gpp_workout_sessions', {
        userId,
        templateId,
        userProgramId,
        startedAt: now,
        completedAt: now,
        status: 'completed',
        exercises: [{ exerciseId: goblet, completed: true, skipped: false, sets: [logged()] }],
      })
      return sessionId
    }

    const mine = await athlete(0)
    for (let n = 1; n <= otherAthletes; n++) await athlete(n)
    return { templateId, mine }
  })
  return { t, ids, asMe: t.withIdentity({ subject: 'clerk_0', email: 'athlete0@example.com' }) }
}

describe('sessions for a shared template', () => {
  it("finds the athlete's session after 25 other athletes did the same workout (regression)", async () => {
    const { ids, asMe } = await setup(25)
    const session = await asMe.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: ids.templateId,
    })
    expect(session?._id).toBe(ids.mine)
  })

  it("finds the athlete's last completed session after 25 other athletes did the same workout (regression)", async () => {
    const { ids, asMe } = await setup(25)
    const last = await asMe.query(api.gppWorkoutSessions.getLastCompletedSessionForTemplate, {
      templateId: ids.templateId,
    })
    expect(last).not.toBeNull()
  })

  it("never returns another athlete's session", async () => {
    const { t, ids } = await setup(1)
    // A third account that has never done the workout
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        email: 'new@example.com',
        name: 'New',
        clerkId: 'clerk_new',
        role: 'client',
        createdAt: Date.now(),
      })
    })
    const asNew = t.withIdentity({ subject: 'clerk_new', email: 'new@example.com' })
    const templateId: Id<'program_templates'> = ids.templateId
    expect(
      await asNew.query(api.gppWorkoutSessions.getSessionForTemplate, { templateId })
    ).toBeNull()
    expect(
      await asNew.query(api.gppWorkoutSessions.getLastCompletedSessionForTemplate, { templateId })
    ).toBeNull()
  })
})
