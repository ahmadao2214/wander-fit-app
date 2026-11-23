import { convexTest } from 'convex-test'
import schema from '../schema'
import { api } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { convexModules } from '../../jest/convexModules'
import { intakeArgs, revealProgram, type CompleteFirstRunAnswers } from '../../lib/firstRun'

const modules = convexModules()
const newTest = () => convexTest(schema, modules)
type TestConvex = ReturnType<typeof newTest>

const clerkId = 'user_first_run'

async function setup(t: TestConvex) {
  return t.run(async (ctx) => {
    const sportId = await ctx.db.insert('sports', { name: 'Basketball', gppCategoryId: 2 })
    const userId = await ctx.db.insert('users', {
      email: 'athlete@example.com',
      name: 'Athlete',
      clerkId,
      createdAt: Date.now(),
    })
    return { sportId, userId }
  })
}

async function rows(t: TestConvex, userId: Id<'users'>) {
  return t.run(async (ctx) => ({
    user: await ctx.db.get(userId),
    programs: await ctx.db
      .query('user_programs')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    intakes: await ctx.db
      .query('intake_responses')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  }))
}

const intake = (sportId: Id<'sports'>) => ({
  sportId,
  yearsOfExperience: 0,
  preferredTrainingDaysPerWeek: 3,
  selectedTrainingDays: [1, 3, 5],
  ageGroup: '14-17' as const,
})

describe('completeIntake from the First Run', () => {
  it('stores firstLaunchAt and starts a new program at GPP week 1 day 1', async () => {
    const t = newTest()
    const { sportId, userId } = await setup(t)
    const firstLaunchAt = Date.now() - 90_000

    const result = await t
      .withIdentity({ subject: clerkId })
      .mutation(api.userPrograms.completeIntake, { ...intake(sportId), firstLaunchAt })

    expect(result.keptExistingProgram).toBe(false)
    const { user, programs, intakes } = await rows(t, userId)
    expect(user?.firstLaunchAt).toBe(firstLaunchAt)
    expect(user?.intakeCompletedAt).toBeDefined()
    expect(intakes).toHaveLength(1)
    expect(programs).toHaveLength(1)
    expect(programs[0]).toMatchObject({
      currentPhase: 'GPP',
      currentWeek: 1,
      currentDay: 1,
      totalProgramWeeks: 12,
      weeksPerPhase: 4,
      skillLevel: 'Novice',
    })
  })

  it('clamps a firstLaunchAt from the future to now', async () => {
    const t = newTest()
    const { sportId, userId } = await setup(t)
    const before = Date.now()

    await t.withIdentity({ subject: clerkId }).mutation(api.userPrograms.completeIntake, {
      ...intake(sportId),
      firstLaunchAt: before + 10 * 24 * 60 * 60 * 1000,
    })

    const { user } = await rows(t, userId)
    expect(user?.firstLaunchAt).toBeGreaterThanOrEqual(before)
    expect(user?.firstLaunchAt).toBeLessThanOrEqual(Date.now())
  })

  it('keeps an existing program and its intake, and reports that it did', async () => {
    const t = newTest()
    const { sportId, userId } = await setup(t)
    const athlete = t.withIdentity({ subject: clerkId })
    const first = await athlete.mutation(api.userPrograms.completeIntake, {
      ...intake(sportId),
      firstLaunchAt: 1_000,
    })
    const before = await rows(t, userId)

    const second = await athlete.mutation(api.userPrograms.completeIntake, {
      ...intake(sportId),
      yearsOfExperience: 5,
      weeksUntilSeason: 24,
      ageGroup: '36+',
      firstLaunchAt: 2_000,
    })

    expect(second.keptExistingProgram).toBe(true)
    expect(second.programId).toBe(first.programId)
    const after = await rows(t, userId)
    expect(after.programs).toEqual(before.programs)
    expect(after.intakes).toEqual(before.intakes)
    expect(after.user?.firstLaunchAt).toBe(1_000)
  })

  it('still lets a reassessment update the program', async () => {
    const t = newTest()
    const { sportId, userId } = await setup(t)
    const athlete = t.withIdentity({ subject: clerkId })
    await athlete.mutation(api.userPrograms.completeIntake, intake(sportId))

    const result = await athlete.mutation(api.userPrograms.completeIntake, {
      ...intake(sportId),
      yearsOfExperience: 3,
      intakeType: 'reassessment',
    })

    expect(result.keptExistingProgram).toBe(false)
    const { programs, intakes } = await rows(t, userId)
    expect(programs).toHaveLength(1)
    expect(programs[0].skillLevel).toBe('Advanced')
    expect(intakes).toHaveLength(2)
  })

  it('saves the program the reveal shows, for every season length and years choice', async () => {
    const now = new Date()
    const cases: { seasonStart: string | null; years: CompleteFirstRunAnswers['years'] }[] = [
      { seasonStart: null, years: 'new' },
    ]
    for (let weeks = 1; weeks <= 52; weeks++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weeks * 7)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      cases.push({ seasonStart: iso, years: (['new', '1-2', '3+'] as const)[weeks % 3] })
    }

    const mismatches: string[] = []
    for (const c of cases) {
      const t = newTest()
      const { sportId, userId } = await setup(t)
      const answers: CompleteFirstRunAnswers = {
        sportId,
        seasonStart: c.seasonStart,
        trainingDays: [1, 3, 5],
        ageGroup: '18-35',
        years: c.years,
      }
      const shown = revealProgram(answers, now)
      const args = intakeArgs(answers, now)
      await t
        .withIdentity({ subject: clerkId })
        .mutation(api.userPrograms.completeIntake, { ...args, sportId })
      const [saved] = (await rows(t, userId)).programs
      if (
        saved.totalProgramWeeks !== shown.totalProgramWeeks ||
        saved.weeksPerPhase !== shown.weeksPerPhase ||
        saved.skillLevel !== shown.skillLevel
      ) {
        mismatches.push(`${c.seasonStart ?? 'no season'} ${c.years}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})
