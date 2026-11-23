import { convexTest } from 'convex-test'
import schema from '../schema'
import { api, internal } from '../_generated/api'
import { fixture, modules } from '../../jest/chatHandsFixture'

describe('chat hands', () => {
  it('does not offer an easier or harder write', async () => {
    const { t } = await fixture()
    const listed = await t.query(internal.chatHands.listTools, {})
    expect(listed.omittedWrites).toEqual(['easier_or_harder'])
    expect(listed.tools).not.toContain('easier_or_harder')
  })

  it("reads today as the app's Today screen, warm-up apart from the main exercises", async () => {
    const { t, asAthlete, dayOne, stretch, squat, hinge } = await fixture()
    const screen = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {})
    const tool = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })

    expect(screen?._id).toBe(dayOne)
    expect(tool.templateId).toBe(screen?._id)
    expect(tool.warmup).toEqual([{ exerciseId: stretch, name: "World's Greatest Stretch" }])
    expect(tool.main).toEqual([
      { index: 1, exerciseId: squat, name: 'Goblet Squat' },
      { index: 2, exerciseId: hinge, name: 'Hip Hinge' },
    ])
    // Every exercise on the screen is in exactly one group, in the screen's order.
    expect([...tool.warmup, ...tool.main].map((row) => row.exerciseId)).toEqual(
      screen?.exercises.map((row: { exerciseId: typeof squat }) => row.exerciseId)
    )
  })

  it('shows an order the athlete set in the app', async () => {
    const { t, asAthlete, sessionId, squat, hinge } = await fixture()
    // The workout screen saves main exercises' template indices only.
    await asAthlete.mutation(api.gppWorkoutSessions.updateProgress, {
      sessionId,
      exercises: (await t.run((ctx) => ctx.db.get(sessionId)))!.exercises,
      exerciseOrder: [2, 1],
    })
    const tool = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })
    expect(tool.main.map((row) => row.exerciseId)).toEqual([hinge, squat])
    expect(tool.warmup).toHaveLength(1)
  })

  it('writes a reorder only after acceptance, in the shape the app saves, and refuses a stale one', async () => {
    const { t, asAthlete, sessionId, squat, hinge } = await fixture()
    const read = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })
    const preview = await t.query(internal.chatHands.previewReorder, {
      clerkId: 'clerk_athlete',
      sessionId,
      exerciseOrder: [2, 1],
    })
    expect(preview.valid).toBe(true)
    expect(preview.version).toBe(read.version)
    expect(preview.main.map((row) => row.exerciseId)).toEqual([hinge, squat])
    expect(preview.warmup).toEqual(read.warmup)

    const todayId = (await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {}))!._id
    const before = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: todayId,
    })
    expect(before?.exerciseOrder).toBeUndefined()

    const declined = await t.mutation(internal.chatHands.commitReorder, {
      clerkId: 'clerk_athlete',
      sessionId,
      exerciseOrder: [2, 1],
      version: preview.version!,
      accepted: false,
    })
    expect(declined).toEqual({ written: false, reason: 'not_accepted' })

    const accepted = await t.mutation(internal.chatHands.commitReorder, {
      clerkId: 'clerk_athlete',
      sessionId,
      exerciseOrder: [2, 1],
      version: preview.version!,
      accepted: true,
    })
    expect(accepted).toEqual({ written: true, reason: 'ok' })

    const screen = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: todayId,
    })
    expect(screen?.exerciseOrder).toEqual([2, 1])

    const stale = await t.mutation(internal.chatHands.commitReorder, {
      clerkId: 'clerk_athlete',
      sessionId,
      exerciseOrder: [1, 2],
      version: preview.version!,
      accepted: true,
    })
    expect(stale).toEqual({ written: false, reason: 'stale' })
    const after = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: todayId,
    })
    expect(after?.exerciseOrder).toEqual([2, 1])
  })

  it('refuses an order that moves the warm-up, drops or repeats an exercise', async () => {
    const { t, sessionId } = await fixture()
    for (const exerciseOrder of [[0, 1, 2], [2], [2, 2], [2, 9], [1, 0]]) {
      const preview = await t.query(internal.chatHands.previewReorder, {
        clerkId: 'clerk_athlete',
        sessionId,
        exerciseOrder,
      })
      expect({ exerciseOrder, valid: preview.valid, expected: preview.expectedIndexes }).toEqual({
        exerciseOrder,
        valid: false,
        expected: [1, 2],
      })
      const write = await t.mutation(internal.chatHands.commitReorder, {
        clerkId: 'clerk_athlete',
        sessionId,
        exerciseOrder,
        version: preview.version ?? '',
        accepted: true,
      })
      expect({ exerciseOrder, write }).toEqual({
        exerciseOrder,
        write: { written: false, reason: 'bad_order' },
      })
    }
  })

  it('swaps two days only after acceptance, and refuses a stale swap', async () => {
    const { t, asAthlete } = await fixture()
    const slotA = { phase: 'GPP' as const, week: 1, day: 1 }
    const slotB = { phase: 'GPP' as const, week: 1, day: 2 }
    const preview = await t.query(internal.chatHands.previewSwap, {
      clerkId: 'clerk_athlete',
      slotA,
      slotB,
    })
    expect(preview).toMatchObject({
      valid: true,
      reason: 'ok',
      slotA: { ...slotA, before: 'Lower Body', after: 'Upper Body' },
      slotB: { ...slotB, before: 'Upper Body', after: 'Lower Body' },
      // The fixture's Lower Body workout is already started.
      inProgressWorkout: 'Lower Body',
    })

    const declined = await t.mutation(internal.chatHands.commitSwap, {
      clerkId: 'clerk_athlete',
      slotA,
      slotB,
      version: preview.version!,
      accepted: false,
    })
    expect(declined.written).toBe(false)

    const dayBefore = await t.query(internal.chatHands.readDay, {
      clerkId: 'clerk_athlete',
      slot: slotA,
    })
    expect(dayBefore.name).toBe('Lower Body')

    const accepted = await t.mutation(internal.chatHands.commitSwap, {
      clerkId: 'clerk_athlete',
      slotA,
      slotB,
      version: preview.version!,
      accepted: true,
    })
    expect(accepted).toEqual({ written: true, reason: 'ok' })

    const dayAfter = await t.query(internal.chatHands.readDay, {
      clerkId: 'clerk_athlete',
      slot: slotA,
    })
    expect(dayAfter.name).toBe('Upper Body')
    // The started workout stays today's workout; only the calendar moved.
    const today = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })
    expect({ name: today.name, source: today.source }).toEqual({
      name: 'Lower Body',
      source: 'in_progress',
    })

    const stale = await t.mutation(internal.chatHands.commitSwap, {
      clerkId: 'clerk_athlete',
      slotA,
      slotB,
      version: preview.version!,
      accepted: true,
    })
    expect(stale).toEqual({ written: false, reason: 'stale' })
    const still = await t.query(internal.chatHands.readDay, {
      clerkId: 'clerk_athlete',
      slot: slotA,
    })
    expect(still.name).toBe('Upper Body')
  })

  it('says why a swap is not possible, and refuses the write the same way', async () => {
    const { t } = await fixture()
    const cases = [
      [
        { phase: 'GPP' as const, week: 1, day: 1 },
        { phase: 'GPP' as const, week: 1, day: 1 },
        'same_slot',
      ],
      [
        { phase: 'GPP' as const, week: 1, day: 1 },
        { phase: 'SPP' as const, week: 1, day: 1 },
        'different_phases',
      ],
      [
        { phase: 'SPP' as const, week: 1, day: 1 },
        { phase: 'SPP' as const, week: 1, day: 2 },
        'locked',
      ],
      [
        { phase: 'GPP' as const, week: 1, day: 1 },
        { phase: 'GPP' as const, week: 1, day: 3 },
        'empty_slot',
      ],
    ] as const
    for (const [slotA, slotB, reason] of cases) {
      const preview = await t.query(internal.chatHands.previewSwap, {
        clerkId: 'clerk_athlete',
        slotA,
        slotB,
      })
      expect({
        reason,
        got: [preview.valid, preview.reason, preview.version, preview.slotA.after],
      }).toEqual({
        reason,
        got: [false, reason, null, null],
      })
    }
    for (const [slotA, slotB, reason] of cases.slice(0, 3)) {
      const write = await t.mutation(internal.chatHands.commitSwap, {
        clerkId: 'clerk_athlete',
        slotA,
        slotB,
        version: 'x',
        accepted: true,
      })
      expect({ reason, write }).toEqual({ reason, write: { written: false, reason } })
    }
  })

  it('refuses to preview a swap of a workout already done in this block', async () => {
    const { t, dayTwo } = await fixture()
    await t.run(async (ctx) => {
      const user = (await ctx.db.query('users').first())!
      const program = (await ctx.db.query('user_programs').first())!
      await ctx.db.insert('gpp_workout_sessions', {
        userId: user._id,
        templateId: dayTwo,
        userProgramId: program._id,
        startedAt: Date.now(),
        completedAt: Date.now(),
        status: 'completed',
        exercises: [],
      })
    })
    const preview = await t.query(internal.chatHands.previewSwap, {
      clerkId: 'clerk_athlete',
      slotA: { phase: 'GPP', week: 1, day: 1 },
      slotB: { phase: 'GPP', week: 1, day: 2 },
    })
    expect({ valid: preview.valid, reason: preview.reason }).toEqual({
      valid: false,
      reason: 'completed',
    })
  })

  it("finds the athlete's started workout however many others share the template", async () => {
    const { t, dayOne, sessionId } = await fixture()
    await t.run(async (ctx) => {
      const program = (await ctx.db.query('user_programs').first())!
      for (let i = 0; i < 12; i++) {
        const other = await ctx.db.insert('users', {
          email: `other${i}@example.com`,
          name: 'Other',
          clerkId: `clerk_other_${i}`,
          createdAt: 1,
        })
        await ctx.db.insert('gpp_workout_sessions', {
          userId: other,
          templateId: dayOne,
          userProgramId: program._id,
          startedAt: Date.now() + i + 1,
          status: 'in_progress',
          exercises: [],
        })
      }
    })
    const today = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })
    expect({ source: today.source, sessionId: today.sessionId }).toEqual({
      source: 'in_progress',
      sessionId,
    })
  })

  it('refuses a week past the end of the phase instead of mapping it onto a real one', async () => {
    const { t } = await fixture()
    const slotA = { phase: 'GPP' as const, week: 1, day: 1 }
    const far = { phase: 'GPP' as const, week: 99, day: 2 }
    const preview = await t.query(internal.chatHands.previewSwap, {
      clerkId: 'clerk_athlete',
      slotA,
      slotB: far,
    })
    expect({ valid: preview.valid, reason: preview.reason }).toEqual({
      valid: false,
      reason: 'out_of_range',
    })
    const write = await t.mutation(internal.chatHands.commitSwap, {
      clerkId: 'clerk_athlete',
      slotA,
      slotB: far,
      version: 'x',
      accepted: true,
    })
    expect(write).toEqual({ written: false, reason: 'out_of_range' })
    const day = await t.query(internal.chatHands.readDay, { clerkId: 'clerk_athlete', slot: far })
    expect(day.templateId).toBeNull()
  })

  it('leaves a started workout alone once its phase is locked again', async () => {
    const { t, dayOne, sessionId } = await fixture()
    // The started workout belongs to SPP, which this athlete has not unlocked.
    await t.run((ctx) => ctx.db.patch(dayOne, { phase: 'SPP' }))
    const today = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })
    expect({ source: today.source, sessionId: today.sessionId }).toEqual({
      source: 'none',
      sessionId: null,
    })
    const preview = await t.query(internal.chatHands.previewReorder, {
      clerkId: 'clerk_athlete',
      sessionId,
      exerciseOrder: [2, 1],
    })
    expect(preview.valid).toBe(false)
    const write = await t.mutation(internal.chatHands.commitReorder, {
      clerkId: 'clerk_athlete',
      sessionId,
      exerciseOrder: [2, 1],
      version: 'x',
      accepted: true,
    })
    expect(write).toEqual({ written: false, reason: 'locked' })
  })

  it('reads a scheduled workout as scheduled, with no session to reorder', async () => {
    const { t, sessionId } = await fixture()
    await t.run((ctx) => ctx.db.patch(sessionId, { status: 'abandoned' }))
    const today = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_athlete' })
    expect({ source: today.source, sessionId: today.sessionId, version: today.version }).toEqual({
      source: 'scheduled',
      sessionId: null,
      version: null,
    })
  })

  it('does not read a locked phase', async () => {
    const { t, asAthlete } = await fixture()
    const day = await t.query(internal.chatHands.readDay, {
      clerkId: 'clerk_athlete',
      slot: { phase: 'SPP', week: 1, day: 1 },
    })
    expect(day.locked).toBe(true)
    expect(day.main).toEqual([])
    expect(day.warmup).toEqual([])
  })

  it('says there is no program before intake', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      await ctx.db.insert('users', {
        email: 'new@example.com',
        name: 'New',
        clerkId: 'clerk_new',
        createdAt: Date.now(),
      })
    })
    expect(await t.query(internal.chatHands.readProgram, { clerkId: 'clerk_new' })).toBeNull()
    const today = await t.query(internal.chatHands.readToday, { clerkId: 'clerk_new' })
    expect(today.templateId).toBeNull()
  })
})
