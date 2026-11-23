import { convexTest } from 'convex-test'
import schema from '../schema'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

async function createTestUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      email: 'delete-me@example.com',
      name: 'Delete Me',
      clerkId: 'clerk_delete_me',
      createdAt: Date.now(),
    })
  })
}

describe('telemetry.deletePostHogPerson', () => {
  const originalKey = process.env.POSTHOG_PERSONAL_API_KEY
  const originalProject = process.env.POSTHOG_PROJECT_ID
  const originalHost = process.env.POSTHOG_HOST
  const originalFetch = global.fetch

  afterEach(() => {
    if (originalKey === undefined) delete process.env.POSTHOG_PERSONAL_API_KEY
    else process.env.POSTHOG_PERSONAL_API_KEY = originalKey
    if (originalProject === undefined) delete process.env.POSTHOG_PROJECT_ID
    else process.env.POSTHOG_PROJECT_ID = originalProject
    if (originalHost === undefined) delete process.env.POSTHOG_HOST
    else process.env.POSTHOG_HOST = originalHost
    global.fetch = originalFetch
  })

  it('cleanly no-ops when POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID is unset', async () => {
    delete process.env.POSTHOG_PERSONAL_API_KEY
    delete process.env.POSTHOG_PROJECT_ID

    const mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch

    const t = convexTest(schema, modules)
    const userId = await createTestUser(t)
    const result = await t.action(internal.telemetry.deletePostHogPerson, {
      distinctId: userId,
    })

    expect(result).toEqual({ deleted: false, reason: 'unconfigured' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects empty or non-users IDs with zero HTTP requests (S6)', async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_personal_key'
    process.env.POSTHOG_PROJECT_ID = '12345'

    const mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch

    const t = convexTest(schema, modules)
    await expect(
      t.action(internal.telemetry.deletePostHogPerson, {
        distinctId: '' as Id<'users'>,
      })
    ).rejects.toThrow()

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('looks up person by distinct_id, verifies distinct_ids ownership, and issues DELETE with delete_events=true', async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_personal_key'
    process.env.POSTHOG_PROJECT_ID = '12345'
    process.env.POSTHOG_HOST = 'https://us.posthog.com/'

    const t = convexTest(schema, modules)
    const userId = await createTestUser(t)

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            { id: 9876, distinct_ids: [String(userId)] },
            { id: 9999, distinct_ids: ['unrelated_person'] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
      })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await t.action(internal.telemetry.deletePostHogPerson, {
      distinctId: userId,
    })

    expect(result).toEqual({ deleted: true, deletedCount: 1 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe(
      `https://us.posthog.com/api/projects/12345/persons/?distinct_id=${encodeURIComponent(String(userId))}`
    )
    expect(mockFetch.mock.calls[1][0]).toBe(
      'https://us.posthog.com/api/projects/12345/persons/9876/?delete_events=true'
    )
    expect(mockFetch.mock.calls[1][1]).toMatchObject({ method: 'DELETE' })
  })

  it('treats missing person as idempotent alreadyGone without throwing', async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = 'phx_personal_key'
    process.env.POSTHOG_PROJECT_ID = '12345'

    const t = convexTest(schema, modules)
    const userId = await createTestUser(t)

    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await t.action(internal.telemetry.deletePostHogPerson, {
      distinctId: userId,
    })

    expect(result).toEqual({ deleted: false, alreadyGone: true })
  })
})
