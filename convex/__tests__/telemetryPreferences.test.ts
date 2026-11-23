import { convexTest } from 'convex-test'
import schema from '../schema'
import { api } from '../_generated/api'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

async function seedAthlete(ageGroup?: '14-17' | '18-35' | '36+') {
  const t = convexTest(schema, modules)
  const now = Date.now()

  const userId = await t.run(async (ctx) => {
    const id = await ctx.db.insert('users', {
      email: 'athlete@example.com',
      name: 'Test Athlete',
      clerkId: 'clerk_athlete',
      createdAt: now,
      intakeCompletedAt: ageGroup ? now : undefined,
    })

    if (ageGroup) {
      const sportId = await ctx.db.insert('sports', { name: 'Soccer', gppCategoryId: 1 })
      const intakeId = await ctx.db.insert('intake_responses', {
        userId: id,
        sportId,
        yearsOfExperience: 2,
        preferredTrainingDaysPerWeek: 3,
        ageGroup,
        assignedGppCategoryId: 1,
        assignedSkillLevel: 'Moderate',
        intakeType: 'initial',
        completedAt: now,
      })
      await ctx.db.insert('user_programs', {
        userId: id,
        intakeResponseId: intakeId,
        gppCategoryId: 1,
        skillLevel: 'Moderate',
        ageGroup,
        currentPhase: 'GPP',
        currentWeek: 1,
        currentDay: 1,
        phaseStartDate: now,
        createdAt: now,
        updatedAt: now,
      })
    }

    return id
  })

  return {
    t,
    userId,
    asAthlete: t.withIdentity({ subject: 'clerk_athlete', email: 'athlete@example.com' }),
  }
}

describe('users.updateTelemetryPreferences', () => {
  it('rejects unauthenticated callers', async () => {
    const { t } = await seedAthlete('18-35')
    await expect(
      t.mutation(api.users.updateTelemetryPreferences, { analyticsOptOut: true })
    ).rejects.toThrow('Not authenticated')
  })

  it('allows an adult (18+) athlete to opt into session replays and clears replay opt-in when opting out of analytics', async () => {
    const { asAthlete } = await seedAthlete('18-35')

    const optedIn = await asAthlete.mutation(api.users.updateTelemetryPreferences, {
      sessionReplayOptIn: true,
    })
    expect(optedIn?.sessionReplayOptIn).toBe(true)

    const optedOut = await asAthlete.mutation(api.users.updateTelemetryPreferences, {
      analyticsOptOut: true,
    })
    expect(optedOut?.analyticsOptOut).toBe(true)
    expect(optedOut?.sessionReplayOptIn).toBe(false)
  })

  it('rejects sessionReplayOptIn: true for 14-17 youth athletes server-side', async () => {
    const { asAthlete } = await seedAthlete('14-17')

    await expect(
      asAthlete.mutation(api.users.updateTelemetryPreferences, {
        sessionReplayOptIn: true,
      })
    ).rejects.toThrow('adult athletes (18+)')

    // Youth athletes CAN still opt out of analytics
    const updated = await asAthlete.mutation(api.users.updateTelemetryPreferences, {
      analyticsOptOut: true,
    })
    expect(updated?.analyticsOptOut).toBe(true)
  })

  it('rejects sessionReplayOptIn: true when ageGroup is unknown / Intake incomplete', async () => {
    const { asAthlete } = await seedAthlete(undefined)

    await expect(
      asAthlete.mutation(api.users.updateTelemetryPreferences, {
        sessionReplayOptIn: true,
      })
    ).rejects.toThrow('adult athletes (18+)')
  })
})
