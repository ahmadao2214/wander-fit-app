import { convexTest } from 'convex-test'
import schema from '../schema'
import { api } from '../_generated/api'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

describe('program_templates DB I/O optimized queries', () => {
  it('seedStatus reports false until all 4 categories have at least one template', async () => {
    const t = convexTest(schema, modules)

    expect(await t.query(api.programTemplates.seedStatus, {})).toEqual({
      hasTemplates: false,
    })

    const exerciseId = await t.run(async (ctx) =>
      ctx.db.insert('exercises', {
        name: 'Goblet Squat',
        slug: 'goblet_squat',
        tags: ['lower_body'],
      })
    )

    const insertTemplate = (gppCategoryId: number) =>
      t.run(async (ctx) =>
        ctx.db.insert('program_templates', {
          gppCategoryId,
          phase: 'GPP',
          skillLevel: 'Novice',
          week: 1,
          day: 1,
          name: `Cat ${gppCategoryId} W1 D1`,
          estimatedDurationMinutes: 45,
          exercises: [
            {
              exerciseId,
              sets: 3,
              reps: '10',
              restSeconds: 60,
              orderIndex: 0,
              section: 'main',
            },
          ],
        })
      )

    await insertTemplate(1)
    await insertTemplate(2)
    await insertTemplate(3)

    // Partial seed (missing category 4) still reports false
    expect(await t.query(api.programTemplates.seedStatus, {})).toEqual({
      hasTemplates: false,
    })

    await insertTemplate(4)

    expect(await t.query(api.programTemplates.seedStatus, {})).toEqual({
      hasTemplates: true,
    })
  })

  it('getPhaseOverview uses by_assignment and returns only the requested skill level and phase', async () => {
    const t = convexTest(schema, modules)

    await t.run(async (ctx) => {
      const exerciseId = await ctx.db.insert('exercises', {
        name: 'Back Squat',
        slug: 'back_squat',
        tags: ['lower_body'],
      })
      const base = {
        gppCategoryId: 2,
        estimatedDurationMinutes: 45,
        exercises: [
          {
            exerciseId,
            sets: 3,
            reps: '8',
            restSeconds: 90,
            orderIndex: 0,
            section: 'main' as const,
          },
        ],
      }

      await ctx.db.insert('program_templates', {
        ...base,
        phase: 'GPP',
        skillLevel: 'Novice',
        week: 2,
        day: 1,
        name: 'Novice GPP W2D1',
      })
      await ctx.db.insert('program_templates', {
        ...base,
        phase: 'GPP',
        skillLevel: 'Novice',
        week: 1,
        day: 2,
        name: 'Novice GPP W1D2',
      })
      await ctx.db.insert('program_templates', {
        ...base,
        phase: 'GPP',
        skillLevel: 'Novice',
        week: 1,
        day: 1,
        name: 'Novice GPP W1D1',
      })
      // Different skill level & different phase that must be excluded by index
      await ctx.db.insert('program_templates', {
        ...base,
        phase: 'GPP',
        skillLevel: 'Advanced',
        week: 1,
        day: 1,
        name: 'Advanced GPP W1D1',
      })
      await ctx.db.insert('program_templates', {
        ...base,
        phase: 'SPP',
        skillLevel: 'Novice',
        week: 1,
        day: 1,
        name: 'Novice SPP W1D1',
      })
    })

    const overview = await t.query(api.programTemplates.getPhaseOverview, {
      gppCategoryId: 2,
      phase: 'GPP',
      skillLevel: 'Novice',
    })

    expect(overview.map((w) => w.week)).toEqual([1, 2])
    expect(overview[0].workouts.map((w) => w.name)).toEqual(['Novice GPP W1D1', 'Novice GPP W1D2'])
    expect(overview[1].workouts.map((w) => w.name)).toEqual(['Novice GPP W2D1'])
  })

  it('getFullProgramCalendar and getPhaseWorkoutsWithOverrides isolate templates by category and skill level via indexes', async () => {
    const t = convexTest(schema, modules)

    await t.run(async (ctx) => {
      const now = Date.now()
      const userId = await ctx.db.insert('users', {
        email: 'athlete@example.com',
        name: 'Test Athlete',
        clerkId: 'clerk_athlete_io',
        createdAt: now,
        intakeCompletedAt: now,
      })
      const sportId = await ctx.db.insert('sports', {
        name: 'Basketball',
        gppCategoryId: 2,
      })
      const intakeId = await ctx.db.insert('intake_responses', {
        userId,
        sportId,
        yearsOfExperience: 2,
        preferredTrainingDaysPerWeek: 3,
        selectedTrainingDays: [1, 3, 5],
        weeksUntilSeason: 12,
        assignedGppCategoryId: 2,
        assignedSkillLevel: 'Moderate',
        intakeType: 'initial',
        ageGroup: '18-35',
        completedAt: now,
      })
      await ctx.db.insert('user_programs', {
        userId,
        intakeResponseId: intakeId,
        gppCategoryId: 2,
        skillLevel: 'Moderate',
        ageGroup: '18-35',
        currentPhase: 'GPP',
        currentWeek: 1,
        currentDay: 1,
        phaseStartDate: now,
        createdAt: now,
        updatedAt: now,
      })

      const exerciseId = await ctx.db.insert('exercises', {
        name: 'Trap Bar Deadlift',
        slug: 'trap_bar_deadlift',
        tags: ['lower_body'],
      })
      const makeExercises = () => [
        {
          exerciseId,
          sets: 3,
          reps: '6',
          restSeconds: 120,
          orderIndex: 0,
          section: 'main' as const,
        },
      ]

      // Matching templates for Moderate across GPP, SPP & SSP
      for (const phase of ['GPP', 'SPP', 'SSP'] as const) {
        for (const week of [1, 2, 3, 4]) {
          for (const day of [1, 2, 3]) {
            await ctx.db.insert('program_templates', {
              gppCategoryId: 2,
              phase,
              skillLevel: 'Moderate',
              week,
              day,
              name: `Moderate ${phase} W${week}D${day}`,
              estimatedDurationMinutes: 45,
              exercises: makeExercises(),
            })
          }
        }
      }

      // Non-matching skill level in same category (must never leak in)
      await ctx.db.insert('program_templates', {
        gppCategoryId: 2,
        phase: 'GPP',
        skillLevel: 'Novice',
        week: 1,
        day: 1,
        name: 'Novice LEAK',
        estimatedDurationMinutes: 45,
        exercises: makeExercises(),
      })
    })

    const asAthlete = t.withIdentity({
      subject: 'clerk_athlete_io',
      email: 'athlete@example.com',
    })

    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, {})
    expect(calendar).not.toBeNull()
    const gppWeek1Names = Object.values(calendar!.calendarData)
      .flatMap((day) => day.workouts)
      .filter((w) => w.phase === 'GPP' && w.week === 1)
      .map((w) => w.name)
    expect(gppWeek1Names).toEqual(['Moderate GPP W1D1', 'Moderate GPP W1D2', 'Moderate GPP W1D3'])

    const phaseWorkouts = await asAthlete.query(
      api.scheduleOverrides.getPhaseOverviewWithOverrides,
      { phase: 'GPP' }
    )
    expect(phaseWorkouts).not.toBeNull()
    expect(phaseWorkouts![0].workouts.map((w) => w.name)).toEqual([
      'Moderate GPP W1D1',
      'Moderate GPP W1D2',
      'Moderate GPP W1D3',
    ])
  })
})
