import { convexTest } from 'convex-test'
import schema from '../schema'
import { api } from '../_generated/api'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()
const newTest = () => convexTest(schema, modules)
type TestConvex = ReturnType<typeof newTest>

const clerkId = 'user_terms'
const athlete = (t: TestConvex) => t.withIdentity({ subject: clerkId, email: 'a@b.co' })

async function userRow(t: TestConvex) {
  return t.run((ctx) =>
    ctx.db
      .query('users')
      .withIndex('by_clerk', (q) => q.eq('clerkId', clerkId))
      .first()
  )
}

const base = { clerkId, email: 'a@b.co', name: 'Sam', role: 'client' as const }

describe('createUser terms acceptance', () => {
  it('stores the acceptance time and version for an adult, with no guardian stamp', async () => {
    const t = newTest()
    const before = Date.now()
    await athlete(t).mutation(api.users.createUser, {
      ...base,
      termsAcceptance: { termsVersion: '2026-11-22', ageGroup: '18-35' },
    })
    const user = await userRow(t)
    expect(user?.termsVersion).toBe('2026-11-22')
    expect(user?.termsAcceptedAt).toBeGreaterThanOrEqual(before)
    expect(user?.guardianConsentAcknowledgedAt).toBeUndefined()
  })

  it('also stamps the guardian acknowledgment for 14-17', async () => {
    const t = newTest()
    await athlete(t).mutation(api.users.createUser, {
      ...base,
      termsAcceptance: { termsVersion: '2026-11-22', ageGroup: '14-17' },
    })
    const user = await userRow(t)
    expect(user?.termsAcceptedAt).toBeDefined()
    expect(user?.guardianConsentAcknowledgedAt).toBe(user?.termsAcceptedAt)
  })

  it('accepts an older build that sends no acceptance, and stores none', async () => {
    const t = newTest()
    await athlete(t).mutation(api.users.createUser, base)
    const user = await userRow(t)
    expect(user?.termsAcceptedAt).toBeUndefined()
    expect(user?.termsVersion).toBeUndefined()
  })

  it('keeps no date of birth on the users row', async () => {
    const t = newTest()
    await athlete(t).mutation(api.users.createUser, {
      ...base,
      termsAcceptance: { termsVersion: '2026-11-22', ageGroup: '14-17' },
    })
    const user = await userRow(t)
    expect(Object.keys(user ?? {}).filter((k) => /birth|dob/i.test(k))).toEqual([])
  })
})

describe('recordTermsAcceptance', () => {
  it('records the acceptance for an athlete whose account already exists', async () => {
    const t = newTest()
    await athlete(t).mutation(api.users.createUser, base)
    await athlete(t).mutation(api.users.recordTermsAcceptance, {
      termsAcceptance: { termsVersion: '2026-11-22', ageGroup: '14-17' },
    })
    const user = await userRow(t)
    expect(user?.termsVersion).toBe('2026-11-22')
    expect(user?.guardianConsentAcknowledgedAt).toBeDefined()
  })

  it('needs a signed-in athlete', async () => {
    const t = newTest()
    await expect(
      t.mutation(api.users.recordTermsAcceptance, {
        termsAcceptance: { termsVersion: '2026-11-22', ageGroup: '18-35' },
      })
    ).rejects.toThrow('Not authenticated')
  })
})
